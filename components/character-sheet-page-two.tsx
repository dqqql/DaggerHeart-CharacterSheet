"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import {
  rhodesIslandUpgradeOptionsData,
  upgradeOptionsData,
  type UpgradeOption,
} from "@/data/list/upgrade"
import { useSheetStore, useSafeSheetData } from "@/lib/sheet-store"
import { createEmptyCard, isEmptyCard, type StandardCard } from "@/card/card-types"
import { showFadeNotification } from "@/components/ui/fade-notification"
import { safeEvaluateExpression } from "@/lib/number-utils"
import {
  DOMAIN_CARD_AUTOMATION_IDS,
  convertDisplayedHpMaxToStoredBase,
  convertDisplayedStressMaxToStoredBase,
  getDisplayedHpMax,
  getDisplayedStressMax,
} from "@/lib/domain-card-derived-stats"
import {
  MasterOfTheCraftDialog,
  VitalityChoiceDialog,
} from "@/components/domain-card-effects/domain-card-automation-dialogs"

import { CharacterDescriptionSection } from "@/components/character-sheet-page-two-sections/character-description-section"
import { CardDeckSection } from "@/components/character-sheet-page-two-sections/card-deck-section"
import { UpgradeSection } from "@/components/character-sheet-page-two-sections/upgrade-section"
import { PageHeader } from "@/components/page-header"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"
import type { AttributeValue, DomainCardAutomationState } from "@/lib/sheet-data"
import { RhodesMulticlassModal } from "@/components/modals/rhodes-multiclass-modal"
import { rhodesIslandCards } from "@/data/rhodes-island"
import { getRuleSetModule } from "@/lib/rulesets/registry"

function createEmptyInventoryCards() {
  return Array(20)
    .fill(0)
    .map(() => createEmptyCard())
}

function ensureAutomationState(state?: DomainCardAutomationState): DomainCardAutomationState {
  return {
    appliedPermanentCardIds: state?.appliedPermanentCardIds || [],
    vitalityChoices: state?.vitalityChoices,
    masterOfTheCraft: state?.masterOfTheCraft,
  }
}

function hasAppliedPermanentEffect(state: DomainCardAutomationState | undefined, cardId: string): boolean {
  return ensureAutomationState(state).appliedPermanentCardIds.includes(cardId)
}

function markPermanentEffectApplied(state: DomainCardAutomationState | undefined, cardId: string): DomainCardAutomationState {
  const nextState = ensureAutomationState(state)
  if (nextState.appliedPermanentCardIds.includes(cardId)) {
    return nextState
  }

  return {
    ...nextState,
    appliedPermanentCardIds: [...nextState.appliedPermanentCardIds, cardId],
  }
}

function findFocusedCardIndex(cards: StandardCard[] | undefined, cardId: string): number {
  return (cards || []).findIndex((card) => card?.type === "domain" && card.id === cardId)
}

function findFirstEmptyInventorySlot(cards: StandardCard[] | undefined): number {
  return (cards || []).findIndex((card) => isEmptyCard(card))
}

export default function CharacterSheetPageTwo() {
  const { setSheetData: setFormData } = useSheetStore()
  const safeFormData = useSafeSheetData()
  const updateHPMax = useSheetStore((state) => state.updateHPMax)
  const updateStressMax = useSheetStore((state) => state.updateStressMax)
  const createExperienceValuesSnapshot = useSheetStore((state) => state.createExperienceValuesSnapshot)
  const displayedHpMax = getDisplayedHpMax(safeFormData)
  const displayedStressMax = getDisplayedStressMax(safeFormData)
  const minDisplayedHpMax = getDisplayedHpMax({ ...safeFormData, hpMax: 0 })
  const minDisplayedStressMax = getDisplayedStressMax({ ...safeFormData, stressMax: 0 })
  const ruleSet = getRuleSetModule(safeFormData.ruleSetId)

  const [upgradeDomainModalOpen, setUpgradeDomainModalOpen] = useState(false)
  const [upgradeDomainCardIndex, setUpgradeDomainCardIndex] = useState<number>(-1)

  const [upgradeSubclassModalOpen, setUpgradeSubclassModalOpen] = useState(false)
  const [upgradeSubclassCardIndex, setUpgradeSubclassCardIndex] = useState<number>(-1)

  const [vitalityDialogOpen, setVitalityDialogOpen] = useState(false)
  const [masterDialogOpen, setMasterDialogOpen] = useState(false)
  const [pendingMasterCardIndex, setPendingMasterCardIndex] = useState<number>(-1)
  const [multiclassWizardOpen, setMulticlassWizardOpen] = useState(false)
  const [pendingMulticlassCheck, setPendingMulticlassCheck] = useState<{ key: string; index: number } | null>(null)

  const isUpdatingRef = useRef(false)
  const isResolvingAutomationRef = useRef(false)

  const handleCardChange = (index: number, card: StandardCard) => {
    if (isUpdatingRef.current) return

    isUpdatingRef.current = true

    setFormData((prev) => {
      const newCards = [...(prev.cards || [])]
      newCards[index] = card
      return { ...prev, cards: newCards }
    })

    setTimeout(() => {
      isUpdatingRef.current = false
    }, 0)
  }

  const handleInventoryCardChange = (index: number, card: StandardCard) => {
    if (isUpdatingRef.current) return

    isUpdatingRef.current = true

    setFormData((prev) => {
      const newInventoryCards = [...(prev.inventory_cards || createEmptyInventoryCards())]
      newInventoryCards[index] = card
      return { ...prev, inventory_cards: newInventoryCards }
    })

    setTimeout(() => {
      isUpdatingRef.current = false
    }, 0)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const toggleUpgradeCheckbox = (checkKey: string, index: number, checked: boolean) => {
    setFormData((prev) => {
      const checkedUpgrades = prev.checkedUpgrades ?? {
        tier1: {},
        tier2: {},
        tier3: {},
      }

      const newCheckedUpgrades: Record<string, Record<number, boolean>> = {
        ...checkedUpgrades,
        tier1: checkedUpgrades.tier1 ?? {},
        tier2: checkedUpgrades.tier2 ?? {},
        tier3: checkedUpgrades.tier3 ?? {},
      }

      if (!newCheckedUpgrades[checkKey]) {
        newCheckedUpgrades[checkKey] = {}
      }

      newCheckedUpgrades[checkKey] = {
        ...newCheckedUpgrades[checkKey],
        [index]: checked,
      }

      return {
        ...prev,
        checkedUpgrades: newCheckedUpgrades as any,
      }
    })
  }

  const handleUpgradeCheck = (checkKeyOrTier: string, index: number) => {
    const tierMatch = checkKeyOrTier.match(/^(tier\d+)/)
    const tier = tierMatch ? tierMatch[1] : checkKeyOrTier
    const currentlyChecked = safeFormData.checkedUpgrades?.[checkKeyOrTier as keyof typeof safeFormData.checkedUpgrades]?.[index] ?? false
    const newCheckedState = !currentlyChecked

    const tierNum = parseInt(tier.replace("tier", ""))
    const options = getUpgradeOptions(tierNum)
    const option = options.find((item, optionIndex) => (item.stateIndex ?? optionIndex) === index)

    if (option) {
      switch (option.action) {
      case "branch-upgrade":
        setFormData((prev) => ({
          ...prev,
          branchUpgradeCount: Math.max(0, Math.min(2, (prev.branchUpgradeCount ?? 0) + (newCheckedState ? 1 : -1))),
        }))
        toggleUpgradeCheckbox(checkKeyOrTier, index, newCheckedState)
        return

      case "multiclass": {
        if (!ruleSet.capabilities.ancestryExperience) break

        const branchOption = options.find((item) => item.action === "subclass-upgrade")
        const branchIndex = branchOption?.stateIndex
        const branchKey = `${tier}-${branchIndex}-0`
        if (newCheckedState && branchIndex !== undefined && isUpgradeChecked(branchKey, branchIndex)) {
          showFadeNotification({ message: "本位阶的“兼职”与“升级分支”互斥", type: "error", position: "middle" })
          return
        }
        if (newCheckedState && safeFormData.multiclassSelection) {
          showFadeNotification({ message: "每名角色只能取得一次兼职", type: "error", position: "middle" })
          return
        }
        if (currentlyChecked) {
          const selectedIds = new Set([
            safeFormData.multiclassSelection?.profession.id,
            safeFormData.multiclassSelection?.branch.id,
          ].filter(Boolean))
          setFormData(prev => ({
            ...prev,
            multiclassSelection: undefined,
            cards: prev.cards.map((card, cardIndex) => cardIndex >= 5 && selectedIds.has(card.id) ? createEmptyCard() : card),
          }))
          toggleUpgradeCheckbox(checkKeyOrTier, index, false)
          return
        }
        setPendingMulticlassCheck({ key: checkKeyOrTier, index })
        setMulticlassWizardOpen(true)
        return
      }

      case "select-module":
        if (currentlyChecked) {
          setFormData({ selectedModule: undefined })
        }
        toggleUpgradeCheckbox(checkKeyOrTier, index, newCheckedState)
        return

      case "attribute":
        if (!currentlyChecked) break
        const rollbackAttributeUpgrade = useSheetStore.getState().rollbackAttributeUpgrade
        const result = rollbackAttributeUpgrade(checkKeyOrTier)

        if (result.success) {
          showFadeNotification({
            message: "已撤回属性升级，属性值已恢复",
            type: "success",
            position: "middle",
          })
        } else if (result.reason === "no-record") {
          showFadeNotification({
            message: "升级记录已丢失，无法自动回滚，请手动调整属性值",
            type: "error",
            position: "middle",
          })
        } else if (result.reason === "conflict") {
          showFadeNotification({
            message: "属性已被其他操作修改，无法自动回滚，请手动调整",
            type: "error",
            position: "middle",
          })
        }

        toggleUpgradeCheckbox(checkKeyOrTier, index, false)
        return

      case "experience": {
        if (!currentlyChecked) break
        const restoreExperienceValuesSnapshot = useSheetStore.getState().restoreExperienceValuesSnapshot
        const result = restoreExperienceValuesSnapshot()

        if (result.reason === "conflict") {
          showFadeNotification({
            message: "检测到经历加值已被其他升级修改，无法回滚",
            type: "error",
            position: "middle",
          })
        } else if (result.reason === "no-snapshot") {
          showFadeNotification({
            message: "经历升级记录已丢失，请手动回滚",
            type: "error",
            position: "middle",
          })
        } else {
          showFadeNotification({
            message: "已撤回经历升级，经历加值已恢复",
            type: "success",
            position: "middle",
          })
        }

        toggleUpgradeCheckbox(checkKeyOrTier, index, false)
        return
      }

      case "evasion": {
        if (!currentlyChecked) break
        const restoreEvasionSnapshot = useSheetStore.getState().restoreEvasionSnapshot
        const result = restoreEvasionSnapshot()

        if (result.reason === "conflict") {
          showFadeNotification({
            message: "检测到闪避值已被其他升级修改，无法回滚",
            type: "error",
            position: "middle",
          })
        } else if (result.reason === "no-snapshot") {
          showFadeNotification({
            message: "闪避值升级记录已丢失，请手动回滚",
            type: "error",
            position: "middle",
          })
        } else {
          showFadeNotification({
            message: "已撤回闪避值升级，闪避值已恢复",
            type: "success",
            position: "middle",
          })
        }

        toggleUpgradeCheckbox(checkKeyOrTier, index, false)
        return
      }

      case "hp": {
        const currentHP = displayedHpMax
        if (newCheckedState) {
          const newValue = Math.min(currentHP + 1, 18)
          updateHPMax(convertDisplayedHpMaxToStoredBase(safeFormData, newValue))
          showFadeNotification({
            message: `生命槽上限 +1，当前为 ${newValue}`,
            type: "success",
            position: "middle",
          })
        } else {
          const newValue = Math.max(currentHP - 1, minDisplayedHpMax)
          updateHPMax(convertDisplayedHpMaxToStoredBase(safeFormData, newValue))
          showFadeNotification({
            message: `生命槽上限 -1，当前为 ${newValue}`,
            type: "success",
            position: "middle",
          })
        }
        break
      }

      case "stress": {
        const currentStress = displayedStressMax
        if (newCheckedState) {
          const newValue = Math.min(currentStress + 1, 18)
          updateStressMax(convertDisplayedStressMaxToStoredBase(safeFormData, newValue))
          showFadeNotification({
            message: `压力槽上限 +1，当前为 ${newValue}`,
            type: "success",
            position: "middle",
          })
        } else {
          const newValue = Math.max(currentStress - 1, minDisplayedStressMax)
          updateStressMax(convertDisplayedStressMaxToStoredBase(safeFormData, newValue))
          showFadeNotification({
            message: `压力槽上限 -1，当前为 ${newValue}`,
            type: "success",
            position: "middle",
          })
        }
        break
      }

      case "proficiency": {
        const currentProficiency = Array.isArray(safeFormData.proficiency)
          ? safeFormData.proficiency
          : Array(6).fill(false)
        const currentCount = currentProficiency.filter((value) => value === true).length

        if (newCheckedState) {
          if (currentCount < 6) {
            const newProficiency = [...currentProficiency]
            newProficiency[currentCount] = true
            setFormData({ proficiency: newProficiency })
            showFadeNotification({
              message: `熟练值 +1，当前为 ${currentCount + 1}/6`,
              type: "success",
              position: "middle",
            })
          }
        } else if (currentCount > 0) {
          const newProficiency = [...currentProficiency]
          newProficiency[currentCount - 1] = false
          setFormData({ proficiency: newProficiency })
          showFadeNotification({
            message: `熟练值 -1，当前为 ${currentCount - 1}/6`,
            type: "success",
            position: "middle",
          })
        }
        break
      }

      case "domain-card":
      case "subclass-upgrade":
        break
      }
    }

    toggleUpgradeCheckbox(checkKeyOrTier, index, newCheckedState)
  }

  const isUpgradeChecked = (tier: string, index: number): boolean => {
    return !!safeFormData.checkedUpgrades?.[tier as keyof typeof safeFormData.checkedUpgrades]?.[index]
  }

  const getUpgradeOptions = (tier: number): UpgradeOption[] => {
    const baseUpgrades: UpgradeOption[] = [...upgradeOptionsData.baseUpgrades]
    const tierKey = `tier${tier}` as keyof typeof upgradeOptionsData.tierLevelCaps
    const levelCap = upgradeOptionsData.tierLevelCaps[tierKey] || ""
    const domainLevelCap = upgradeOptionsData.domainLevelCaps[tierKey] || 10

    const processedBaseUpgrades = baseUpgrades.map((option) => ({
      ...option,
      label: option.label.replace("{LEVEL_CAP}", levelCap),
      domainLevelCap: option.action === "domain-card" ? domainLevelCap : option.domainLevelCap,
    }))

    if (ruleSet.capabilities.ancestryExperience) {
      const tierSpecificKey = `tier${tier}` as keyof typeof rhodesIslandUpgradeOptionsData
      return [...(rhodesIslandUpgradeOptionsData[tierSpecificKey] || [])]
    }

    const tierSpecificKey = `tier${tier}` as keyof typeof upgradeOptionsData.tierSpecificUpgrades
    const tierSpecificUpgrades = upgradeOptionsData.tierSpecificUpgrades[tierSpecificKey] || []

    return [...processedBaseUpgrades, ...tierSpecificUpgrades]
  }

  const handleOpenUpgradeDomainModal = (cardIndex: number, _levels?: string[]) => {
    setUpgradeDomainCardIndex(cardIndex)
    setUpgradeDomainModalOpen(true)
  }

  const handleOpenUpgradeSubclassModal = (cardIndex: number, _profession?: string) => {
    setUpgradeSubclassCardIndex(cardIndex)
    setUpgradeSubclassModalOpen(true)
  }

  const applyBoneTouchedEffect = () => {
    setFormData((prev) => {
      if (hasAppliedPermanentEffect(prev.domainCardAutomation, DOMAIN_CARD_AUTOMATION_IDS.boneTouched)) {
        return prev
      }

      const currentAgility = prev.agility ?? ({ checked: false, value: "", spellcasting: false } as AttributeValue)
      const nextAgilityValue = String(safeEvaluateExpression(currentAgility.value || "0") + 1)

      return {
        ...prev,
        agility: {
          ...currentAgility,
          value: nextAgilityValue,
        },
        domainCardAutomation: markPermanentEffectApplied(prev.domainCardAutomation, DOMAIN_CARD_AUTOMATION_IDS.boneTouched),
      }
    })

    showFadeNotification({
      message: "【骸骨恩泽】已生效：敏捷永久 +1",
      type: "success",
      position: "middle",
    })
  }

  const handleVitalityConfirm = (choices: Array<"hp" | "stress" | "threshold">) => {
    setVitalityDialogOpen(false)

    setFormData((prev) => {
      if (hasAppliedPermanentEffect(prev.domainCardAutomation, DOMAIN_CARD_AUTOMATION_IDS.vitality)) {
        return prev
      }

      const automationState = markPermanentEffectApplied(prev.domainCardAutomation, DOMAIN_CARD_AUTOMATION_IDS.vitality)
      const nextDisplayedHpMax = choices.includes("hp") ? Math.min(getDisplayedHpMax(prev) + 1, 18) : getDisplayedHpMax(prev)
      const nextDisplayedStressMax = choices.includes("stress")
        ? Math.min(getDisplayedStressMax(prev) + 1, 18)
        : getDisplayedStressMax(prev)

      return {
        ...prev,
        hpMax: convertDisplayedHpMaxToStoredBase(prev, nextDisplayedHpMax),
        stressMax: convertDisplayedStressMaxToStoredBase(prev, nextDisplayedStressMax),
        domainCardAutomation: {
          ...automationState,
          vitalityChoices: choices,
        },
      }
    })

    const choiceLabels = choices.map((choice) => {
      if (choice === "hp") return "生命槽 +1"
      if (choice === "stress") return "压力槽 +1"
      return "全部伤害阈值 +2"
    })

    showFadeNotification({
      message: `【蓬勃生命】已生效：${choiceLabels.join("、")}`,
      type: "success",
      position: "middle",
    })
  }

  const handleMasterConfirm = (payload: { mode: "two-plus-two" | "one-plus-three"; indices: number[] }) => {
    const delta = payload.mode === "two-plus-two" ? 2 : 3
    const currentValues = safeFormData.experienceValues || ["", "", "", "", ""]
    const afterValues: Record<number, string> = {}

    payload.indices.forEach((index) => {
      afterValues[index] = String(safeEvaluateExpression(currentValues[index] || "0") + delta)
    })

    createExperienceValuesSnapshot(payload.indices, afterValues)

    const inventoryIndex = findFirstEmptyInventorySlot(safeFormData.inventory_cards)
    const canMoveToInventory = inventoryIndex !== -1 && pendingMasterCardIndex >= 0

    setMasterDialogOpen(false)

    setFormData((prev) => {
      if (hasAppliedPermanentEffect(prev.domainCardAutomation, DOMAIN_CARD_AUTOMATION_IDS.masterOfTheCraft)) {
        return prev
      }

      const newExperienceValues = [...(prev.experienceValues || ["", "", "", "", ""])]
      payload.indices.forEach((index) => {
        newExperienceValues[index] = String(safeEvaluateExpression(newExperienceValues[index] || "0") + delta)
      })

      const nextCards = [...(prev.cards || [])]
      const nextInventoryCards = [...(prev.inventory_cards || createEmptyInventoryCards())]

      if (canMoveToInventory) {
        nextInventoryCards[inventoryIndex] = nextCards[pendingMasterCardIndex]
        nextCards[pendingMasterCardIndex] = createEmptyCard()
      }

      const automationState = markPermanentEffectApplied(prev.domainCardAutomation, DOMAIN_CARD_AUTOMATION_IDS.masterOfTheCraft)

      return {
        ...prev,
        cards: nextCards,
        inventory_cards: nextInventoryCards,
        experienceValues: newExperienceValues,
        domainCardAutomation: {
          ...automationState,
          masterOfTheCraft: payload,
        },
      }
    })

    setPendingMasterCardIndex(-1)

    showFadeNotification({
      message: canMoveToInventory
        ? "【技艺大师】已生效，经历加值已更新，并已自动移入宝库"
        : "【技艺大师】已生效，但宝库已满，卡牌仍保留在当前配置中",
      type: canMoveToInventory ? "success" : "error",
      position: "middle",
    })
  }

  useEffect(() => {
    if (isResolvingAutomationRef.current || vitalityDialogOpen || masterDialogOpen) {
      return
    }

    const automationState = ensureAutomationState(safeFormData.domainCardAutomation)

    if (!automationState.appliedPermanentCardIds.includes(DOMAIN_CARD_AUTOMATION_IDS.boneTouched)) {
      const boneTouchedIndex = findFocusedCardIndex(safeFormData.cards, DOMAIN_CARD_AUTOMATION_IDS.boneTouched)
      if (boneTouchedIndex !== -1) {
        isResolvingAutomationRef.current = true
        applyBoneTouchedEffect()
        queueMicrotask(() => {
          isResolvingAutomationRef.current = false
        })
        return
      }
    }

    if (!automationState.appliedPermanentCardIds.includes(DOMAIN_CARD_AUTOMATION_IDS.vitality)) {
      const vitalityIndex = findFocusedCardIndex(safeFormData.cards, DOMAIN_CARD_AUTOMATION_IDS.vitality)
      if (vitalityIndex !== -1) {
        setVitalityDialogOpen(true)
        return
      }
    }

    if (!automationState.appliedPermanentCardIds.includes(DOMAIN_CARD_AUTOMATION_IDS.masterOfTheCraft)) {
      const masterIndex = findFocusedCardIndex(safeFormData.cards, DOMAIN_CARD_AUTOMATION_IDS.masterOfTheCraft)
      if (masterIndex !== -1) {
        setPendingMasterCardIndex(masterIndex)
        setMasterDialogOpen(true)
      }
    }
  }, [safeFormData, vitalityDialogOpen, masterDialogOpen])

  return (
    <>
      <div />

      <div className="w-full max-w-[210mm] mx-auto">
        <div
          data-ri-sheet-page="cards"
          className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm" }}
        >
          <PageHeader />

          <CharacterDescriptionSection formData={safeFormData} handleInputChange={handleInputChange} />

          <CardDeckSection
            formData={safeFormData}
            onCardChange={handleCardChange}
            onInventoryCardChange={handleInventoryCardChange}
          />

          <div className="mt-3 grid grid-cols-3 gap-3 text-m">
            <UpgradeSection
              tier={1}
              title={ruleSet.capabilities.ancestryExperience ? "T2：等级2-4" : "位阶2 等级 2-4"}
              description={ruleSet.capabilities.ancestryExperience ? "当你到达 2 级时，获得一项额外+2经历，并将你的熟练值+1" : "当你到达 2 级时：获得一项额外 +2 经历，熟练值 +1。"}
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              toggleUpgradeCheckbox={toggleUpgradeCheckbox}
              getUpgradeOptions={getUpgradeOptions}
              onCardChange={handleCardChange}
              onOpenCardModal={handleOpenUpgradeDomainModal}
              onOpenSubclassModal={handleOpenUpgradeSubclassModal}
            />

            <UpgradeSection
              tier={2}
              title={ruleSet.capabilities.ancestryExperience ? "T3：" : "位阶3 等级 5-7"}
              description={ruleSet.capabilities.ancestryExperience ? "当你到达 5 级时，获得一项额外+2经历，清除你所有角色属性上的标记，并将你的熟练值+1" : "当你到达 5 级时：获得一项额外 +2 经历，清除所有属性升级标记，熟练值 +1。"}
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              toggleUpgradeCheckbox={toggleUpgradeCheckbox}
              getUpgradeOptions={getUpgradeOptions}
              onCardChange={handleCardChange}
              onOpenCardModal={handleOpenUpgradeDomainModal}
              onOpenSubclassModal={handleOpenUpgradeSubclassModal}
            />

            <UpgradeSection
              tier={3}
              title={ruleSet.capabilities.ancestryExperience ? "T4：" : "位阶4 等级 8-10"}
              description={ruleSet.capabilities.ancestryExperience ? "当你到达 8 级时，获得一项额外+2经历，清除你所有角色属性上的标记，将你的熟练值+1，将你的武器调整值+3，解锁一项专属模组" : "当你到达 8 级时：获得一项额外 +2 经历，清除所有属性升级标记，熟练值 +1。"}
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              toggleUpgradeCheckbox={toggleUpgradeCheckbox}
              getUpgradeOptions={getUpgradeOptions}
              onCardChange={handleCardChange}
              onOpenCardModal={handleOpenUpgradeDomainModal}
              onOpenSubclassModal={handleOpenUpgradeSubclassModal}
            />
          </div>
        </div>
      </div>

      <CardSelectionModal
        isOpen={upgradeDomainModalOpen}
        onClose={() => setUpgradeDomainModalOpen(false)}
        onSelect={(card) => {
          handleCardChange(upgradeDomainCardIndex, card)
          setUpgradeDomainModalOpen(false)
        }}
        selectedCardIndex={upgradeDomainCardIndex}
        initialTab="domain"
      />

      <CardSelectionModal
        isOpen={upgradeSubclassModalOpen}
        onClose={() => {
          setUpgradeSubclassModalOpen(false)
        }}
        onSelect={(card) => {
          handleCardChange(upgradeSubclassCardIndex, card)
          setUpgradeSubclassModalOpen(false)
        }}
        selectedCardIndex={upgradeSubclassCardIndex}
        initialTab="subclass"
      />

      <VitalityChoiceDialog
        open={vitalityDialogOpen}
        onOpenChange={setVitalityDialogOpen}
        onConfirm={handleVitalityConfirm}
      />

      <MasterOfTheCraftDialog
        open={masterDialogOpen}
        onOpenChange={setMasterDialogOpen}
        formData={safeFormData}
        onConfirm={handleMasterConfirm}
      />
      <RhodesMulticlassModal
        open={multiclassWizardOpen}
        mainProfessionId={safeFormData.professionRef?.id}
        onOpenChange={(open) => {
          setMulticlassWizardOpen(open)
          if (!open) setPendingMulticlassCheck(null)
        }}
        onConfirm={(selection) => {
          const selectedCards = rhodesIslandCards.filter(card =>
            card.id === selection.profession.id ||
            card.id === selection.branch.id ||
            (card.type === "domain" && card.level === 1 && card.class === selection.domain.name)
          ) as StandardCard[]
          setFormData(prev => {
            const cards = [...prev.cards]
            for (const selectedCard of selectedCards) {
              const emptyIndex = cards.findIndex((card, index) => index >= 5 && isEmptyCard(card))
              if (emptyIndex >= 0) cards[emptyIndex] = selectedCard
            }
            return { ...prev, multiclassSelection: selection, cards }
          })
          if (pendingMulticlassCheck) {
            toggleUpgradeCheckbox(pendingMulticlassCheck.key, pendingMulticlassCheck.index, true)
          }
        }}
      />
    </>
  )
}

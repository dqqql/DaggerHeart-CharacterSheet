"use client"
import { useState } from "react"
import { Edit } from "lucide-react"
import type { SheetData } from "@/lib/sheet-data"
import { useSheetStore } from "@/lib/sheet-store"
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover"
import { HPMaxEditor } from "@/components/upgrade-popover/hp-max-editor"
import { StressMaxEditor } from "@/components/upgrade-popover/stress-max-editor"
import { ExperienceValuesEditor } from "@/components/upgrade-popover/experience-values-editor"
import { AttributeUpgradeEditor } from "@/components/upgrade-popover/attribute-upgrade-editor"
import { EvasionEditor } from "@/components/upgrade-popover/evasion-editor"
import { DomainCardSelector } from "@/components/upgrade-popover/domain-card-selector"
import { ProficiencyEditor } from "@/components/upgrade-popover/proficiency-editor"
import { SubclassCardSelector } from "@/components/upgrade-popover/subclass-card-selector"
import { NewExperienceEditor } from "@/components/upgrade-popover/new-experience-editor"
import { showFadeNotification } from "@/components/ui/fade-notification"
import type { StandardCard } from "@/card/card-types"
import type { UpgradeOption } from "@/data/list/upgrade"
import { RhodesIslandModuleUpgrade } from "@/components/rulesets/rhodes-island-module-upgrade"

interface UpgradeSectionProps {
  tier: number
  title: string
  description: string
  formData: SheetData
  isUpgradeChecked: (tier: string, index: number) => boolean
  handleUpgradeCheck: (tier: string, index: number) => void
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void  // 新增：纯粹的状态切换函数
  getUpgradeOptions: (tier: number) => UpgradeOption[]
  onCardChange?: (index: number, card: StandardCard) => void
  onOpenCardModal?: (index: number, levels?: string[]) => void
  onOpenSubclassModal?: (index: number, profession?: string) => void
}

export function UpgradeSection({
  tier,
  title,
  description,
  formData,
  isUpgradeChecked,
  handleUpgradeCheck,
  toggleUpgradeCheckbox,
  getUpgradeOptions,
  onCardChange,
  onOpenCardModal,
  onOpenSubclassModal,
}: UpgradeSectionProps) {
  const tierKey = `tier${tier}`
  const updateLevel = useSheetStore(state => state.updateLevel)
  const setSheetData = useSheetStore(state => state.setSheetData)
  const [openPopoverIndex, setOpenPopoverIndex] = useState<string | null>(null)
  const [isLevelExpanded, setIsLevelExpanded] = useState(false)
  const [openNewExperiencePopover, setOpenNewExperiencePopover] = useState(false)

  const needsEditButton = (option: UpgradeOption) =>
    option.action === "domain-card" || option.action === "subclass-upgrade"

  const shouldDirectlyOpenModal = (option: UpgradeOption) =>
    option.action === "domain-card" || option.action === "subclass-upgrade"

  // Handle direct modal opening for domain/subclass cards
  const handleDirectModalOpen = (option: UpgradeOption) => {
    if (option.action === "domain-card") {
      // Domain card logic - same as in DomainCardSelector
      const cards = formData.cards || []
      let emptySlotIndex = -1

      for (let i = 5; i < 20; i++) {
        const card = cards[i]
        if (!card || (!card.name && (!card.type || card.type === "unknown"))) {
          emptySlotIndex = i
          break
        }
      }

      if (emptySlotIndex === -1) {
        showFadeNotification({ message: "没有空余卡位", type: "error" })
        return
      }

      const levelCap = option.domainLevelCap ?? 10
      const currentLevel = parseInt(formData.level) || 0
      const targetLevel = currentLevel > 0 ? Math.min(currentLevel, levelCap) : levelCap
      const levelFilter = Array.from({ length: targetLevel }, (_, i) => String(i + 1))

      onOpenCardModal?.(emptySlotIndex, levelFilter)
    }

    if (option.action === "subclass-upgrade") {
      // Subclass card logic - same as in SubclassCardSelector
      const cards = formData.cards || []
      let emptySlotIndex = -1

      for (let i = 5; i < 20; i++) {
        const card = cards[i]
        if (!card || (!card.name && (!card.type || card.type === "unknown"))) {
          emptySlotIndex = i
          break
        }
      }

      if (emptySlotIndex === -1) {
        showFadeNotification({ message: "没有空余卡位", type: "error" })
        return
      }

      // Get current profession from profession card at index 0
      let currentProfession: string | undefined = undefined
      const professionCard = cards[0]
      const isCardEmpty = !professionCard || (!professionCard.name && (!professionCard.type || professionCard.type === "unknown"))

      if (!isCardEmpty && professionCard.type === "profession") {
        currentProfession = professionCard.class
      }

      onOpenSubclassModal?.(emptySlotIndex, currentProfession)
    }
  }

  // Render the appropriate editor based on option type
  const renderEditor = (option: UpgradeOption, index: number, checkKeyOrBoxIndex: number | string) => {
    if (option.action === "attribute") {
      // 如果传入的是字符串，就是完整的 checkKey；否则是 boxIndex，需要构造
      const checkKey = typeof checkKeyOrBoxIndex === 'string'
        ? checkKeyOrBoxIndex
        : `${tierKey}-${index}-${checkKeyOrBoxIndex}`

      return (
        <AttributeUpgradeEditor
          checkKey={checkKey}
          optionIndex={index}
          toggleUpgradeCheckbox={toggleUpgradeCheckbox}
          onClose={() => setOpenPopoverIndex(null)}
        />
      )
    }

    if (option.action === "hp") {
      return <HPMaxEditor onClose={() => setOpenPopoverIndex(null)} />
    }

    if (option.action === "stress") {
      return <StressMaxEditor onClose={() => setOpenPopoverIndex(null)} />
    }

    if (option.action === "experience") {
      const checkKey = typeof checkKeyOrBoxIndex === 'string'
        ? checkKeyOrBoxIndex
        : `${tierKey}-${index}-${checkKeyOrBoxIndex}`

      return (
        <ExperienceValuesEditor
          checkKey={checkKey}
          optionIndex={index}
          toggleUpgradeCheckbox={toggleUpgradeCheckbox}
          onClose={() => setOpenPopoverIndex(null)}
        />
      )
    }

    if (option.action === "domain-card") {
      return (
        <DomainCardSelector
          formData={formData}
          tier={tier}
          onCardChange={onCardChange!}
          onClose={() => setOpenPopoverIndex(null)}
          onOpenModal={(slotIndex, levels) => {
            setOpenPopoverIndex(null)
            onOpenCardModal?.(slotIndex, levels)
          }}
        />
      )
    }

    if (option.action === "evasion") {
      const checkKey = typeof checkKeyOrBoxIndex === 'string'
        ? checkKeyOrBoxIndex
        : `${tierKey}-${index}-${checkKeyOrBoxIndex}`

      return (
        <EvasionEditor
          checkKey={checkKey}
          optionIndex={index}
          toggleUpgradeCheckbox={toggleUpgradeCheckbox}
          onClose={() => setOpenPopoverIndex(null)}
        />
      )
    }

    if (option.action === "proficiency") {
      return <ProficiencyEditor onClose={() => setOpenPopoverIndex(null)} />
    }

    if (option.action === "subclass-upgrade") {
      return (
        <SubclassCardSelector
          formData={formData}
          onCardChange={onCardChange!}
          onClose={() => setOpenPopoverIndex(null)}
          onOpenModal={(slotIndex, profession) => {
            setOpenPopoverIndex(null)
            onOpenSubclassModal?.(slotIndex, profession)
          }}
        />
      )
    }

    return null
  }

  // 检测 description 是否包含"获得一项额外+2经历"
  const hasNewExperienceText = description.includes("获得一项额外+2经历")
  const upgradeOptions = getUpgradeOptions(tier)
  const moduleOptionIndex = upgradeOptions.findIndex((option) => option.action === "select-module")
  const moduleOption = moduleOptionIndex >= 0 ? upgradeOptions[moduleOptionIndex] : undefined
  const tierDomainOption = upgradeOptions.find((option) => option.action === "domain-card")

  return (
    <div className="border border-gray-300 rounded-md shadow-sm">
      <div className="bg-gray-800 text-white p-1 text-center font-bold !text-sm rounded-t-md">{title}</div>
      <div className="bg-gray-600 text-white p-1 !text-xs flex items-center justify-between">
        <span>{description}</span>
        {hasNewExperienceText && (
          <Popover
            open={openNewExperiencePopover}
            onOpenChange={setOpenNewExperiencePopover}
          >
            <PopoverTrigger asChild>
              <button
                className="inline-flex items-center justify-center p-0.5 hover:bg-gray-500 rounded transition-colors print:hidden ml-1 flex-shrink-0"
                title="添加新经历"
              >
                <Edit className="w-2.5 h-2.5 text-white" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-1.5 bg-white border border-gray-300 rounded shadow-lg"
              side="right"
              align="start"
              sideOffset={5}
            >
              <NewExperienceEditor onClose={() => setOpenNewExperiencePopover(false)} />
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="p-1">
        <p className="!text-xs mb-2">
          {formData.ruleSetId === "rhodes-island"
            ? <>每升1级便从下面列表中选择两个选项格子并标记它们</>
            : tier === 1
              ? <>更新你的等级，从下方的升级列表中选择并标记<strong>两个</strong>选项。</>
              : <>更新你的等级，从下方的升级列表或更低级的列表中选择并标记<strong>两个</strong>选项。</>}
        </p>

        <div className="space-y-1">
          {upgradeOptions.map((option, index) => {
            if (index === moduleOptionIndex) return null

            const optionStateIndex = option.stateIndex ?? index
            const needsPopover = ["attribute", "experience", "evasion"].includes(option.action)
            return (
              <div key={option.id} className="flex items-start !text-[10px] leading-[1.6]">
              {/* 属性升级 / 经历升级 / 闪避值升级：包裹 Popover 以便定位 */}
              {needsPopover ? (
                <Popover
                  open={openPopoverIndex !== null && openPopoverIndex.startsWith(`${tierKey}-${optionStateIndex}-`)}
                  onOpenChange={(open) => {
                    if (!open) {
                      setOpenPopoverIndex(null)
                    }
                  }}
                >
                  <PopoverAnchor asChild>
                    <span className={`flex flex-shrink-0 items-center justify-end mt-px ${option.doubleBox && option.boxCount === 2 ? '' : 'gap-px'}`} style={{ minWidth: '3.2em' }}>
                      {Array(option.boxCount).fill(null).map((_, i) => {
                  const checkKey = option.doubleBox ? `${tierKey}-${optionStateIndex}` : `${tierKey}-${optionStateIndex}-${i}`
                  return (
                    <button
                      type="button"
                      key={i}
                      data-testid={`checkbox-${checkKey}`}
                      aria-label={option.label}
                      aria-pressed={isUpgradeChecked(checkKey, optionStateIndex)}
                      className={`w-3 h-3 cursor-pointer ${option.doubleBox && option.boxCount === 2
                        ? `${i === 0
                          ? 'border-l-2 border-t-2 border-b-2 border-r border-gray-800'
                          : 'border-r-2 border-t-2 border-b-2 border-l border-gray-800'
                        } ${isUpgradeChecked(checkKey, optionStateIndex)
                            ? "bg-gray-800"
                            : "bg-white"
                        }`
                        : option.doubleBox
                          ? `border-2 border-gray-800 ${isUpgradeChecked(checkKey, optionStateIndex)
                            ? "bg-gray-800"
                            : "bg-white"
                          }`
                          : `border border-gray-800 ${isUpgradeChecked(checkKey, optionStateIndex)
                            ? "bg-gray-800"
                            : "bg-white"
                          }`
                      }`}
                      onClick={() => {
                        // 属性升级 / 经历升级 / 闪避值升级选项：特殊处理
                        if (["attribute", "experience", "evasion"].includes(option.action)) {
                          const isChecked = isUpgradeChecked(checkKey, optionStateIndex)
                          if (!isChecked) {
                            // 空白复选框 → 打开气泡编辑器
                            setOpenPopoverIndex(checkKey)
                          } else {
                            // 已高亮复选框 → 触发回滚
                            handleUpgradeCheck(checkKey, optionStateIndex)
                          }
                        } else {
                          // 其他选项：保持原有逻辑
                          handleUpgradeCheck(checkKey, optionStateIndex)
                        }
                      }}
                    />
                  )
                })}
                    </span>
                  </PopoverAnchor>
                  <PopoverContent
                    className="w-auto p-1.5 bg-white border border-gray-300 rounded shadow-lg"
                    side="top"
                    align="start"
                    sideOffset={5}
                  >
                    {openPopoverIndex && renderEditor(option, optionStateIndex, openPopoverIndex)}
                  </PopoverContent>
                </Popover>
              ) : (
                <span className={`flex flex-shrink-0 items-center justify-end mt-px ${option.doubleBox && option.boxCount === 2 ? '' : 'gap-px'}`} style={{ minWidth: '3.2em' }}>
                  {Array(option.boxCount).fill(null).map((_, i) => {
                    const checkKey = option.doubleBox ? `${tierKey}-${optionStateIndex}` : `${tierKey}-${optionStateIndex}-${i}`
                    return (
                      <button
                        type="button"
                        key={i}
                        data-testid={`checkbox-${checkKey}`}
                        aria-label={option.label}
                        aria-pressed={isUpgradeChecked(checkKey, optionStateIndex)}
                        className={`w-3 h-3 cursor-pointer ${option.doubleBox && option.boxCount === 2
                          ? `${i === 0
                            ? 'border-l-2 border-t-2 border-b-2 border-r border-gray-800'
                            : 'border-r-2 border-t-2 border-b-2 border-l border-gray-800'
                            } ${isUpgradeChecked(checkKey, optionStateIndex)
                              ? "bg-gray-800"
                              : "bg-white"
                          }`
                          : option.doubleBox
                            ? `border-2 border-gray-800 ${isUpgradeChecked(checkKey, optionStateIndex)
                              ? "bg-gray-800"
                              : "bg-white"
                            }`
                            : `border border-gray-800 ${isUpgradeChecked(checkKey, optionStateIndex)
                              ? "bg-gray-800"
                              : "bg-white"
                            }`
                        }`}
                        onClick={() => {
                          // 其他选项：保持原有逻辑
                          handleUpgradeCheck(checkKey, optionStateIndex)
                        }}
                      />
                    )
                  })}
                </span>
              )}
              <div className="flex-1 ml-2">
                <span className="text-gray-800 dark:text-gray-200 mr-1">{option.label}</span>
                {/* 其他需要编辑按钮的选项 */}
                {needsEditButton(option) && (
                  shouldDirectlyOpenModal(option) ? (
                    // Direct modal open button (no popover)
                    <button
                      onClick={() => handleDirectModalOpen(option)}
                      className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                      title="选择卡牌"
                    >
                      <Edit className="w-2.5 h-2.5 text-gray-600" />
                    </button>
                  ) : (
                    // Popover button for other options
                    <Popover
                      open={openPopoverIndex === `${tierKey}-${optionStateIndex}`}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenPopoverIndex(`${tierKey}-${optionStateIndex}`)
                        } else {
                          setOpenPopoverIndex(null)
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                          title="编辑"
                        >
                          <Edit className="w-2.5 h-2.5 text-gray-600" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-1.5 bg-white border border-gray-300 rounded shadow-lg"
                        side="right"
                        align="start"
                        sideOffset={5}
                      >
                        {renderEditor(option, optionStateIndex, 0)}
                      </PopoverContent>
                    </Popover>
                  )
                )}
              </div>
              </div>
            )
          })}
        </div>

        {formData.ruleSetId !== "rhodes-island" && tierDomainOption && <div className="mt-3 !text-xs">
          {tier === 1 && (
            <>
              <span className="text-gray-800 dark:text-gray-200 mr-1">
                将伤害阈值+1，选择一张不高于你当前等级(上限4级)的领域卡加入卡组。
              </span>
              <button
                onClick={() => handleDirectModalOpen(tierDomainOption)}
                className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                title="选择领域卡"
              >
                <Edit className="w-2.5 h-2.5 text-gray-600" />
              </button>
            </>
          )}
          {tier === 2 && (
            <>
              <span className="text-gray-800 dark:text-gray-200 mr-1">
                将伤害阈值+1，选择一张不高于你当前等级(上限7级)的领域卡加入卡组。
              </span>
              <button
                onClick={() => handleDirectModalOpen(tierDomainOption)}
                className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                title="选择领域卡"
              >
                <Edit className="w-2.5 h-2.5 text-gray-600" />
              </button>
            </>
          )}
          {tier === 3 && (
            <>
              <span className="text-gray-800 dark:text-gray-200 mr-1">
                将伤害阈值+1，选择一张不高于你当前等级(上限10级)的领域卡加入卡组。
              </span>
              <button
                onClick={() => handleDirectModalOpen(tierDomainOption)}
                className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                title="选择领域卡"
              >
                <Edit className="w-2.5 h-2.5 text-gray-600" />
              </button>
            </>
          )}
        </div>}

        {moduleOption && (() => {
          const moduleStateIndex = moduleOption.stateIndex ?? moduleOptionIndex
          const moduleCheckKey = `${tierKey}-${moduleStateIndex}-0`
          const moduleChecked = isUpgradeChecked(moduleCheckKey, moduleStateIndex)

          return (
            <RhodesIslandModuleUpgrade
              branchId={formData.subclassRef?.id}
              option={moduleOption}
              checked={moduleChecked}
              selectedModule={formData.selectedModule}
              onToggle={() => handleUpgradeCheck(moduleCheckKey, moduleStateIndex)}
              onSelect={(selectedModule) => setSheetData({ selectedModule })}
            />
          )
        })()}

        {tier === 1 && (
          <div
            className="group mt-8 -ml-1 inline-flex flex-row items-stretch rounded-r-md border border-l-0 border-gray-300 overflow-hidden print:hidden cursor-pointer"
            onClick={() => setIsLevelExpanded(prev => !prev)}
          >
            {/* 收起标签 - 竖排文字，展开后隐藏 */}
            <div className={`bg-gray-100 px-0.5 py-1 flex items-center justify-center transition-opacity duration-300 ease-out ${isLevelExpanded ? "max-w-0 px-0 overflow-hidden opacity-0" : ""} group-hover:max-w-0 group-hover:px-0 group-hover:overflow-hidden group-hover:opacity-0`} style={{ writingMode: "vertical-rl" }}>
              <span className="text-sm font-bold text-gray-400 tracking-tight whitespace-nowrap">
                {`Lv. ${formData.level || "1"}`}
              </span>
            </div>
            {/* 展开面板 - 横向滑出 */}
            <div className={`flex flex-col transition-opacity duration-300 ease-out overflow-hidden max-w-0 opacity-0 ${isLevelExpanded ? "max-w-24 opacity-100" : ""} group-hover:max-w-24 group-hover:opacity-100`}>
              <div className="bg-gray-100 px-2 py-0.5 text-center whitespace-nowrap">
                <span className="!text-xs text-gray-500">LEVEL</span>
                <div className="text-sm font-bold text-gray-500">
                  {formData.level || "1"}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const oldLevel = formData.level || ""
                  if (!formData.level || formData.level.trim() === "") {
                    updateLevel("1", oldLevel)
                    return
                  }
                  const currentLevel = parseInt(formData.level)
                  if (currentLevel >= 10) return
                  const newLevel = Math.min(currentLevel + 1, 10)
                  updateLevel(String(newLevel), oldLevel)
                }}
                className="px-2 py-0.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold transition-colors whitespace-nowrap disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={parseInt(formData.level) >= 10}
              >
                Level Up!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

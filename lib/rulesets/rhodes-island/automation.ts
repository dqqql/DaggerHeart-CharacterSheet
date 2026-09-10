import catalogJson from "@/data/rhodes-island/catalog.json"
import {
  RHODES_ISLAND_LEGACY_STARTING_INVENTORY,
  RHODES_ISLAND_STARTING_INVENTORY,
} from "@/data/rhodes-island/starting-inventory"
import type { StandardCard } from "@/card/card-types"
import type { SheetData } from "@/lib/sheet-data"

export const RHODES_ISLAND_AUTOMATION_VERSION = 5

interface RhodesWeapon {
  name: string
  range: string
  burden: string
  damageType: string
  damage: string
}

interface RhodesStage {
  tier: number
  level: number
  rank: string
  weapon: RhodesWeapon
  branchFeature: string
  professionFeature: string
}

interface RhodesBranch {
  id: string
  professionId: string
  profession: string
  name: string
  stages: RhodesStage[]
  modules: Record<"x" | "y", { id: string; name: string; description: string }>
}

interface RhodesProfession {
  id: string
  classFeature: string
  hopeFeature: string
}

const catalog = catalogJson as unknown as {
  branches: RhodesBranch[]
  professions: RhodesProfession[]
}

export function getRhodesBranch(branchId: string | undefined): RhodesBranch | undefined {
  return branchId ? catalog.branches.find(branch => branch.id === branchId) : undefined
}

export function getRhodesProfessionHopeFeature(professionId: string | undefined): string {
  return professionId
    ? catalog.professions.find(profession => profession.id === professionId)?.hopeFeature ?? ""
    : ""
}

function stageForLevel(branch: RhodesBranch, level: number): RhodesStage {
  const eligibleStages = [...branch.stages]
    .sort((a, b) => a.level - b.level)
    .filter(stage => level >= stage.level)
  return eligibleStages[eligibleStages.length - 1] ?? branch.stages[0]
}

function latestFeatureStageForLevel(
  branch: RhodesBranch,
  level: number,
  field: "branchFeature" | "professionFeature",
): RhodesStage | undefined {
  return [...branch.stages]
    .sort((a, b) => a.level - b.level)
    .filter(stage => level >= stage.level && stage[field])
    .at(-1)
}

function moduleContent(description: string): string {
  const [, ...contentLines] = description.split(/\r?\n/)
  return contentLines.join("\n").trim() || description.trim()
}

function removeBranchNameFromHopeFeature(content: string, branchName: string): string {
  return content.replace(`-${branchName}：`, "：")
}

function replaceCardDescription(
  card: StandardCard | undefined,
  description: string,
  item2?: string,
): StandardCard | undefined {
  if (!card?.id) return card
  return {
    ...card,
    description,
    cardSelectDisplay: {
      ...card.cardSelectDisplay,
      ...(item2 ? { item2 } : {}),
    },
  }
}

function replaceCardHopeFeature(
  card: StandardCard | undefined,
  hopeFeature: string,
): StandardCard | undefined {
  if (!card?.id || !card.professionSpecial) return card
  return {
    ...card,
    professionSpecial: {
      ...card.professionSpecial,
      希望特性: hopeFeature,
    },
  }
}

function isLegacyXModuleWeaponFeature(value: string): boolean {
  if (!value) return false
  return catalog.branches.some(branch => (
    value === `${branch.modules.x.name}：${moduleContent(branch.modules.x.description)}`
  ))
}

/**
 * 罗德岛数值均由当前选择派生，不做累加，因此反复加载、跨级和降级都是幂等的。
 */
export function applyRhodesIslandAutomation(data: SheetData): SheetData {
  if (data.ruleSetId !== "rhodes-island") return data

  const branch = getRhodesBranch(data.subclassRef?.id)
  const previousAutomationVersion = data.rulesetAutomationVersions?.["rhodes-island"] ?? 0
  const versions = {
    ...data.rulesetAutomationVersions,
    "rhodes-island": RHODES_ISLAND_AUTOMATION_VERSION,
  }
  const hasInventoryContent = Array.isArray(data.inventory)
    && data.inventory.some(item => typeof item === "string" && item.trim() !== "")
  const hasLegacyStartingInventory = RHODES_ISLAND_LEGACY_STARTING_INVENTORY.every(
    (item, index) => data.inventory?.[index] === item,
  )
  const inventory = previousAutomationVersion < RHODES_ISLAND_AUTOMATION_VERSION
    && (!hasInventoryContent || hasLegacyStartingInventory)
    ? [...RHODES_ISLAND_STARTING_INVENTORY]
    : data.inventory

  if (!branch) {
    return {
      ...data,
      inventory,
      mixedAncestryEnabled: false,
      ancestry2: "",
      ancestry2Ref: { id: "", name: "" },
      secondaryWeaponName: "",
      secondaryWeaponTrait: "",
      secondaryWeaponDamage: "",
      secondaryWeaponFeature: "",
      rulesetAutomationVersions: versions,
    }
  }

  const level = Math.max(1, Math.min(10, Number.parseInt(data.level || "1", 10) || 1))
  const weaponStage = stageForLevel(branch, level)
  const branchFeatureStage = latestFeatureStageForLevel(branch, level, "branchFeature") ?? branch.stages[0]
  const professionFeatureStage = latestFeatureStageForLevel(branch, level, "professionFeature")
  const profession = catalog.professions.find(item => item.id === branch.professionId)
  const selectedModule = level >= 8 && data.selectedModule
    ? branch.modules[data.selectedModule]
    : undefined
  const professionFeature = professionFeatureStage?.professionFeature
    ? professionFeatureStage.professionFeature
    : profession?.classFeature ?? ""
  const selectedModuleContent = selectedModule ? moduleContent(selectedModule.description) : ""
  const hopeFeature = data.selectedModule === "x" && selectedModule
    ? removeBranchNameFromHopeFeature(selectedModuleContent, branch.name)
    : profession?.hopeFeature ?? ""
  const professionDescription = [
    professionFeature,
    branchFeatureStage.branchFeature,
    data.selectedModule === "y" && selectedModule
      ? `${selectedModule.name}：${selectedModuleContent}`
      : "",
  ].filter(Boolean).join("\n\n")
  const primaryWeaponFeature = previousAutomationVersion < RHODES_ISLAND_AUTOMATION_VERSION
    && isLegacyXModuleWeaponFeature(data.primaryWeaponFeature ?? "")
    ? ""
    : data.primaryWeaponFeature ?? ""

  const cards = [...(data.cards ?? [])]
  cards[0] = replaceCardDescription(cards[0], professionDescription || cards[0]?.description || "") as StandardCard
  cards[0] = replaceCardHopeFeature(cards[0], hopeFeature) as StandardCard
  cards[1] = replaceCardDescription(
    cards[1],
    branchFeatureStage.branchFeature,
    branchFeatureStage.rank,
  ) as StandardCard

  return {
    ...data,
    inventory,
    cards,
    mixedAncestryEnabled: false,
    ancestry2: "",
    ancestry2Ref: { id: "", name: "" },
    primaryWeaponName: weaponStage.weapon.name,
    primaryWeaponSelection: { mode: "custom", id: branch.id },
    primaryWeaponTrait: [
      weaponStage.weapon.damageType,
      weaponStage.weapon.burden,
      weaponStage.weapon.range,
    ].filter(Boolean).join("/"),
    primaryWeaponDamage: weaponStage.weapon.damage,
    primaryWeaponFeature,
    secondaryWeaponName: "",
    secondaryWeaponSelection: { mode: "none" },
    secondaryWeaponTrait: "",
    secondaryWeaponDamage: "",
    secondaryWeaponFeature: "",
    rulesetAutomationVersions: versions,
  }
}

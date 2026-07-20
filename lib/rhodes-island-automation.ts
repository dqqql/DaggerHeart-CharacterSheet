import catalogJson from "@/data/rhodes-island/catalog.json"
import type { StandardCard } from "@/card/card-types"
import type { SheetData } from "@/lib/sheet-data"

export const RHODES_ISLAND_AUTOMATION_VERSION = 2

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

function stageForBranchUpgrades(branch: RhodesBranch, count: number): RhodesStage {
  // 分支升级最多从预备→正式→资深；精英阶段由 8 级模组表达。
  return branch.stages[Math.max(0, Math.min(2, count))] ?? branch.stages[0]
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
  const versions = {
    ...data.rulesetAutomationVersions,
    "rhodes-island": RHODES_ISLAND_AUTOMATION_VERSION,
  }

  if (!branch) {
    return {
      ...data,
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
  const rankStage = stageForBranchUpgrades(branch, data.branchUpgradeCount ?? 0)
  const profession = catalog.professions.find(item => item.id === branch.professionId)
  const selectedModule = level >= 8 && data.selectedModule
    ? branch.modules[data.selectedModule]
    : undefined
  const professionFeature = level >= 5 && weaponStage.professionFeature
    ? weaponStage.professionFeature
    : profession?.classFeature ?? ""
  const selectedModuleContent = selectedModule ? moduleContent(selectedModule.description) : ""
  const hopeFeature = data.selectedModule === "x" && selectedModule
    ? removeBranchNameFromHopeFeature(selectedModuleContent, branch.name)
    : profession?.hopeFeature ?? ""
  const professionDescription = [
    professionFeature,
    rankStage.branchFeature,
    data.selectedModule === "y" && selectedModule
      ? `${selectedModule.name}：${selectedModuleContent}`
      : "",
  ].filter(Boolean).join("\n\n")
  const previousAutomationVersion = data.rulesetAutomationVersions?.["rhodes-island"] ?? 0
  const primaryWeaponFeature = previousAutomationVersion < RHODES_ISLAND_AUTOMATION_VERSION
    && isLegacyXModuleWeaponFeature(data.primaryWeaponFeature ?? "")
    ? ""
    : data.primaryWeaponFeature ?? ""

  const cards = [...(data.cards ?? [])]
  cards[0] = replaceCardDescription(cards[0], professionDescription || cards[0]?.description || "") as StandardCard
  cards[0] = replaceCardHopeFeature(cards[0], hopeFeature) as StandardCard
  cards[1] = replaceCardDescription(cards[1], rankStage.branchFeature, rankStage.rank) as StandardCard

  return {
    ...data,
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

import type { SheetData } from "@/lib/sheet-data"
import type { DerivedStatSourceLine } from "@/lib/preset-equipment"

export type RhodesDerivedStatsInput = Partial<
  Pick<
    SheetData,
    "ruleSetId" | "subclassRef" | "branchUpgradeCount" | "level" | "selectedModule" | "cards"
  >
>

export interface RhodesDerivedStatSources {
  evasion: DerivedStatSourceLine[]
  armorValue: DerivedStatSourceLine[]
  minorThreshold: DerivedStatSourceLine[]
  majorThreshold: DerivedStatSourceLine[]
  hpMax: DerivedStatSourceLine[]
  stressMax: DerivedStatSourceLine[]
}

type RhodesDerivedStatKey = keyof RhodesDerivedStatSources
type RhodesStageEffects = Partial<Record<RhodesDerivedStatKey, number>>

interface RhodesBranchStatRule {
  stages: readonly [RhodesStageEffects, RhodesStageEffects, RhodesStageEffects]
  stageLabels: readonly [string, string, string]
  moduleY?: {
    effects: RhodesStageEffects
    label: string
  }
}

const EMPTY_EFFECTS: RhodesStageEffects = {}

/**
 * 全量审计罗德岛 48 个分支后确认的常驻角色卡数值。
 * 临时状态、单次掷骰加值和触发式阈值变化不在此处持久化。
 */
const RHODES_BRANCH_STAT_RULES: Record<string, RhodesBranchStatRule> = {
  // 近卫 / 无畏者：各阶段固定 +1 生命槽；Y 模组再 +1。
  "ri-branch-e1682fc4bea1": {
    stages: [
      { hpMax: 1 },
      { hpMax: 1 },
      { hpMax: 1 },
    ],
    stageLabels: ["愈战愈勇", "愈战愈勇+", "愈战愈勇++"],
    moduleY: {
      effects: { hpMax: 1 },
      label: "无畏之心",
    },
  },
  // 近卫 / 斗士：这里只计算常驻闪避；格斗闪避状态的临时加值不持久化。
  "ri-branch-1d8b2f148b1d": {
    stages: [
      { evasion: 1 },
      { evasion: 1 },
      { evasion: 2 },
    ],
    stageLabels: ["灵敏格斗", "灵敏格斗+", "灵敏格斗++"],
  },
  // 近卫 / 重剑手：重度伤害阈值失效属于非数值规则，由卡面规则说明。
  "ri-branch-f4162da267f0": {
    stages: [
      { hpMax: 2, stressMax: 1 },
      { hpMax: 2, stressMax: 1 },
      { hpMax: 3, stressMax: 3 },
    ],
    stageLabels: ["承此重负", "承此重负+", "承此重负++"],
  },
  // 重装 / 铁卫。
  "ri-branch-97014a65f041": {
    stages: [
      { armorValue: 1, minorThreshold: 1 },
      { armorValue: 1, minorThreshold: 1 },
      { armorValue: 2, minorThreshold: 2 },
    ],
    stageLabels: ["重装护甲", "重装护甲+", "重装护甲++"],
    moduleY: {
      effects: { armorValue: 1 },
      label: "高压战线",
    },
  },
  // 重装 / 决战者。
  "ri-branch-d759df051266": {
    stages: [
      { minorThreshold: 2, majorThreshold: 2 },
      { minorThreshold: 2, majorThreshold: 2 },
      { minorThreshold: 3, majorThreshold: 3 },
    ],
    stageLabels: ["终战姿态", "终战姿态+", "终战姿态++"],
  },
}

function createEmptySources(): RhodesDerivedStatSources {
  return {
    evasion: [],
    armorValue: [],
    minorThreshold: [],
    majorThreshold: [],
    hpMax: [],
    stressMax: [],
  }
}

function getBranchId(data: RhodesDerivedStatsInput): string {
  return data.subclassRef?.id || data.cards?.[1]?.id || ""
}

function getStageIndex(branchUpgradeCount: number | undefined): 0 | 1 | 2 {
  return Math.max(0, Math.min(2, branchUpgradeCount ?? 0)) as 0 | 1 | 2
}

function addEffects(
  sources: RhodesDerivedStatSources,
  effects: RhodesStageEffects,
  label: string,
): void {
  for (const key of Object.keys(effects) as RhodesDerivedStatKey[]) {
    const value = effects[key]
    if (value) {
      sources[key].push({ label, value })
    }
  }
}

export function getRhodesDerivedStatSources(
  data: RhodesDerivedStatsInput,
): RhodesDerivedStatSources {
  const sources = createEmptySources()
  if (data.ruleSetId !== "rhodes-island") return sources

  const rule = RHODES_BRANCH_STAT_RULES[getBranchId(data)]
  if (!rule) return sources

  const stageIndex = getStageIndex(data.branchUpgradeCount)
  addEffects(sources, rule.stages[stageIndex] ?? EMPTY_EFFECTS, rule.stageLabels[stageIndex])

  const level = Number.parseInt(data.level || "1", 10) || 1
  if (level >= 8 && data.selectedModule === "y" && rule.moduleY) {
    addEffects(sources, rule.moduleY.effects, rule.moduleY.label)
  }

  return sources
}

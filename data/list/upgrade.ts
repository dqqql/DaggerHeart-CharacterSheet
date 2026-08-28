export type UpgradeAction =
  | "attribute"
  | "hp"
  | "stress"
  | "experience"
  | "domain-card"
  | "evasion"
  | "proficiency"
  | "subclass-upgrade"
  | "multiclass"
  | "branch-upgrade"
  | "select-module"

export interface UpgradeOption {
  id: string
  action: UpgradeAction
  label: string
  doubleBox: boolean
  boxCount: number
  stateIndex?: number
  domainLevelCap?: number
}

// 升级选项数据
export const upgradeOptionsData = {
  // 基础升级选项（所有职业通用）
  baseUpgrades: [
    { id: "srd-attribute", action: "attribute", label: "两项未升级的角色属性+1，然后将该属性标记为已升级。", doubleBox: false, boxCount: 3, stateIndex: 0 },
    { id: "srd-hp", action: "hp", label: "永久增加一个生命槽。", doubleBox: false, boxCount: 2, stateIndex: 1 },
    { id: "srd-stress", action: "stress", label: "永久增加一个压力槽。", doubleBox: false, boxCount: 2, stateIndex: 2 },
    { id: "srd-experience", action: "experience", label: "选择两项经历获得额外+1。", doubleBox: false, boxCount: 1, stateIndex: 3 },
    { id: "srd-domain-card", action: "domain-card", label: "选择一张不高于你当前等级{LEVEL_CAP}的领域卡加入卡组。", doubleBox: false, boxCount: 1, stateIndex: 4 },
    { id: "srd-evasion", action: "evasion", label: "获得闪避值+1。", doubleBox: false, boxCount: 1, stateIndex: 5 },
  ] satisfies UpgradeOption[],

  // Tier 特定的等级上限配置
  tierLevelCaps: {
    tier1: "(上限4级)",
    tier2: "(上限7级)",
    tier3: "(上限10级)",
  },
  domainLevelCaps: {
    tier1: 4,
    tier2: 7,
    tier3: 10,
  },

  // 特定等级升级选项
  tierSpecificUpgrades: {
    tier1: [] satisfies UpgradeOption[],
    tier2: [
      { id: "srd-tier2-subclass-upgrade", action: "subclass-upgrade", label: "升级你的子职业，你不可再使用位阶3的“兼职”选项。", doubleBox: false, boxCount: 1, stateIndex: 6 },
      { id: "srd-tier2-proficiency", action: "proficiency", label: "(同时标记两格) 获得熟练值+1。", doubleBox: true, boxCount: 2, stateIndex: 7 },
      { id: "srd-tier2-multiclass", action: "multiclass", label: "(同时标记两格) 兼职：获得一个额外的职业、子职业和一个领域。你不可再使用位阶3的“升级子职业”选项。也不可使用其他任何“兼职”选项。", doubleBox: true, boxCount: 2, stateIndex: 8 },
    ] satisfies UpgradeOption[],
    tier3: [
      { id: "srd-tier3-subclass-upgrade", action: "subclass-upgrade", label: "升级你的子职业，你不可再使用位阶4的“兼职”选项。", doubleBox: false, boxCount: 1, stateIndex: 6 },
      { id: "srd-tier3-proficiency", action: "proficiency", label: "(同时标记两格) 获得熟练值+1。", doubleBox: true, boxCount: 2, stateIndex: 7 },
      { id: "srd-tier3-multiclass", action: "multiclass", label: "(同时标记两格) 兼职：获得一个额外的职业、子职业和一个领域。你不可再使用位阶4的“升级子职业”选项。也不可使用其他任何“兼职”选项。", doubleBox: true, boxCount: 2, stateIndex: 8 },
    ] satisfies UpgradeOption[],
  },
}

// 罗德岛规则使用独立的升级文案与格数。
// tier1 / tier2 / tier3 分别对应界面中的 T2 / T3 / T4。
export const rhodesIslandUpgradeOptionsData = {
  tier1: [
    { id: "rhodes-tier1-attribute", action: "attribute", label: "强化训练：两项未标记的角色属性+1，然后标记它们", doubleBox: false, boxCount: 3, stateIndex: 0 },
    { id: "rhodes-tier1-hp", action: "hp", label: "体能训练：获得一个生命槽", doubleBox: false, boxCount: 2, stateIndex: 1 },
    { id: "rhodes-tier1-stress", action: "stress", label: "意志训练：获得一个压力槽", doubleBox: false, boxCount: 2, stateIndex: 2 },
    { id: "rhodes-tier1-experience", action: "experience", label: "发展规划：选择你的两项经历+1", doubleBox: false, boxCount: 1, stateIndex: 3 },
    { id: "rhodes-tier1-domain-card", action: "domain-card", label: "技艺专精：选择一张等级小于或等于你干员等级的领域卡（最高为4级）", doubleBox: false, boxCount: 1, stateIndex: 4, domainLevelCap: 4 },
    { id: "rhodes-tier1-cross-domain-card", action: "domain-card", label: "技艺交流：从你不具有的领域中选择一张等级小于或等于你干员等级一半的领域卡（最高为2级）", doubleBox: false, boxCount: 1, stateIndex: 8, domainLevelCap: 2 },
    { id: "rhodes-tier1-branch-upgrade", action: "branch-upgrade", label: "提升武器原型：将你的武器原型等级提升一级", doubleBox: false, boxCount: 1, stateIndex: 6 },
    { id: "rhodes-tier1-evasion", action: "evasion", label: "机动训练：闪避值+1", doubleBox: false, boxCount: 1, stateIndex: 5 },
  ],
  tier2: [
    { id: "rhodes-tier2-attribute", action: "attribute", label: "专项课程：两项未标记的角色属性+1，然后标记它们", doubleBox: false, boxCount: 3, stateIndex: 0 },
    { id: "rhodes-tier2-hp", action: "hp", label: "体能训练：获得一个生命槽", doubleBox: false, boxCount: 2, stateIndex: 1 },
    { id: "rhodes-tier2-stress", action: "stress", label: "意志训练：获得一个压力槽", doubleBox: false, boxCount: 2, stateIndex: 2 },
    { id: "rhodes-tier2-experience", action: "experience", label: "发展规划：选择你的两项经历+1", doubleBox: false, boxCount: 1, stateIndex: 3 },
    { id: "rhodes-tier2-domain-card", action: "domain-card", label: "技艺专精：选择一张等级小于或等于你干员等级的领域卡（最高为7级）", doubleBox: false, boxCount: 1, stateIndex: 4, domainLevelCap: 7 },
    { id: "rhodes-tier2-cross-domain-card", action: "domain-card", label: "技艺交流：从你不具有的领域中选择一张等级小于或等于你干员等级一半的领域卡（最高为4级）", doubleBox: false, boxCount: 1, stateIndex: 9, domainLevelCap: 4 },
    { id: "rhodes-tier2-branch-upgrade", action: "branch-upgrade", label: "提升武器原型：将你的武器原型等级提升一级", doubleBox: false, boxCount: 1, stateIndex: 6 },
    { id: "rhodes-tier2-evasion", action: "evasion", label: "机动训练：闪避值+1", doubleBox: false, boxCount: 1, stateIndex: 5 },
    { id: "rhodes-tier2-proficiency", action: "proficiency", label: "实战模拟：熟练值+1", doubleBox: true, boxCount: 2, stateIndex: 7 },
  ],
  tier3: [
    { id: "rhodes-tier3-attribute", action: "attribute", label: "专项课程：两项未标记的角色属性+1，然后标记它们", doubleBox: false, boxCount: 3, stateIndex: 0 },
    { id: "rhodes-tier3-hp", action: "hp", label: "体能训练：获得一个生命槽", doubleBox: false, boxCount: 2, stateIndex: 1 },
    { id: "rhodes-tier3-stress", action: "stress", label: "意志训练：获得一个压力槽", doubleBox: false, boxCount: 2, stateIndex: 2 },
    { id: "rhodes-tier3-experience", action: "experience", label: "发展规划：选择你的两项经历+1", doubleBox: false, boxCount: 1, stateIndex: 3 },
    { id: "rhodes-tier3-domain-card", action: "domain-card", label: "技艺专精：选择一张等级小于或等于你干员等级的领域卡（最高为10级）", doubleBox: false, boxCount: 1, stateIndex: 4, domainLevelCap: 10 },
    { id: "rhodes-tier3-cross-domain-card", action: "domain-card", label: "技艺交流：从你不具有的领域中选择一张等级小于或等于你干员等级一半的领域卡（最高为5级）", doubleBox: false, boxCount: 1, stateIndex: 8, domainLevelCap: 5 },
    { id: "rhodes-tier3-evasion", action: "evasion", label: "机动训练：闪避值+1", doubleBox: false, boxCount: 1, stateIndex: 5 },
    { id: "rhodes-tier3-proficiency", action: "proficiency", label: "实战模拟：熟练值+1", doubleBox: true, boxCount: 2, stateIndex: 7 },
    { id: "rhodes-tier3-module", action: "select-module", label: "所选模组：", doubleBox: false, boxCount: 1, stateIndex: 6 },
  ],
} satisfies Record<"tier1" | "tier2" | "tier3", UpgradeOption[]>

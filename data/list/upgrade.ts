// 升级选项数据
export const upgradeOptionsData = {
  // 基础升级选项（所有职业通用）
  baseUpgrades: [
    { label: "两项未升级的角色属性+1，然后将该属性标记为已升级。", doubleBox: false, boxCount: 3 },
    { label: "永久增加一个生命槽。", doubleBox: false, boxCount: 2 },
    { label: "永久增加一个压力槽。", doubleBox: false, boxCount: 2 },
    { label: "选择两项经历获得额外+1。", doubleBox: false, boxCount: 1 },
    { label: "选择一张不高于你当前等级{LEVEL_CAP}的领域卡加入卡组。", doubleBox: false, boxCount: 1 },
    { label: "获得闪避值+1。", doubleBox: false, boxCount: 1 },
  ],

  // Tier特定的等级上限配置
  tierLevelCaps: {
    tier1: "(上限4级)",
    tier2: "(上限7级)",
    tier3: "(上限10级)",
  },

  // 特定等级升级选项
  tierSpecificUpgrades: {
    tier1: [
    ],
    tier2: [
      { label: "升级你的子职业，你不可再使用位阶3的“兼职”选项。", doubleBox: false, boxCount: 1 },
      { label: "(同时标记两格) 获得熟练值+1。", doubleBox: true, boxCount: 2 },
      { label: "(同时标记两格) 兼职：获得一个额外的职业、子职业和一个领域。你不可再使用位阶3的“升级子职业”选项。也不可使用其他任何“兼职”选项。", doubleBox: true, boxCount: 2 },
    ],
    tier3: [
      { label: "升级你的子职业，你不可再使用位阶4的“兼职”选项。", doubleBox: false, boxCount: 1 },
      { label: "(同时标记两格) 获得熟练值+1。", doubleBox: true, boxCount: 2 },
      { label: "(同时标记两格) 兼职：获得一个额外的职业、子职业和一个领域。你不可再使用位阶4的“升级子职业”选项。也不可使用其他任何“兼职”选项。", doubleBox: true, boxCount: 2 },
    ],
  },
};

// 罗德岛规则使用独立的升级文案与格数。
// tier1 / tier2 / tier3 分别对应界面中的 T2 / T3 / T4。
export const rhodesIslandUpgradeOptionsData = {
  tier1: [
    { label: "强化训练：两项未标记的角色属性+1，然后标记它们", doubleBox: false, boxCount: 3, stateIndex: 0 },
    { label: "体能训练：获得一个生命槽", doubleBox: false, boxCount: 2, stateIndex: 1 },
    { label: "意志训练：获得一个压力槽", doubleBox: false, boxCount: 2, stateIndex: 2 },
    { label: "发展规划：选择你的两项经历+1", doubleBox: false, boxCount: 1, stateIndex: 3 },
    { label: "技艺专精：选择一张等级小于或等于你干员等级的领域卡（最高为4级）", doubleBox: false, boxCount: 1, stateIndex: 4 },
    { label: "技艺交流：从你不具有的领域中选择一张等级小于或等于你干员等级一半的领域卡（最高为2级）", doubleBox: false, boxCount: 1, stateIndex: 8 },
    { label: "提升武器原型：将你的武器原型等级提升一级", doubleBox: false, boxCount: 1, stateIndex: 6 },
    { label: "机动训练：闪避值+1", doubleBox: false, boxCount: 1, stateIndex: 5 },
  ],
  tier2: [
    { label: "专项课程：两项未标记的角色属性+1，然后标记它们", doubleBox: false, boxCount: 3, stateIndex: 0 },
    { label: "体能训练：获得一个生命槽", doubleBox: false, boxCount: 2, stateIndex: 1 },
    { label: "意志训练：获得一个压力槽", doubleBox: false, boxCount: 2, stateIndex: 2 },
    { label: "发展规划：选择你的两项经历+1", doubleBox: false, boxCount: 1, stateIndex: 3 },
    { label: "技艺专精：选择一张等级小于或等于你干员等级的领域卡（最高为7级）", doubleBox: false, boxCount: 1, stateIndex: 4 },
    { label: "技艺交流：从你不具有的领域中选择一张等级小于或等于你干员等级一半的领域卡（最高为4级）", doubleBox: false, boxCount: 1, stateIndex: 9 },
    { label: "提升武器原型：将你的武器原型等级提升一级", doubleBox: false, boxCount: 1, stateIndex: 6 },
    { label: "机动训练：闪避值+1", doubleBox: false, boxCount: 1, stateIndex: 5 },
    { label: "实战模拟：熟练值+1", doubleBox: true, boxCount: 2, stateIndex: 7 },
  ],
  tier3: [
    { label: "专项课程：两项未标记的角色属性+1，然后标记它们", doubleBox: false, boxCount: 3, stateIndex: 0 },
    { label: "体能训练：获得一个生命槽", doubleBox: false, boxCount: 2, stateIndex: 1 },
    { label: "意志训练：获得一个压力槽", doubleBox: false, boxCount: 2, stateIndex: 2 },
    { label: "发展规划：选择你的两项经历+1", doubleBox: false, boxCount: 1, stateIndex: 3 },
    { label: "技艺专精：选择一张等级小于或等于你干员等级的领域卡（最高为10级）", doubleBox: false, boxCount: 1, stateIndex: 4 },
    { label: "技艺交流：从你不具有的领域中选择一张等级小于或等于你干员等级一半的领域卡（最高为5级）", doubleBox: false, boxCount: 1, stateIndex: 8 },
    { label: "机动训练：闪避值+1", doubleBox: false, boxCount: 1, stateIndex: 5 },
    { label: "实战模拟：熟练值+1", doubleBox: true, boxCount: 2, stateIndex: 7 },
    { label: "所选模组：", doubleBox: false, boxCount: 1, stateIndex: 6 },
  ],
} as const;

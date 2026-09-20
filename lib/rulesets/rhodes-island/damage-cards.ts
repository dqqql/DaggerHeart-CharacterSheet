import type { StandardCard } from "@/card/card-types"

export const RHODES_DAMAGE_CARD_TYPE = "损伤卡"
export const RHODES_ELEMENTAL_DAMAGE_BRANCH_ID = "ri-branch-6fd52993b47f"

const DAMAGE_CARD_IDS = [
  "ri-damage-card-elemental-1",
  "ri-damage-card-elemental-2",
] as const

const DAMAGE_CARD_DESCRIPTIONS = [
  `**神经损伤：** 造成使用你攻击属性的d4点元素伤害，并迫使目标暂时处于眩晕状态。在眩晕期间，其无法使用反应，且在解除此状态之前无法进行任何其他动作。

**侵蚀损伤：** 造成使用你攻击属性的d4点元素伤害，并迫使目标暂时处于侵蚀状态。处于侵蚀状态的生物在计算伤害阈值时获得-5减值。

**凋亡损伤：** 造成使用你攻击属性的d6点元素伤害，并迫使目标暂时处于衰弱状态。处于衰弱状态的生物造成的伤害获得-10调整值。`,
  `**狂躁损伤：** 造成使用你攻击属性的d8点元素伤害，并迫使目标暂时处于冲动状态。处于冲动状态的生物将尽可能地对最近的目标进行攻击，且自身具有的隐藏类状态失效。

**灼燃损伤：** 造成使用你攻击属性的d8点元素伤害，并迫使目标暂时处于点燃状态。当一个生物在点燃状态下行动时，如果在其行动结束时仍处于点燃状态，则必须额外受到2d6点法术伤害。

**元素伤害：** 特殊伤害类型，和物理/法术伤害共同应用时，即使没有元素伤害抗性，物理/法术伤害抗性依然生效。`,
] as const

export function isRhodesDamageCard(card: StandardCard | null | undefined): boolean {
  return !!card && DAMAGE_CARD_IDS.includes(card.id as (typeof DAMAGE_CARD_IDS)[number])
}

export function createRhodesElementalDamageCards(): [StandardCard, StandardCard] {
  return DAMAGE_CARD_IDS.map((id, index) => ({
    standarized: true,
    ruleset: "rhodes-island" as const,
    id,
    name: `元素损伤 ${index + 1}/2`,
    type: RHODES_DAMAGE_CARD_TYPE,
    class: "本源铁卫",
    description: DAMAGE_CARD_DESCRIPTIONS[index],
    imageUrl: "/rhodes-island/domain-icons/bulwark.png",
    headerDisplay: "损伤卡",
    cardSelectDisplay: {
      item1: "本源铁卫",
      item2: "损伤规则",
    },
  })) as [StandardCard, StandardCard]
}

import type { StandardCard } from "@/card/card-types"
import type { RuleSetId, SheetData } from "@/lib/sheet-data"

export { RULE_SET_LABELS } from "@/lib/rulesets/registry"

export function isRhodesIsland(data: Pick<SheetData, "ruleSetId"> | undefined | null): boolean {
  return data?.ruleSetId === "rhodes-island"
}

export function getCardRuleSetId(card: StandardCard): RuleSetId {
  const taggedCard = card as StandardCard & { ruleSetId?: RuleSetId; ruleset?: RuleSetId }
  return taggedCard.ruleSetId === "rhodes-island" || taggedCard.ruleset === "rhodes-island"
    ? "rhodes-island"
    : "daggerheart"
}

export function cardBelongsToRuleSet(card: StandardCard, ruleSetId: RuleSetId): boolean {
  return getCardRuleSetId(card) === ruleSetId
}

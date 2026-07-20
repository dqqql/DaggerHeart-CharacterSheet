import type { StandardCard } from "@/card/card-types"
import { BUILTIN_BATCH_ID } from "@/card/stores/store-types"
import type { RuleSetId } from "@/lib/sheet-data"
import { cardBelongsToRuleSet } from "@/lib/ruleset"

export interface CardBatchOption {
  id: string
  name: string
  cardCount: number
}

type BatchCard = StandardCard & { batchId?: string }

export function getRuleSetBatchOptions(
  batches: CardBatchOption[],
  cards: BatchCard[],
  ruleSetId: RuleSetId,
): CardBatchOption[] {
  if (ruleSetId !== "rhodes-island") return batches

  const cardCount = cards.filter(card =>
    card.batchId === BUILTIN_BATCH_ID && cardBelongsToRuleSet(card, ruleSetId)
  ).length

  return [{
    id: BUILTIN_BATCH_ID,
    name: "内置卡牌包",
    cardCount,
  }]
}

import type { RuleSetId } from "@/lib/sheet-data"
import { getRuleSetModule } from "@/lib/rulesets/registry"
import type { BatchCard, CardBatchOption } from "@/lib/rulesets/types"

export type { BatchCard, CardBatchOption } from "@/lib/rulesets/types"

export function getRuleSetBatchOptions(
  batches: CardBatchOption[],
  cards: BatchCard[],
  ruleSetId: RuleSetId,
): CardBatchOption[] {
  return getRuleSetModule(ruleSetId).getBatchOptions(batches, cards)
}

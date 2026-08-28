import type { StandardCard } from "@/card/card-types"
import { getCardRuleSetId } from "@/lib/ruleset"

export function formatRhodesSubclassDomainRecommendation(
  card: StandardCard | null | undefined,
): string {
  const displayItem = card?.cardSelectDisplay?.item3?.trim() ?? ""
  if (!displayItem || card?.type !== "subclass" || getCardRuleSetId(card) !== "rhodes-island") {
    return displayItem
  }

  const domains = displayItem
    .replace(/^第二领域推荐：\s*/, "")
    .replace(/^推荐\s*/, "")
    .replace(/\s*\/\s*/g, "/")

  return domains ? `推荐${domains}` : ""
}

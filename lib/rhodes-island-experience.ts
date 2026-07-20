import { rhodesIslandCatalog } from "@/data/rhodes-island"
import type { SheetData } from "@/lib/sheet-data"

export type RhodesIslandRecommendedExperience = {
  name: string
  value: number
}

export function getRhodesIslandRecommendedExperiences(
  ancestryId: string | undefined,
): RhodesIslandRecommendedExperience[] {
  if (!ancestryId) return []

  const ancestry = rhodesIslandCatalog.ancestries.find((item) => item.id === ancestryId)
  return ancestry?.recommendedExperiences ?? []
}

/**
 * Export-only normalization for the Rhodes Island ruleset.
 *
 * The recommendation remains a placeholder while editing, so it must be
 * materialized into exported data without changing the player's saved sheet.
 */
export function withRhodesIslandDefaultAncestryExperience(sheetData: SheetData): SheetData {
  if (sheetData.ruleSetId !== "rhodes-island") return sheetData

  const currentExperience = sheetData.ancestryExperience?.[0]?.trim() ?? ""
  if (currentExperience) return sheetData

  const recommendation = getRhodesIslandRecommendedExperiences(sheetData.ancestry1Ref?.id)[0]
  if (!recommendation) return sheetData

  const currentValue = sheetData.ancestryExperienceValues?.[0]?.trim() ?? ""
  return {
    ...sheetData,
    ancestryExperience: [recommendation.name],
    ancestryExperienceValues: [currentValue || String(recommendation.value)],
  }
}

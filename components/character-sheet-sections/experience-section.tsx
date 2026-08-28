"use client"

import { useSheetStore } from "@/lib/sheet-store";
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import type { StandardCard } from "@/card/card-types"
import { getRhodesIslandRecommendedExperiences } from "@/lib/rulesets/rhodes-island/experience"

type RhodesIslandAncestryCard = StandardCard & {
  rhodesIsland?: {
    recommendedExperiences?: Array<{ name: string; value: number }>
  }
}

export function ExperienceSection() {
  const { sheetData: formData, setSheetData, updateExperience, updateExperienceValues } = useSheetStore();
  
  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10,
  })

  const experienceTexts = formData.experience || ["", "", "", "", ""]
  const experienceValues = formData.experienceValues || ["", "", "", "", ""]
  const ancestryExperience = formData.ancestryExperience?.[0] ?? ""
  const ancestryExperienceValue = formData.ancestryExperienceValues?.[0] ?? "2"
  const selectedAncestry = formData.cards?.find(
    (card) => card?.id === formData.ancestry1Ref?.id,
  ) as RhodesIslandAncestryCard | undefined
  const recommendedExperiences = selectedAncestry?.rhodesIsland?.recommendedExperiences
    ?? getRhodesIslandRecommendedExperiences(formData.ancestry1Ref?.id)
  const recommendedExperience = recommendedExperiences[0]
  const recommendedExperiencePlaceholder = recommendedExperiences.length > 0
    ? `推荐：${recommendedExperiences.map((item) => `${item.name} +${item.value}`).join(" / ")}`
    : "选择种族后显示推荐经历"

  return (
    <div className="py-1">
      {formData.ruleSetId === "rhodes-island" && (
        <div className="mb-2 border border-slate-300 bg-slate-50 p-1">
          <h3 className="mb-1 text-center text-[10px] font-bold text-slate-700">种族经历</h3>
          <div className="flex items-center">
            <input
              type="text"
              value={ancestryExperience}
              onChange={(event) => setSheetData({ ancestryExperience: [event.target.value] })}
              placeholder={recommendedExperiencePlaceholder}
              data-export-default-value={recommendedExperience?.name}
              className="flex-grow border-b border-slate-400 bg-transparent p-0.5 text-xs focus:outline-none print-empty-hide"
              aria-label="种族经历"
            />
            <input
              type="text"
              value={ancestryExperienceValue}
              onChange={(event) => setSheetData({ ancestryExperienceValues: [event.target.value] })}
              data-export-default-value={recommendedExperience ? String(recommendedExperience.value) : undefined}
              className="ml-1 w-8 border border-slate-400 bg-white text-center text-xs print-empty-hide"
              aria-label="种族经历加值"
            />
          </div>
        </div>
      )}
      <h3 className="text-xs font-bold text-center">经历</h3>

      <div className="space-y-1.5 print:space-y-1">
        {experienceTexts.map((exp: string, i: number) => (
          <div key={`exp-${i}`} className="flex items-center">
            <input
              type="text"
              value={exp}
              onChange={(e) => {
                updateExperience(i, e.target.value)
              }}
              {...getElementProps(exp, `exp-${i}`, "flex-grow border-b border-gray-400 p-1 focus:outline-none print-empty-hide")}
            />
            <input
              type="text"
              value={experienceValues[i]}
              onChange={(e) => {
                updateExperienceValues(i, e.target.value)
              }}
              {...getElementProps(experienceValues[i], `exp-value-${i}`, "w-8 border border-gray-400 rounded ml-1 text-center print-empty-hide")}
              placeholder="#"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

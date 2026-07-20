"use client"

import { useSheetStore } from "@/lib/sheet-store";
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import type { StandardCard } from "@/card/card-types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  const recommendedExperiences = selectedAncestry?.rhodesIsland?.recommendedExperiences ?? []

  return (
    <div className="py-1">
      {formData.ruleSetId === "rhodes-island" && (
        <div className="mb-2 border border-slate-300 bg-slate-50 p-1">
          <div className="mb-1 flex items-center justify-center gap-1">
            <h3 className="text-[10px] font-bold text-slate-700">种族经历</h3>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-500 text-[9px] font-bold leading-none text-slate-600 hover:border-cyan-700 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-700 print:hidden"
                    aria-label="查看推荐经历"
                  >
                    !
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64 text-xs">
                  {recommendedExperiences.length > 0 ? (
                    <div>
                      <div className="mb-1 font-semibold">推荐经历</div>
                      <div>{recommendedExperiences.map((item) => `${item.name} +${item.value}`).join("、")}</div>
                    </div>
                  ) : (
                    <span>选择种族后可查看推荐经历</span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center">
            <input
              type="text"
              value={ancestryExperience}
              onChange={(event) => setSheetData({ ancestryExperience: [event.target.value] })}
              className="flex-grow border-b border-slate-400 bg-transparent p-0.5 text-xs focus:outline-none print-empty-hide"
              aria-label="种族经历"
            />
            <input
              type="text"
              value={ancestryExperienceValue}
              onChange={(event) => setSheetData({ ancestryExperienceValues: [event.target.value] })}
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

"use client"

import { Textarea } from "@/components/ui/textarea"
import { rhodesIslandProfessionById } from "@/data/rhodes-island"
import { getRhodesIslandRelationshipPrompts } from "@/data/rhodes-island/relationship-questions"
import { useSafeSheetData, useSheetStore } from "@/lib/sheet-store"

type AnswerGroup = "backgroundQuestions" | "relationships"

const SECTION_COPY: Record<AnswerGroup, { title: string; eyebrow: string; helper: string }> = {
  backgroundQuestions: {
    title: "背景问题",
    eyebrow: "PERSONNEL PROFILE",
    helper: "回答下列任意问题，也可以将回答作为灵感记录。",
  },
  relationships: {
    title: "关系",
    eyebrow: "SQUAD CONNECTION",
    helper: "询问同伴玩家，让其角色回答；也可以共同创作新的关系。",
  },
}

export default function CharacterSheetPageRhodesRelationships() {
  const formData = useSafeSheetData()
  const setSheetData = useSheetStore((state) => state.setSheetData)
  const professionId = formData.professionRef?.id || formData.profession || ""
  const professionName =
    rhodesIslandProfessionById.get(professionId)?.name ||
    formData.professionRef?.name ||
    ""
  const prompts = getRhodesIslandRelationshipPrompts(professionName)
  const answers = formData.rhodesIslandRelationshipAnswers?.[professionId]

  const updateAnswer = (group: AnswerGroup, index: number, value: string) => {
    if (!professionId) return

    setSheetData((previous) => {
      const existingProfessionAnswers =
        previous.rhodesIslandRelationshipAnswers?.[professionId]
      const nextAnswers = [...(existingProfessionAnswers?.[group] || [])]
      nextAnswers[index] = value

      return {
        rhodesIslandRelationshipAnswers: {
          ...(previous.rhodesIslandRelationshipAnswers || {}),
          [professionId]: {
            backgroundQuestions:
              existingProfessionAnswers?.backgroundQuestions || [],
            relationships: existingProfessionAnswers?.relationships || [],
            [group]: nextAnswers,
          },
        },
      }
    })
  }

  const renderSection = (group: AnswerGroup, questions: readonly string[]) => {
    const copy = SECTION_COPY[group]
    return (
      <section
        aria-labelledby={`rhodes-${group}-heading`}
        className="flex min-h-0 flex-col border border-slate-400 bg-white/70"
      >
        <div className="border-b border-slate-400 bg-slate-800 px-3 py-2 text-white">
          <div className="text-[8px] font-bold tracking-[0.18em] text-cyan-300">
            {copy.eyebrow}
          </div>
          <h2 id={`rhodes-${group}-heading`} className="mt-0.5 text-[16px] font-bold">
            {copy.title}
          </h2>
          <p className="mt-0.5 text-[9px] leading-relaxed text-slate-200">
            {copy.helper}
          </p>
        </div>

        <div className="grid flex-1 grid-rows-3 gap-2 p-2">
          {questions.map((question, index) => {
            const inputId = `rhodes-${group}-${index}`
            return (
              <div
                key={question}
                className="flex min-h-0 flex-col border border-slate-300 bg-slate-50/80 p-2"
              >
                <label
                  htmlFor={inputId}
                  className="mb-1.5 flex min-h-[36px] items-start gap-2 text-[11px] font-semibold leading-[1.45] text-slate-800"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center bg-slate-800 text-[9px] font-bold text-cyan-300"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{question}</span>
                </label>
                <Textarea
                  id={inputId}
                  value={answers?.[group]?.[index] || ""}
                  onChange={(event) => updateAnswer(group, index, event.target.value)}
                  placeholder="在此填写回答……"
                  className="min-h-[40mm] flex-1 resize-none border-slate-400 bg-white text-[11px] leading-[1.5] focus-visible:ring-cyan-500 print:bg-white"
                />
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div className="w-full max-w-[210mm] mx-auto">
      <div
        data-ri-sheet-page="relationships"
        className="a4-page min-h-[297mm] p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
        style={{ width: "210mm" }}
      >
        <header className="mb-2 flex items-center justify-between border-l-[6px] border-cyan-400 bg-slate-900 px-4 py-3 text-white">
          <div>
            <div className="text-[8px] font-bold tracking-[0.22em] text-cyan-300">
              RHODES ISLAND // PERSONNEL RECORD
            </div>
            <h1 className="mt-1 text-[20px] font-bold tracking-wide">关系与问题</h1>
          </div>
          <div className="border border-white/30 px-3 py-1.5 text-right">
            <div className="text-[8px] tracking-[0.16em] text-slate-300">PROFESSION</div>
            <div className="mt-0.5 min-w-[70px] text-[13px] font-bold">
              {professionName || "未选择职业"}
            </div>
          </div>
        </header>

        {prompts ? (
          <div data-ri-relationships-grid className="grid min-h-[263mm] grid-cols-2 gap-2">
            {renderSection("backgroundQuestions", prompts.backgroundQuestions)}
            {renderSection("relationships", prompts.relationships)}
          </div>
        ) : (
          <div
            className="flex min-h-[250mm] items-start justify-center border border-dashed border-slate-400 bg-slate-50 px-8 text-center"
            style={{ paddingTop: "50mm" }}
          >
            <div>
              <div className="text-[16px] font-bold text-slate-700">尚未选择罗德岛职业</div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                请先在第一页选择职业；对应的背景问题与关系问题会自动显示在这里。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

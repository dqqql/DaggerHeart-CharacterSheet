"use client"

import { useSheetStore } from "@/lib/sheet-store";
import { StandardCard } from "@/card/card-types";
import ReactMarkdown from 'react-markdown';
import { highlightTextChanges } from "@/lib/text-change-highlighter";
import { getRuleSetModule } from "@/lib/rulesets/registry";

export function HopeSection() {
  const { sheetData: formData, updateHope, setSheetData } = useSheetStore();
  const ruleSet = getRuleSetModule(formData.ruleSetId)

  // 获取当前值和最大值
  const currentHope = typeof formData.hope === 'number' ? formData.hope : 0
  const hopeMax = formData.hopeMax || 6

  const handleCheckboxChange = (index: number) => {
    updateHope(index);
  };

  // 增加希望上限
  const handleIncreaseMax = () => {
    if (hopeMax < 8) {
      setSheetData((prev) => ({ ...prev, hopeMax: hopeMax + 1 }))
    }
  }

  // 减少希望上限
  const handleDecreaseMax = () => {
    if (hopeMax > 1) {
      const newMax = hopeMax - 1
      setSheetData((prev) => {
        const newSheetData = { ...prev, hopeMax: newMax }

        // 如果当前希望值超过新的最大值，调整为最大值
        if (currentHope > newMax) {
          newSheetData.hope = newMax
        }

        return newSheetData
      })
    }
  }

  // 获取希望特性
  let cardHopeTrait = ""
  let professionCard: StandardCard | undefined
  if (formData && formData.professionRef?.id && formData.cards && Array.isArray(formData.cards)) {
    professionCard = formData.cards.find(
      (card: StandardCard | null) => card && card.id === formData.professionRef?.id && card.type === "profession"
    ) as StandardCard | undefined;
    if (professionCard && professionCard.professionSpecial && professionCard.professionSpecial["希望特性"]) {
      cardHopeTrait = String(professionCard.professionSpecial["希望特性"])
    }
  }
  const baseHopeTrait = ruleSet.getProfessionHopeFeature(formData.professionRef?.id)
  const hopeTrait = baseHopeTrait || cardHopeTrait
  const highlightedHopeTrait = !!baseHopeTrait
    && formData.selectedModule === "x"
    && cardHopeTrait !== baseHopeTrait
    ? highlightTextChanges(baseHopeTrait, cardHopeTrait)
    : null

  return (
    <div className="py-1 mb-1 group">
      <div className="flex items-center justify-center gap-2 mb-2">
        <h3 className="text-xs font-bold">希望点</h3>
      </div>

      <div className="text-[12px] text-center mb-1">花费 1 希望点使用经历或帮助队友</div>

      <div className="relative flex justify-center items-center mb-2">
        {/* 希望格子容器 - 绝对居中 */}
        <div className="flex gap-2 justify-center">
          {Array(Math.max(hopeMax, 6)).fill(0).map((_, i) => {
            const isWithinMax = i < hopeMax
            const isLit = i < currentHope
            const isDashed = !isWithinMax && i < 6 // 超出上限但在默认6个以内

            return (
              <div
                key={`hope-${i}`}
                className="relative"
                onClick={() => isWithinMax && handleCheckboxChange(i)}
              >
                <div
                  className={`w-5 h-5 border-2 transform rotate-45 ${
                    isDashed
                      ? 'border-dashed border-gray-400'
                      : 'border-gray-800 cursor-pointer'
                  }`}
                ></div>
                {isLit && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 bg-gray-800 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 上限调整控制区 - 绝对定位在右侧，不影响格子居中 */}
        <div className="absolute right-0 flex items-center gap-0.5 print:hidden">
          {/* PC端：默认显示三点提示，悬停时隐藏 */}
          <span className="hidden sm:block opacity-20 group-hover:opacity-0 transition-opacity duration-200 text-gray-600 text-xs pointer-events-none">
            ⋮
          </span>

          {/* PC端：悬停时显示按钮，默认隐藏 */}
          {/* 移动端：始终显示但颜色较淡 */}
          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleDecreaseMax}
              disabled={hopeMax <= 1}
              className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
              title="减少希望上限"
            >
              −
            </button>
            <button
              onClick={handleIncreaseMax}
              disabled={hopeMax >= 8}
              className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
              title="增加希望上限"
            >
              ＋
            </button>
          </div>
        </div>
      </div>

      <div className="text-center px-2">
        <div className="text-[12px] leading-tight min-h-[30px]">
          {highlightedHopeTrait ? (
            <p className="whitespace-pre-wrap" aria-label="X 模组修改后的希望特性；绿色文字为新增或修改内容">
              {highlightedHopeTrait.map((segment, index) => segment.changed ? (
                <mark
                  key={`${index}-${segment.text}`}
                  className="bg-transparent font-medium text-emerald-600"
                >
                  {segment.text}
                </mark>
              ) : (
                <span key={`${index}-${segment.text}`}>{segment.text}</span>
              ))}
            </p>
          ) : (
            <ReactMarkdown>{hopeTrait}</ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}

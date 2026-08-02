"use client"

import type React from "react"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import { useCardPreview } from "@/hooks/use-card-preview"
import { CardHoverPreview } from "@/components/ui/card-hover-preview"
import { useSheetStore } from "@/lib/sheet-store"
import { useTextModeStore } from "@/lib/text-mode-store"
import { getDisplayedCharacterCards } from "@/lib/ancestry-utils"
import {
  DualDomainAnimation,
  getRhodesProfessionDomain,
} from "@/components/rhodes-island/domain-icon"
import type { RhodesSecondaryDomainName } from "@/lib/sheet-data"
import {
  getRhodesSecondaryDomainSelectionOptions,
} from "@/lib/rhodes-domain-filter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderSectionProps {
  onOpenProfessionModal: () => void;
  onOpenAncestryModal: (field: string) => void;
  onOpenCommunityModal: () => void;
  onOpenSubclassModal: () => void;
  onToggleMixedAncestry: (enabled: boolean) => void;
  professionAnimationReplayKey?: number;
}

export function HeaderSection({
  onOpenProfessionModal,
  onOpenAncestryModal,
  onOpenCommunityModal,
  onOpenSubclassModal,
  onToggleMixedAncestry,
  professionAnimationReplayKey = 0,
}: HeaderSectionProps) {
  const { sheetData: formData, setSheetData, updateLevel } = useSheetStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [editingStartLevel, setEditingStartLevel] = useState<string | null>(null)
  const [secondaryDomainReplayKey, setSecondaryDomainReplayKey] = useState(0)
  const isRhodesIsland = formData.ruleSetId === "rhodes-island"
  const isTextMode = useTextModeStore((state) => state.isTextMode)
  const professionDomain = isRhodesIsland
    ? getRhodesProfessionDomain(formData.professionRef?.id, formData.professionRef?.name)
    : undefined
  const secondaryDomainOptions = useMemo(
    () => getRhodesSecondaryDomainSelectionOptions(professionDomain),
    [professionDomain],
  )

  useEffect(() => {
    if (
      professionDomain
      && formData.rhodesSecondaryDomain === professionDomain
    ) {
      setSheetData({ rhodesSecondaryDomain: undefined })
    }
  }, [formData.rhodesSecondaryDomain, professionDomain, setSheetData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'level') {
      // 只允许空字符串或 1-10 的数字
      if (value === '' || /^([1-9]|10)$/.test(value)) {
        setSheetData((prev) => ({ ...prev, level: value }))
      }
      // 非法输入直接忽略
    } else {
      setSheetData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleLevelFocus = () => {
    // 记录编辑开始时的等级（空视为"1"）
    setEditingStartLevel(formData.level || "1")
  }

  const handleLevelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()  // 触发失焦
    }
  }

  const handleLevelBlur = () => {
    // 编辑完成，获取起始和结束等级
    const startLevel = editingStartLevel || "1"
    const endLevel = formData.level  // 保留原始值（可能是空）

    // 用于比较的数值（空视为1级）
    const oldLevelNum = parseInt(startLevel)
    const newLevelNum = parseInt(endLevel || "1")

    // 如果等级真的发生了变化，触发完整的等级更新逻辑
    if (oldLevelNum !== newLevelNum) {
      updateLevel(endLevel, startLevel)
    }

    // 清除编辑状态
    setEditingStartLevel(null)
  }

  const openProfessionModal = () => {
    onOpenProfessionModal()
  }

  const openAncestryModal = (field: string) => {
    onOpenAncestryModal(field)
  }

  const openCommunityModal = () => {
    onOpenCommunityModal()
  }

  const openSubclassModal = () => {
    onOpenSubclassModal()
  }

  const selectSecondaryDomain = (domain: RhodesSecondaryDomainName) => {
    setSheetData({ rhodesSecondaryDomain: domain })
    setSecondaryDomainReplayKey((current) => current + 1)
  }

  const startEditingName = (field: string, currentValue: string) => {
    setEditingField(field)
    setEditingValue(currentValue || "")
  }

  const saveEditingName = () => {
    if (editingField) {
      setSheetData((prev) => ({
        ...prev,
        [editingField]: {
          ...(prev as any)[editingField],
          name: editingValue
        }
      }))
      setEditingField(null)
      setEditingValue("")
    }
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditingValue("")
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEditingName()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  const displayCards = useMemo(() => getDisplayedCharacterCards(formData), [formData])
  const ancestryCard1 = formData.cards?.[2]
  const ancestryDisplayName1 = formData.mixedAncestryEnabled
    ? formData.ancestry1Ref?.name
    : ancestryCard1?.class || ""
  const ancestryDisplayName2 = formData.mixedAncestryEnabled
    ? formData.ancestry2Ref?.name
    : ""

  const {
    hoveredCard,
    previewPosition,
    handleMouseEnter,
    handleMouseLeave
  } = useCardPreview({
    cards: displayCards,
    containerRef,
    previewWidth: isTextMode ? 300 : 520,
    previewHeight: isTextMode ? 400 : 340,
  })

  return (
    <div
      ref={containerRef}
      className="relative z-20 flex items-start justify-between rounded-t-md bg-gray-800 p-2 text-white"
    >
      <div className="flex h-[90px] w-56 flex-col">
        <label className="text-[9px] text-gray-300">职业</label>
        <div className="flex items-center gap-2">
          {editingField === 'professionRef' ? (
            <input
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={saveEditingName}
              className="w-56 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <div
              className="group flex w-56 border border-gray-400 rounded h-7 bg-white overflow-hidden"
              onMouseEnter={(e) => handleMouseEnter(formData.professionRef, e.currentTarget)}
              onMouseLeave={handleMouseLeave}
            >
                <button
                  type="button"
                  onClick={openProfessionModal}
                  className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
                >
                  {formData.professionRef?.name || <span className="print:hidden">选择职业</span>}
                </button>
              {formData.professionRef?.name && (
                <>
                  <div className="w-px bg-gray-300 opacity-0 group-hover:opacity-100"></div>
                  <button
                    type="button"
                    onClick={() => startEditingName('professionRef', formData.professionRef?.name || '')}
                    className="w-8 flex items-center justify-center hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                    title="编辑名称"
                  >
                    <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {isRhodesIsland && (
          <div className="mt-1 flex min-h-0 flex-1 print:hidden">
            <DualDomainAnimation
              professionId={formData.professionRef?.id}
              professionName={formData.professionRef?.name}
              replayKey={professionAnimationReplayKey}
              secondaryDomain={formData.rhodesSecondaryDomain !== professionDomain
                ? formData.rhodesSecondaryDomain
                : undefined}
              secondaryReplayKey={secondaryDomainReplayKey}
            />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-2">
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">名称</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              {...getElementProps(formData.name, 'character-name')}
              className="bg-white text-gray-800 border border-gray-400 rounded p-1 focus:outline-none w-40 print-empty-hide"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">社群</label>
            {editingField === 'communityRef' ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={saveEditingName}
                className="w-40 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <div
                className="group flex w-40 border border-gray-400 rounded h-7 bg-white overflow-hidden"
                onMouseEnter={(e) => handleMouseEnter(formData.communityRef, e.currentTarget)}
                onMouseLeave={handleMouseLeave}
              >
                  <button
                    type="button"
                    onClick={openCommunityModal}
                    className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
                  >
                    {formData.communityRef?.name || <span className="print:hidden">选择社群</span>}
                  </button>
                {formData.communityRef?.name && (
                  <>
                    <div className="w-px bg-gray-300 opacity-0 group-hover:opacity-100"></div>
                    <button
                      type="button"
                      onClick={() => startEditingName('communityRef', formData.communityRef?.name || '')}
                      className="w-8 flex items-center justify-center hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                      title="编辑名称"
                    >
                      <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-gray-300">种族</label>
              <label className={`${isRhodesIsland ? "hidden" : "flex"} items-center gap-1 text-[9px] text-gray-200 print:hidden`}>
                <input
                  type="checkbox"
                  checked={!!formData.mixedAncestryEnabled}
                  onChange={(e) => onToggleMixedAncestry(e.target.checked)}
                  className="h-3 w-3 rounded border-gray-300 text-gray-800"
                />
                <span>混血</span>
              </label>
            </div>
            <div className="flex gap-1">
              {editingField === 'ancestry1Ref' ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEditingName}
                  className="w-20 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              ) : (
                  <div
                    className="group relative flex w-24 border border-gray-400 rounded h-7 bg-white overflow-hidden"
                    onMouseEnter={(e) => handleMouseEnter(formData.ancestry1Ref, e.currentTarget)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => openAncestryModal("ancestry1")}
                      className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none truncate"
                    >
                      {ancestryDisplayName1 || <span className="print:hidden">选择种族</span>}
                    </button>
                    {formData.mixedAncestryEnabled && formData.ancestry1Ref?.name && (
                      <button
                        type="button"
                        onClick={() => startEditingName('ancestry1Ref', formData.ancestry1Ref?.name || '')}
                        className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-white hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity border-l border-gray-300"
                        title="编辑名称"
                      >
                        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                        </svg>
                      </button>
                  )}
                </div>
              )}
              <span className={`${isRhodesIsland ? "hidden" : "flex"} items-center text-white text-xs`}>+</span>
              {editingField === 'ancestry2Ref' ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEditingName}
                  className={`${isRhodesIsland ? "hidden" : ""} w-24 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500`}
                  autoFocus
                />
              ) : (
                  <div
                    className={`group relative ${isRhodesIsland ? "hidden" : "flex"} w-24 border border-gray-400 rounded h-7 bg-white overflow-hidden ${
                      formData.mixedAncestryEnabled ? "" : "opacity-60"
                    }`}
                    onMouseEnter={(e) => {
                      if (formData.mixedAncestryEnabled) {
                        handleMouseEnter(formData.ancestry2Ref, e.currentTarget)
                      }
                    }}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      type="button"
                      disabled={!formData.mixedAncestryEnabled}
                      onClick={() => openAncestryModal("ancestry2")}
                      className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none truncate disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                      title={formData.mixedAncestryEnabled ? undefined : "未开启混血时，此槽位会自动补全"}
                    >
                      {ancestryDisplayName2 || (
                        <span className="print:hidden">
                          {formData.mixedAncestryEnabled ? "选择种族" : ""}
                        </span>
                      )}
                    </button>
                    {formData.mixedAncestryEnabled && formData.ancestry2Ref?.name && (
                      <button
                        type="button"
                        disabled={!formData.mixedAncestryEnabled}
                        onClick={() => startEditingName('ancestry2Ref', formData.ancestry2Ref?.name || '')}
                        className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-white hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity border-l border-gray-300 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-0"
                        title="编辑名称"
                      >
                        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                        </svg>
                      </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">{isRhodesIsland ? "分支" : "子职业"}</label>
            {editingField === 'subclassRef' ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={saveEditingName}
                className="w-40 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <div className="group flex w-40 border border-gray-400 rounded h-7 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={openSubclassModal}
                    onMouseEnter={(e) => handleMouseEnter(formData.subclassRef, e.currentTarget)}
                    onMouseLeave={handleMouseLeave}
                    className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
                  >
                    {formData.subclassRef?.name || <span className="print:hidden">{isRhodesIsland ? "选择分支" : "选择子职业"}</span>}
                  </button>
                {formData.subclassRef?.name && (
                  <>
                    <div className="w-px bg-gray-300 opacity-0 group-hover:opacity-100"></div>
                    <button
                      type="button"
                      onClick={() => startEditingName('subclassRef', formData.subclassRef?.name || '')}
                      className="w-8 flex items-center justify-center hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                      title="编辑名称"
                    >
                      <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {isRhodesIsland && (
            <div className="flex flex-col print:hidden">
              <label className="text-[9px] text-gray-300">次选领域</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="次选领域"
                    className="h-7 w-24 rounded border border-gray-400 bg-white px-2 text-left text-xs text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate">{formData.rhodesSecondaryDomain || "次选领域"}</span>
                      <span aria-hidden="true" className="text-[9px] text-gray-500">▼</span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-24">
                  {secondaryDomainOptions.map((option) => {
                    const domain = option.value as RhodesSecondaryDomainName
                    return (
                      <Fragment key={domain}>
                        {option.separatorBefore && (
                          <div
                            role="separator"
                            aria-label={option.separatorBefore}
                            className="flex items-center gap-1 px-1 py-1 text-[9px] text-muted-foreground"
                          >
                            <span className="h-px flex-1 bg-border" />
                            <span>{option.separatorBefore}</span>
                            <span className="h-px flex-1 bg-border" />
                          </div>
                        )}
                        <DropdownMenuItem
                          onSelect={() => selectSecondaryDomain(domain)}
                          className="text-xs"
                        >
                          <span className="w-3" aria-hidden="true">
                            {formData.rhodesSecondaryDomain === domain ? "✓" : ""}
                          </span>
                          {domain}
                        </DropdownMenuItem>
                      </Fragment>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-white text-gray-800 rounded-md border-4 border-gray-600 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs font-bold">LEVEL</div>
            <input
              type="text"
              name="level"
              value={formData.level}
              placeholder="1"
              onChange={handleInputChange}
              onFocus={handleLevelFocus}
              onBlur={handleLevelBlur}
              onKeyDown={handleLevelKeyDown}
              className="w-8 text-center border-b border-gray-400 focus:outline-none text-xl font-bold print-empty-hide"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const oldLevel = formData.level || ""

            // 如果当前等级为空或无效，升到1级
            if (!formData.level || formData.level.trim() === "") {
              updateLevel("1", oldLevel)
              return
            }

            const currentLevel = parseInt(formData.level)
            // 如果当前等级大于等于10，不再升级
            if (currentLevel >= 10) {
              return
            }

            // 否则加1，最大为10
            const newLevel = Math.min(currentLevel + 1, 10)
            updateLevel(String(newLevel), oldLevel)
          }}
          className="mt-1 px-2 py-0.5 bg-gray-600 hover:bg-gray-500 text-white text-[10px] font-bold rounded print:hidden transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
          disabled={parseInt(formData.level) >= 10}
        >
          Level Up!
        </button>
      </div>

      {/* 卡牌悬停预览 */}
      {hoveredCard && typeof document !== "undefined" && createPortal(
        <div className="pointer-events-none z-[100]" style={previewPosition}>
          <CardHoverPreview card={hoveredCard} isTextMode={isTextMode} />
        </div>,
        document.body,
      )}
    </div>
  )
}

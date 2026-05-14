"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type React from "react"
import { ArrowLeft, FileJson, LayoutGrid, Settings2, Table2, Upload, UploadCloud, X } from "lucide-react"

import type { StandardCard } from "@/card/card-types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { importCharacterDataForMultiCharacter } from "@/lib/storage"
import type { AttributeValue, SheetData } from "@/lib/sheet-data"
import { cn, navigateToPage } from "@/lib/utils"

type PanelMode = "brief" | "full"
type FullSectionKey =
  | "core"
  | "attributes"
  | "resources"
  | "equipment"
  | "experience"
  | "text"
  | "characterCards"
  | "domainCards"
  | "inventoryCards"
  | "companion"

interface PlayerEntry {
  id: string
  fileName: string
  data: SheetData
}

type AttributeKey = "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"
type BooleanArrayField = "hp" | "stress" | "armorBoxes" | "gold" | "companionStress"

const ATTRIBUTES: Array<{ key: AttributeKey; label: string }> = [
  { key: "agility", label: "敏捷" },
  { key: "strength", label: "力量" },
  { key: "finesse", label: "灵巧" },
  { key: "instinct", label: "本能" },
  { key: "presence", label: "风度" },
  { key: "knowledge", label: "知识" },
]

const CORE_FIELDS: Array<{ key: keyof SheetData; label: string }> = [
  { key: "name", label: "角色名" },
  { key: "level", label: "等级" },
  { key: "evasion", label: "闪避" },
  { key: "armorValue", label: "护甲值" },
  { key: "minorThreshold", label: "重伤阈值" },
  { key: "majorThreshold", label: "严重阈值" },
]

const SUMMARY_FIELDS: Array<{ key: keyof SheetData; label: string }> = [
  { key: "evasion", label: "闪避" },
  { key: "armorValue", label: "护甲" },
  { key: "minorThreshold", label: "重伤" },
  { key: "majorThreshold", label: "严重" },
]

const TEXT_AREA_FIELDS: Array<{ key: keyof SheetData; label: string }> = [
  { key: "characterBackground", label: "背景" },
  { key: "characterAppearance", label: "外貌" },
  { key: "characterMotivation", label: "动机" },
  { key: "companionDescription", label: "伙伴描述" },
]

const FULL_SECTION_OPTIONS: Array<{ key: FullSectionKey; label: string }> = [
  { key: "core", label: "基础数值" },
  { key: "attributes", label: "属性" },
  { key: "resources", label: "资源" },
  { key: "equipment", label: "武器与护甲" },
  { key: "experience", label: "经验与物品" },
  { key: "text", label: "文字信息" },
  { key: "characterCards", label: "角色卡" },
  { key: "domainCards", label: "领域卡" },
  { key: "inventoryCards", label: "库存卡" },
  { key: "companion", label: "伙伴" },
]

const DEFAULT_FULL_SECTIONS: FullSectionKey[] = ["core", "attributes", "resources"]

function getTextValue(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function getAttributeValue(data: SheetData, key: AttributeKey): AttributeValue {
  const value = data[key]
  if (value && typeof value === "object" && "value" in value && "checked" in value) {
    return value as AttributeValue
  }
  return { value: "", checked: false, spellcasting: false }
}

function checkedCount(values: unknown): number {
  return Array.isArray(values) ? values.filter(Boolean).length : 0
}

function getBooleanArray(values: unknown, length: number): boolean[] {
  const source = Array.isArray(values) ? values : []
  return Array.from({ length }, (_, index) => Boolean(source[index]))
}

function getCheckedWithinLimit(values: unknown, limit: number): number {
  return getBooleanArray(values, limit).filter(Boolean).length
}

function getPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed)
    }
  }

  return null
}

function getResourceLimits(data: SheetData) {
  const hpMax = getPositiveNumber(data.hpMax) ?? Math.max(1, Array.isArray(data.hp) ? data.hp.length : 6)
  const stressMax = getPositiveNumber(data.stressMax) ?? Math.max(1, Array.isArray(data.stress) ? data.stress.length : 6)
  const hopeMax = getPositiveNumber(data.hopeMax) ?? 6
  const armorMax =
    getPositiveNumber(data.armorValue) ??
    getPositiveNumber(data.armorMax) ??
    Math.max(1, Array.isArray(data.armorBoxes) ? data.armorBoxes.length : 12)
  const goldMax = Math.max(1, Array.isArray(data.gold) ? data.gold.length : 21)

  return { hpMax, stressMax, hopeMax, armorMax, goldMax }
}

function getProficiencyArray(value: SheetData["proficiency"]): boolean[] {
  if (Array.isArray(value)) {
    return Array.from({ length: 6 }, (_, index) => Boolean(value[index]))
  }

  const count = typeof value === "number" ? value : 0
  return Array.from({ length: 6 }, (_, index) => index < count)
}

function getCharacterClassLine(data: SheetData): string {
  return [
    data.professionRef?.name,
    data.subclassRef?.name,
    data.ancestry1Ref?.name,
    data.ancestry2Ref?.name,
    data.communityRef?.name,
  ]
    .filter(Boolean)
    .join(" / ")
}

function getVisibleCards(cards: StandardCard[] | undefined): Array<{ card: StandardCard; index: number }> {
  return (cards || [])
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => Boolean(card?.name))
}

function getCardTypeLabel(type: string | undefined): string {
  switch (type) {
    case "profession":
      return "职业"
    case "ancestry":
      return "种族"
    case "community":
      return "社群"
    case "subclass":
      return "子职业"
    case "domain":
      return "领域"
    default:
      return type || "卡牌"
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div className="h-px flex-1 bg-gray-200" />
      <h2 className="text-xs font-bold tracking-wide text-gray-700">{children}</h2>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  )
}

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let index = 0

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0
    const token = match[0]

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${index}`} className="font-bold text-gray-950">
          {token.slice(2, -2)}
        </strong>,
      )
    } else {
      nodes.push(
        <em key={`${keyPrefix}-em-${index}`} className="italic text-gray-800">
          {token.slice(1, -1)}
        </em>,
      )
    }

    lastIndex = start + token.length
    index += 1
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function BasicMarkdownPreview({ value }: { value: string }) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed text-gray-800">
      {trimmed.split(/\r?\n/).map((line, index) => {
        const heading = line.match(/^(#{1,3})\s+(.+)$/)
        if (heading) {
          const level = heading[1].length
          const className = cn(
            "mb-1 font-bold text-gray-950",
            level === 1 && "text-base",
            level === 2 && "text-[15px]",
            level === 3 && "text-sm",
          )
          return (
            <div key={`line-${index}`} className={className}>
              {renderInlineMarkdown(heading[2], `heading-${index}`)}
            </div>
          )
        }

        const quote = line.match(/^>\s?(.*)$/)
        if (quote) {
          return (
            <blockquote key={`line-${index}`} className="my-1 border-l-2 border-gray-400 pl-2 text-gray-600">
              {renderInlineMarkdown(quote[1], `quote-${index}`)}
            </blockquote>
          )
        }

        if (!line.trim()) {
          return <div key={`line-${index}`} className="h-2" />
        }

        return (
          <p key={`line-${index}`} className="my-1">
            {renderInlineMarkdown(line, `line-${index}`)}
          </p>
        )
      })}
    </div>
  )
}

function AutoResizeTextarea({
  value,
  onChange,
  className,
  minHeight = 112,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  minHeight?: number
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = "auto"
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`
  }, [minHeight, value])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      rows={1}
      className={cn("overflow-hidden", className)}
      {...props}
    />
  )
}

function TextField({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  compact?: boolean
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold text-gray-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full rounded-md border border-gray-300 bg-white px-2 text-gray-900 outline-none transition focus:border-gray-800",
          compact ? "h-9 text-sm" : "h-11 text-base",
        )}
      />
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-gray-600">{label}</span>
      <AutoResizeTextarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minHeight={112}
        className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 outline-none transition focus:border-gray-800"
      />
      <BasicMarkdownPreview value={value} />
    </label>
  )
}

function DotTrack({
  label,
  values,
  length,
  shape = "square",
  onToggle,
}: {
  label: string
  values: boolean[]
  length: number
  shape?: "square" | "round" | "diamond"
  onToggle: (index: number) => void
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold text-gray-600">
        {label} <span className="font-normal text-gray-400">{checkedCount(values)}/{length}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length }, (_, index) => (
          <button
            key={`${label}-${index}`}
            type="button"
            onClick={() => onToggle(index)}
            className={cn(
              "h-4 w-4 border-2 border-gray-800 bg-white transition hover:bg-gray-100",
              values[index] && "bg-gray-800 hover:bg-gray-800",
              shape === "round" && "rounded-full",
              shape === "diamond" && "rotate-45",
            )}
            aria-label={`${label} ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

function HopeTrack({
  value,
  max,
  onChange,
}: {
  value: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold text-gray-600">
        希望 <span className="font-normal text-gray-400">{value}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: max }, (_, index) => {
          const checked = index < value
          return (
            <button
              key={`hope-${index}`}
              type="button"
              onClick={() => onChange(value === index + 1 ? index : index + 1)}
              className="relative h-4 w-4 rotate-45 border-2 border-gray-800 bg-white"
              aria-label={`希望 ${index + 1}`}
            >
              {checked && <span className="absolute inset-0.5 bg-gray-800" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MiniTrack({
  values,
  length,
  onToggle,
  shape = "square",
}: {
  values: boolean[]
  length: number
  onToggle: (index: number) => void
  shape?: "square" | "round"
}) {
  return (
    <div className="flex max-w-[9.5rem] flex-wrap justify-center gap-0.5">
      {Array.from({ length }, (_, index) => (
        <button
          key={`mini-${index}`}
          type="button"
          onClick={() => onToggle(index)}
          className={cn(
            "h-3 w-3 border border-gray-800 bg-white hover:bg-gray-100",
            values[index] && "bg-gray-800 hover:bg-gray-800",
            shape === "round" && "rounded-full",
          )}
          aria-label={`标记 ${index + 1}`}
        />
      ))}
    </div>
  )
}

function BriefWeaponCell({
  player,
  playerIndex,
  prefix,
  setField,
}: {
  player: PlayerEntry
  playerIndex: number
  prefix: "primaryWeapon" | "secondaryWeapon"
  setField: (playerIndex: number, key: keyof SheetData, value: unknown) => void
}) {
  return (
    <div className="grid gap-1">
      <input
        value={getTextValue(player.data[`${prefix}Name` as keyof SheetData])}
        onChange={(event) => setField(playerIndex, `${prefix}Name` as keyof SheetData, event.target.value)}
        className="h-7 rounded border border-gray-300 px-2 text-xs font-semibold outline-none focus:border-gray-800"
        placeholder="名称"
      />
      <input
        value={getTextValue(player.data[`${prefix}Trait` as keyof SheetData])}
        onChange={(event) => setField(playerIndex, `${prefix}Trait` as keyof SheetData, event.target.value)}
        className="h-7 rounded border border-gray-300 px-2 text-xs outline-none focus:border-gray-800"
        placeholder="属性/范围"
      />
      <input
        value={getTextValue(player.data[`${prefix}Damage` as keyof SheetData])}
        onChange={(event) => setField(playerIndex, `${prefix}Damage` as keyof SheetData, event.target.value)}
        className="h-7 rounded border border-gray-300 px-2 text-xs outline-none focus:border-gray-800"
        placeholder="伤害"
      />
    </div>
  )
}

export default function GmPanelPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<PanelMode>("brief")
  const [players, setPlayers] = useState<PlayerEntry[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [importMessage, setImportMessage] = useState("")
  const [visibleFullSections, setVisibleFullSections] = useState<FullSectionKey[]>(DEFAULT_FULL_SECTIONS)

  const totalFilesLabel = useMemo(() => {
    if (players.length === 0) return "尚未导入角色"
    return `已导入 ${players.length} 份角色 JSON`
  }, [players.length])

  const updatePlayer = (playerIndex: number, updater: (data: SheetData) => SheetData) => {
    setPlayers((current) =>
      current.map((entry, index) =>
        index === playerIndex ? { ...entry, data: updater(entry.data) } : entry,
      ),
    )
  }

  const setField = (playerIndex: number, key: keyof SheetData, value: unknown) => {
    updatePlayer(playerIndex, (data) => ({ ...data, [key]: value }))
  }

  const setCardField = (
    playerIndex: number,
    collection: "cards" | "inventory_cards",
    cardIndex: number,
    key: "name" | "description",
    value: string,
  ) => {
    updatePlayer(playerIndex, (data) => {
      const cards = [...(data[collection] || [])]
      const card = cards[cardIndex]
      if (!card) return data

      cards[cardIndex] = { ...card, [key]: value }
      return { ...data, [collection]: cards }
    })
  }

  const toggleBooleanArray = (playerIndex: number, key: BooleanArrayField, boxIndex: number, length: number) => {
    updatePlayer(playerIndex, (data) => {
      const next = getBooleanArray(data[key], length)
      next[boxIndex] = !next[boxIndex]
      return { ...data, [key]: next }
    })
  }

  const importFiles = async (files: File[]) => {
    if (files.length === 0) return

    setIsImporting(true)
    setImportMessage("")

    const imported: PlayerEntry[] = []
    const failed: string[] = []

    for (const file of files) {
      try {
        const data = await importCharacterDataForMultiCharacter(file)
        imported.push({
          id: `${file.name}-${file.lastModified}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          fileName: file.name,
          data,
        })
      } catch (error) {
        failed.push(`${file.name}: ${error instanceof Error ? error.message : "读取失败"}`)
      }
    }

    if (imported.length > 0) {
      setPlayers((current) => [...current, ...imported])
    }

    setImportMessage(
      failed.length > 0
        ? `成功导入 ${imported.length} 份，失败 ${failed.length} 份：${failed.join("；")}`
        : `成功导入 ${imported.length} 份角色。`,
    )
    setIsImporting(false)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""
    await importFiles(files)
  }

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
      setIsDraggingFiles(true)
    }
  }

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingFiles(false)
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDraggingFiles(false)
    const files = Array.from(event.dataTransfer.files).filter((file) => {
      return file.type === "application/json" || file.name.toLowerCase().endsWith(".json")
    })
    await importFiles(files)
  }

  const toggleFullSection = (section: FullSectionKey) => {
    setVisibleFullSections((current) => {
      if (current.includes(section)) {
        return current.length > 1 ? current.filter((item) => item !== section) : current
      }
      return [...current, section]
    })
  }

  const isFullSectionVisible = (section: FullSectionKey) => visibleFullSections.includes(section)

  const removePlayer = (playerIndex: number) => {
    setPlayers((current) => current.filter((_, index) => index !== playerIndex))
  }

  const clearPlayers = () => {
    setPlayers([])
    setImportMessage("")
  }

  const renderAttributeInputs = (player: PlayerEntry, playerIndex: number, compact = false) => (
    <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
      {ATTRIBUTES.map((attribute) => {
        const attrValue = getAttributeValue(player.data, attribute.key)
        return (
          <div key={attribute.key} className="rounded-md border border-gray-200 bg-gray-50 p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-gray-700">{attribute.label}</span>
              <button
                type="button"
                onClick={() =>
                  setField(playerIndex, attribute.key, {
                    ...attrValue,
                    checked: !attrValue.checked,
                  })
                }
                className={cn(
                  "h-3 w-3 rounded-full border border-gray-800 bg-white",
                  attrValue.checked && "bg-gray-800",
                )}
                aria-label={`${attribute.label}熟练`}
              />
            </div>
            <input
              value={attrValue.value || ""}
              onChange={(event) =>
                setField(playerIndex, attribute.key, {
                  ...attrValue,
                  value: event.target.value,
                })
              }
              className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-center text-lg font-bold text-gray-900 outline-none focus:border-gray-800"
            />
          </div>
        )
      })}
    </div>
  )

  const renderQuickTracks = (player: PlayerEntry, playerIndex: number) => {
    const data = player.data
    const { hpMax, stressMax, hopeMax, armorMax, goldMax } = getResourceLimits(data)

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <HopeTrack
          value={typeof data.hope === "number" ? data.hope : 0}
          max={Math.max(1, hopeMax)}
          onChange={(value) => setField(playerIndex, "hope", value)}
        />
        <DotTrack
          label="熟练"
          values={getProficiencyArray(data.proficiency)}
          length={6}
          shape="round"
          onToggle={(index) => {
            const next = getProficiencyArray(data.proficiency)
            next[index] = !next[index]
            setField(playerIndex, "proficiency", next)
          }}
        />
        <DotTrack
          label="生命"
          values={getBooleanArray(data.hp, hpMax)}
          length={hpMax}
          onToggle={(index) => toggleBooleanArray(playerIndex, "hp", index, hpMax)}
        />
        <DotTrack
          label="压力"
          values={getBooleanArray(data.stress, stressMax)}
          length={stressMax}
          onToggle={(index) => toggleBooleanArray(playerIndex, "stress", index, stressMax)}
        />
        <DotTrack
          label="护甲槽"
          values={getBooleanArray(data.armorBoxes, armorMax)}
          length={armorMax}
          onToggle={(index) => toggleBooleanArray(playerIndex, "armorBoxes", index, armorMax)}
        />
        <DotTrack
          label="金币"
          values={getBooleanArray(data.gold, goldMax)}
          length={goldMax}
          shape="round"
          onToggle={(index) => toggleBooleanArray(playerIndex, "gold", index, goldMax)}
        />
      </div>
    )
  }

  const renderWeapons = (player: PlayerEntry, playerIndex: number, compact = false) => (
    <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
      {[
        { prefix: "primaryWeapon", label: "主武器" },
        { prefix: "secondaryWeapon", label: "副武器" },
        { prefix: "inventoryWeapon1", label: "备用武器 1" },
        { prefix: "inventoryWeapon2", label: "备用武器 2" },
      ].map((weapon) => (
        <div key={weapon.prefix} className="rounded-md border border-gray-200 bg-gray-50 p-2">
          <div className="mb-2 text-[11px] font-bold text-gray-700">{weapon.label}</div>
          <div className="grid gap-2">
            <TextField
              label="名称"
              value={getTextValue(player.data[`${weapon.prefix}Name` as keyof SheetData])}
              compact
              onChange={(value) => setField(playerIndex, `${weapon.prefix}Name` as keyof SheetData, value)}
            />
            <TextField
              label="属性/范围"
              value={getTextValue(player.data[`${weapon.prefix}Trait` as keyof SheetData])}
              compact
              onChange={(value) => setField(playerIndex, `${weapon.prefix}Trait` as keyof SheetData, value)}
            />
            <TextField
              label="伤害"
              value={getTextValue(player.data[`${weapon.prefix}Damage` as keyof SheetData])}
              compact
              onChange={(value) => setField(playerIndex, `${weapon.prefix}Damage` as keyof SheetData, value)}
            />
            {!compact && (
              <TextAreaField
                label="特性"
                value={getTextValue(player.data[`${weapon.prefix}Feature` as keyof SheetData])}
                onChange={(value) => setField(playerIndex, `${weapon.prefix}Feature` as keyof SheetData, value)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const renderBriefTable = () => (
    <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
      <table className="min-w-[1520px] table-fixed border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-gray-900 text-white">
          <tr>
            <th className="w-64 px-3 py-2">角色</th>
            <th className="w-16 px-2 py-2 text-center">等级</th>
            {SUMMARY_FIELDS.map((field) => (
              <th key={String(field.key)} className="w-20 px-2 py-2 text-center">{field.label}</th>
            ))}
            {ATTRIBUTES.map((attribute) => (
              <th key={attribute.key} className="w-20 px-2 py-2 text-center">{attribute.label}</th>
            ))}
            <th className="w-20 px-2 py-2 text-center">希望</th>
            <th className="w-28 px-2 py-2 text-center">熟练</th>
            <th className="w-40 px-2 py-2 text-center">生命</th>
            <th className="w-40 px-2 py-2 text-center">压力</th>
            <th className="w-28 px-2 py-2 text-center">护甲槽</th>
            <th className="w-52 px-3 py-2">主武器</th>
            <th className="w-52 px-3 py-2">副武器</th>
            <th className="w-44 px-3 py-2">护甲</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, playerIndex) => {
            const data = player.data
            const { hpMax, stressMax, hopeMax, armorMax } = getResourceLimits(data)

            return (
              <tr key={player.id} className="border-t border-gray-200 align-top hover:bg-gray-50">
                <td className="sticky left-0 z-[1] bg-white px-3 py-2 shadow-[1px_0_0_#e5e7eb]">
                  <TextField
                    label="角色"
                    value={data.name || ""}
                    compact
                    onChange={(value) => setField(playerIndex, "name", value)}
                  />
                  <div className="mt-1 truncate text-[11px] leading-4 text-gray-600" title={getCharacterClassLine(data)}>
                    {getCharacterClassLine(data) || "未填写身份"}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-gray-400" title={player.fileName}>{player.fileName}</div>
                </td>
                <td className="px-2 py-2">
                  <input
                    value={data.level || ""}
                    onChange={(event) => setField(playerIndex, "level", event.target.value)}
                    className="h-8 w-full rounded border border-gray-300 px-2 text-center font-semibold outline-none focus:border-gray-800"
                  />
                </td>
                {SUMMARY_FIELDS.map((field) => (
                  <td key={String(field.key)} className="px-2 py-2">
                    <input
                      value={getTextValue(data[field.key])}
                      onChange={(event) => setField(playerIndex, field.key, event.target.value)}
                      className="h-8 w-full rounded border border-gray-300 px-2 text-center font-semibold outline-none focus:border-gray-800"
                    />
                  </td>
                ))}
                {ATTRIBUTES.map((attribute) => {
                  const attrValue = getAttributeValue(data, attribute.key)
                  return (
                    <td key={attribute.key} className="px-2 py-2">
                      <input
                        value={attrValue.value || ""}
                        onChange={(event) =>
                          setField(playerIndex, attribute.key, {
                            ...attrValue,
                            value: event.target.value,
                          })
                        }
                        className="h-8 w-full rounded border border-gray-300 px-2 text-center font-semibold outline-none focus:border-gray-800"
                      />
                    </td>
                  )
                })}
                <td className="px-2 py-2">
                  <HopeTrack
                    value={typeof data.hope === "number" ? data.hope : 0}
                    max={Math.max(1, hopeMax)}
                    onChange={(value) => setField(playerIndex, "hope", value)}
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-col items-center gap-1">
                    <MiniTrack
                      values={getProficiencyArray(data.proficiency)}
                      length={6}
                      shape="round"
                      onToggle={(index) => {
                        const next = getProficiencyArray(data.proficiency)
                        next[index] = !next[index]
                        setField(playerIndex, "proficiency", next)
                      }}
                    />
                    <span className="text-[10px] text-gray-400">{checkedCount(getProficiencyArray(data.proficiency))}/6</span>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-col items-center gap-1">
                    <MiniTrack
                      values={getBooleanArray(data.hp, hpMax)}
                      length={hpMax}
                      onToggle={(index) => toggleBooleanArray(playerIndex, "hp", index, hpMax)}
                    />
                    <span className="text-[10px] text-gray-400">{getCheckedWithinLimit(data.hp, hpMax)}/{hpMax}</span>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-col items-center gap-1">
                    <MiniTrack
                      values={getBooleanArray(data.stress, stressMax)}
                      length={stressMax}
                      onToggle={(index) => toggleBooleanArray(playerIndex, "stress", index, stressMax)}
                    />
                    <span className="text-[10px] text-gray-400">{getCheckedWithinLimit(data.stress, stressMax)}/{stressMax}</span>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-col items-center gap-1">
                    <MiniTrack
                      values={getBooleanArray(data.armorBoxes, armorMax)}
                      length={armorMax}
                      onToggle={(index) => toggleBooleanArray(playerIndex, "armorBoxes", index, armorMax)}
                    />
                    <span className="text-[10px] text-gray-400">{getCheckedWithinLimit(data.armorBoxes, armorMax)}/{armorMax}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <BriefWeaponCell player={player} playerIndex={playerIndex} prefix="primaryWeapon" setField={setField} />
                </td>
                <td className="px-3 py-2">
                  <BriefWeaponCell player={player} playerIndex={playerIndex} prefix="secondaryWeapon" setField={setField} />
                </td>
                <td className="px-3 py-2">
                  <div className="grid gap-1">
                    <input
                      value={data.armorName || ""}
                      onChange={(event) => setField(playerIndex, "armorName", event.target.value)}
                      className="h-7 rounded border border-gray-300 px-2 text-xs font-semibold outline-none focus:border-gray-800"
                      placeholder="护甲名称"
                    />
                    <input
                      value={data.armorBaseScore || ""}
                      onChange={(event) => setField(playerIndex, "armorBaseScore", event.target.value)}
                      className="h-7 rounded border border-gray-300 px-2 text-xs outline-none focus:border-gray-800"
                      placeholder="基础护甲"
                    />
                    <input
                      value={data.armorThreshold || ""}
                      onChange={(event) => setField(playerIndex, "armorThreshold", event.target.value)}
                      className="h-7 rounded border border-gray-300 px-2 text-xs outline-none focus:border-gray-800"
                      placeholder="阈值"
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const renderBriefCards = () => (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {players.map((player, playerIndex) => {
        const data = player.data
        const { hpMax, stressMax, hopeMax, armorMax } = getResourceLimits(data)

        return (
          <article
            key={player.id}
            className="min-w-0 rounded-lg border border-gray-300 bg-white p-3 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-2 border-b border-gray-200 pb-2">
              <div className="min-w-0 flex-1">
                <input
                  value={data.name || ""}
                  onChange={(event) => setField(playerIndex, "name", event.target.value)}
                  className="h-8 w-full min-w-0 rounded border border-gray-300 bg-white px-2 text-sm font-bold text-gray-900 outline-none focus:border-gray-800"
                  placeholder="角色名"
                />
                <div
                  className="mt-1 truncate text-[11px] leading-4 text-gray-600"
                  title={getCharacterClassLine(data)}
                >
                  {getCharacterClassLine(data) || "未填写身份"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removePlayer(playerIndex)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                aria-label="移除角色"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <TextField
                label="等级"
                value={data.level || ""}
                compact
                onChange={(value) => setField(playerIndex, "level", value)}
              />
              {SUMMARY_FIELDS.map((field) => (
                <TextField
                  key={String(field.key)}
                  label={field.label}
                  value={getTextValue(data[field.key])}
                  compact
                  onChange={(value) => setField(playerIndex, field.key, value)}
                />
              ))}
            </div>

            <div className="mt-3">
              <div className="mb-1 text-[11px] font-bold text-gray-700">属性</div>
              <div className="grid grid-cols-3 gap-1.5">
                {ATTRIBUTES.map((attribute) => {
                  const attrValue = getAttributeValue(data, attribute.key)

                  return (
                    <label
                      key={attribute.key}
                      className="rounded-md border border-gray-200 bg-gray-50 p-1.5"
                    >
                      <span className="mb-1 block text-[10px] font-semibold text-gray-600">
                        {attribute.label}
                      </span>
                      <input
                        value={attrValue.value || ""}
                        onChange={(event) =>
                          setField(playerIndex, attribute.key, {
                            ...attrValue,
                            value: event.target.value,
                          })
                        }
                        className="h-8 w-full rounded border border-gray-300 bg-white px-1 text-center text-base font-bold text-gray-900 outline-none focus:border-gray-800"
                      />
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <HopeTrack
                  value={typeof data.hope === "number" ? data.hope : 0}
                  max={Math.max(1, hopeMax)}
                  onChange={(value) => setField(playerIndex, "hope", value)}
                />
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <div className="mb-1 text-[11px] font-semibold text-gray-600">
                  熟练 <span className="font-normal text-gray-400">{checkedCount(getProficiencyArray(data.proficiency))}/6</span>
                </div>
                <MiniTrack
                  values={getProficiencyArray(data.proficiency)}
                  length={6}
                  shape="round"
                  onToggle={(index) => {
                    const next = getProficiencyArray(data.proficiency)
                    next[index] = !next[index]
                    setField(playerIndex, "proficiency", next)
                  }}
                />
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <div className="mb-1 text-[11px] font-semibold text-gray-600">
                  生命 <span className="font-normal text-gray-400">{getCheckedWithinLimit(data.hp, hpMax)}/{hpMax}</span>
                </div>
                <MiniTrack
                  values={getBooleanArray(data.hp, hpMax)}
                  length={hpMax}
                  onToggle={(index) => toggleBooleanArray(playerIndex, "hp", index, hpMax)}
                />
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <div className="mb-1 text-[11px] font-semibold text-gray-600">
                  压力 <span className="font-normal text-gray-400">{getCheckedWithinLimit(data.stress, stressMax)}/{stressMax}</span>
                </div>
                <MiniTrack
                  values={getBooleanArray(data.stress, stressMax)}
                  length={stressMax}
                  onToggle={(index) => toggleBooleanArray(playerIndex, "stress", index, stressMax)}
                />
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <div className="mb-1 text-[11px] font-semibold text-gray-600">
                  护甲槽 <span className="font-normal text-gray-400">{getCheckedWithinLimit(data.armorBoxes, armorMax)}/{armorMax}</span>
                </div>
                <MiniTrack
                  values={getBooleanArray(data.armorBoxes, armorMax)}
                  length={armorMax}
                  onToggle={(index) => toggleBooleanArray(playerIndex, "armorBoxes", index, armorMax)}
                />
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                <div className="mb-1 text-[11px] font-semibold text-gray-600">护甲</div>
                <div className="grid gap-1">
                  <input
                    value={data.armorName || ""}
                    onChange={(event) => setField(playerIndex, "armorName", event.target.value)}
                    className="h-7 rounded border border-gray-300 px-2 text-xs font-semibold outline-none focus:border-gray-800"
                    placeholder="护甲名称"
                  />
                  <input
                    value={data.armorBaseScore || ""}
                    onChange={(event) => setField(playerIndex, "armorBaseScore", event.target.value)}
                    className="h-7 rounded border border-gray-300 px-2 text-xs outline-none focus:border-gray-800"
                    placeholder="基础护甲"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-bold text-gray-700">主武器</div>
                <BriefWeaponCell player={player} playerIndex={playerIndex} prefix="primaryWeapon" setField={setField} />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-bold text-gray-700">副武器</div>
                <BriefWeaponCell player={player} playerIndex={playerIndex} prefix="secondaryWeapon" setField={setField} />
              </div>
            </div>

            <div className="mt-2 truncate text-[10px] text-gray-400" title={player.fileName}>
              {player.fileName}
            </div>
          </article>
        )
      })}
    </section>
  )

  const renderCardTextSection = (
    player: PlayerEntry,
    playerIndex: number,
    collection: "cards" | "inventory_cards",
    filter: (card: StandardCard) => boolean,
    emptyText: string,
  ) => {
    const cards = getVisibleCards(player.data[collection]).filter(({ card }) => filter(card))

    if (cards.length === 0) {
      return (
        <div className="rounded-md border border-dashed border-gray-300 p-3 text-xs text-gray-500">
          {emptyText}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {cards.map(({ card, index }) => (
          <div key={`${collection}-${card.id || index}-${index}`} className="rounded-md border border-gray-200 bg-gray-50 p-2">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {getCardTypeLabel(card.type)}
              </span>
              {card.class && <span className="text-[10px] text-gray-500">{card.class}</span>}
              {card.level !== undefined && <span className="text-[10px] text-gray-500">Lv.{card.level}</span>}
            </div>
            <input
              value={card.name || ""}
              onChange={(event) => setCardField(playerIndex, collection, index, "name", event.target.value)}
              className="mb-2 h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm font-bold text-gray-900 outline-none focus:border-gray-800"
              placeholder="卡牌名称"
            />
            <AutoResizeTextarea
              value={card.description || ""}
              onChange={(event) => setCardField(playerIndex, collection, index, "description", event.target.value)}
              minHeight={112}
              className="w-full resize-none rounded border border-gray-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-gray-800"
              placeholder="卡牌文字"
            />
            <BasicMarkdownPreview value={card.description || ""} />
          </div>
        ))}
      </div>
    )
  }

  const renderFullCard = (player: PlayerEntry, playerIndex: number) => {
    const data = player.data

    return (
      <article className="min-w-0 rounded-lg border border-gray-300 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-2 border-b border-gray-200 pb-3">
          <div className="min-w-0">
            <input
              value={data.name || ""}
              onChange={(event) => setField(playerIndex, "name", event.target.value)}
              className="w-full min-w-0 bg-transparent text-lg font-bold text-gray-900 outline-none"
              placeholder="未命名角色"
            />
            <div className="mt-1 text-[11px] leading-relaxed text-gray-500">{getCharacterClassLine(data) || player.fileName}</div>
          </div>
          <button
            type="button"
            onClick={() => removePlayer(playerIndex)}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
            aria-label="移除角色"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {isFullSectionVisible("core") && (
          <section>
            <SectionTitle>基础数值</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {CORE_FIELDS.map((field) => (
                <TextField
                  key={String(field.key)}
                  label={field.label}
                  value={getTextValue(data[field.key])}
                  compact
                  onChange={(value) => setField(playerIndex, field.key, value)}
                />
              ))}
              <TextField
                label="生命上限"
                value={getTextValue(data.hpMax || "")}
                compact
                onChange={(value) => setField(playerIndex, "hpMax", Number(value) || 0)}
              />
              <TextField
                label="压力上限"
                value={getTextValue(data.stressMax || "")}
                compact
                onChange={(value) => setField(playerIndex, "stressMax", Number(value) || 0)}
              />
            </div>
          </section>
          )}

          {isFullSectionVisible("attributes") && (
          <section>
            <SectionTitle>属性</SectionTitle>
            {renderAttributeInputs(player, playerIndex)}
          </section>
          )}

          {isFullSectionVisible("resources") && (
          <section>
            <SectionTitle>资源</SectionTitle>
            {renderQuickTracks(player, playerIndex)}
          </section>
          )}

          {isFullSectionVisible("equipment") && (
          <section>
            <SectionTitle>武器与护甲</SectionTitle>
            <div className="space-y-3">
              {renderWeapons(player, playerIndex)}
              <div className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                <TextField label="护甲名称" value={data.armorName || ""} compact onChange={(value) => setField(playerIndex, "armorName", value)} />
                <TextField label="基础护甲" value={data.armorBaseScore || ""} compact onChange={(value) => setField(playerIndex, "armorBaseScore", value)} />
                <TextField label="阈值" value={data.armorThreshold || ""} compact onChange={(value) => setField(playerIndex, "armorThreshold", value)} />
                <TextField label="加值" value={data.armorBonus || ""} compact onChange={(value) => setField(playerIndex, "armorBonus", value)} />
                <div className="col-span-2">
                  <TextAreaField label="护甲特性" value={data.armorFeature || ""} onChange={(value) => setField(playerIndex, "armorFeature", value)} />
                </div>
              </div>
            </div>
          </section>
          )}

          {isFullSectionVisible("experience") && (
          <section>
            <SectionTitle>经验与物品</SectionTitle>
            <div className="grid gap-2">
              {(data.experience || []).map((experience, index) => (
                <div key={`exp-${index}`} className="grid grid-cols-[1fr_4rem] gap-2">
                  <input
                    value={experience || ""}
                    onChange={(event) => {
                      const next = [...(data.experience || [])]
                      next[index] = event.target.value
                      setField(playerIndex, "experience", next)
                    }}
                    className="h-8 rounded border border-gray-300 px-2 text-xs outline-none focus:border-gray-800"
                  />
                  <input
                    value={data.experienceValues?.[index] || ""}
                    onChange={(event) => {
                      const next = [...(data.experienceValues || [])]
                      next[index] = event.target.value
                      setField(playerIndex, "experienceValues", next)
                    }}
                    className="h-8 rounded border border-gray-300 px-2 text-center text-xs outline-none focus:border-gray-800"
                  />
                </div>
              ))}
              <AutoResizeTextarea
                value={(data.inventory || []).join("\n")}
                onChange={(event) => setField(playerIndex, "inventory", event.target.value.split("\n"))}
                minHeight={128}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-800"
                placeholder="物品清单，每行一项"
              />
            </div>
          </section>
          )}

          {isFullSectionVisible("text") && (
          <section>
            <SectionTitle>文字信息</SectionTitle>
            <div className="space-y-2">
              {TEXT_AREA_FIELDS.map((field) => (
                <TextAreaField
                  key={String(field.key)}
                  label={field.label}
                  value={getTextValue(data[field.key])}
                  onChange={(value) => setField(playerIndex, field.key, value)}
                />
              ))}
            </div>
          </section>
          )}

          {isFullSectionVisible("characterCards") && (
          <section>
            <SectionTitle>角色卡</SectionTitle>
            {renderCardTextSection(
              player,
              playerIndex,
              "cards",
              (card) => ["profession", "ancestry", "community", "subclass"].includes(card.type),
              "没有可展示的角色卡。",
            )}
          </section>
          )}

          {isFullSectionVisible("domainCards") && (
          <section>
            <SectionTitle>领域卡</SectionTitle>
            {renderCardTextSection(
              player,
              playerIndex,
              "cards",
              (card) => !["profession", "ancestry", "community", "subclass"].includes(card.type),
              "没有可展示的领域卡或其他聚焦卡。",
            )}
          </section>
          )}

          {isFullSectionVisible("inventoryCards") && (
          <section>
            <SectionTitle>库存卡</SectionTitle>
            {renderCardTextSection(
              player,
              playerIndex,
              "inventory_cards",
              () => true,
              "没有可展示的库存卡。",
            )}
          </section>
          )}

          {isFullSectionVisible("companion") && (
          <section>
            <SectionTitle>伙伴</SectionTitle>
            <div className="grid gap-2">
              <TextField label="伙伴名称" value={data.companionName || ""} compact onChange={(value) => setField(playerIndex, "companionName", value)} />
              <TextField label="闪避" value={data.companionEvasion || ""} compact onChange={(value) => setField(playerIndex, "companionEvasion", value)} />
              <TextField label="范围" value={data.companionRange || ""} compact onChange={(value) => setField(playerIndex, "companionRange", value)} />
              <TextField label="武器/攻击" value={data.companionWeapon || ""} compact onChange={(value) => setField(playerIndex, "companionWeapon", value)} />
              <TextAreaField label="描述" value={data.companionDescription || ""} onChange={(value) => setField(playerIndex, "companionDescription", value)} />
            </div>
          </section>
          )}

        </div>
      </article>
    )
  }

  return (
    <main
      className={cn(
        "gm-panel-page min-h-screen bg-slate-100 px-4 py-5 text-gray-900",
        isDraggingFiles && "bg-slate-200",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <style jsx global>{`
        body:has(.gm-panel-page) .app-watermark {
          display: none;
        }
      `}</style>
      {isDraggingFiles && (
        <div className="pointer-events-none fixed inset-4 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-900 bg-white/80 text-gray-900 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <UploadCloud className="h-10 w-10" />
            <div className="text-base font-bold">松开鼠标导入 JSON 文件</div>
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
        <header className="rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToPage('/')}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                返回主页
              </Button>
              <div>
                <h1 className="text-lg font-bold">GM 玩家面板</h1>
                <p className="text-xs text-gray-500">{totalFilesLabel}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border border-gray-300 bg-gray-100 p-1">
                <Button
                  size="sm"
                  variant={mode === "brief" ? "default" : "ghost"}
                  onClick={() => setMode("brief")}
                  className={cn("h-8 gap-1.5", mode === "brief" && "bg-gray-900 text-white hover:bg-gray-800")}
                >
                  <Table2 className="h-4 w-4" />
                  简略版
                </Button>
                <Button
                  size="sm"
                  variant={mode === "full" ? "default" : "ghost"}
                  onClick={() => setMode("full")}
                  className={cn("h-8 gap-1.5", mode === "full" && "bg-gray-900 text-white hover:bg-gray-800")}
                >
                  <LayoutGrid className="h-4 w-4" />
                  完整版
                </Button>
              </div>
              {mode === "full" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Settings2 className="h-4 w-4" />
                      管理
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>展示属性块</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {FULL_SECTION_OPTIONS.map((section) => (
                      <DropdownMenuCheckboxItem
                        key={section.key}
                        checked={visibleFullSections.includes(section.key)}
                        onCheckedChange={() => toggleFullSection(section.key)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {section.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="gap-1.5 bg-gray-900 text-white hover:bg-gray-800"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? "导入中" : "上传 JSON"}
              </Button>
              {players.length > 0 && (
                <Button size="sm" variant="outline" onClick={clearPlayers}>
                  清空
                </Button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {importMessage && (
            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {importMessage}
            </div>
          )}
        </header>

        {players.length === 0 ? (
          <section className="flex min-h-[55vh] items-center justify-center rounded-lg border border-dashed border-gray-400 bg-white p-8 text-center shadow-sm">
            <div className="max-w-md">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white">
                <FileJson className="h-7 w-7" />
              </div>
              <h2 className="text-base font-bold">上传该项目导出的角色 JSON</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                可以一次选择多份文件。面板只在当前页面中修改这些临时数据，不会覆盖主页存档，也不会触发自动化计算。
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="mt-5 bg-gray-900 text-white hover:bg-gray-800"
              >
                选择 JSON 文件
              </Button>
            </div>
          </section>
        ) : mode === "brief" ? (
          renderBriefCards()
        ) : (
          <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {players.map((player, playerIndex) => (
              <div key={player.id} className="min-w-0">
                {renderFullCard(player, playerIndex)}
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

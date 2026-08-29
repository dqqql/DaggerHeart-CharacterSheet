"use client"

import * as React from "react"
import { Check, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useSheetStore } from "@/lib/sheet-store"
import { getOptionalPageConfigs } from "@/data/list/pages"
import { getAllPages } from "@/lib/page-registry"

type PageVisibilityKey = "rangerCompanion" | "armorTemplate" | "adventureNotes" | "relationshipQuestions"

export function PageVisibilityDropdown() {
  const sheetData = useSheetStore(state => state.sheetData)
  const setSheetData = useSheetStore(state => state.setSheetData)
  
  // 如果sheetData不存在，显示占位符按钮（不可交互）
  if (!sheetData) {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-[color,background-color,box-shadow,opacity]",
          "h-10 min-w-[40px] opacity-50 cursor-not-allowed"
        )}
        disabled
        title="加载中..."
      >
        <Settings className="h-4 w-4" />
      </button>
    )
  }

  const descriptions = new Map<PageVisibilityKey, string>(
    getOptionalPageConfigs().map(config => [config.visibilityKey!, config.description]),
  )
  descriptions.set("relationshipQuestions", "职业背景问题与同伴关系")
  const pageOptions = getAllPages()
    .flatMap(page => {
      if (
        page.visibility.type !== "config" ||
        (page.ruleSetIds && !page.ruleSetIds.includes(sheetData.ruleSetId))
      ) {
        return []
      }
      const id = page.visibility.configKey
      return {
        id,
        label: page.label,
        description: descriptions.get(id) || "",
        visible: sheetData.pageVisibility?.[id] || false,
      }
    })

  const togglePageVisibility = (
    pageId: PageVisibilityKey,
  ) => {
    const currentValue = sheetData.pageVisibility?.[pageId]
    setSheetData({
      pageVisibility: {
        rangerCompanion: sheetData.pageVisibility?.rangerCompanion ?? false,
        armorTemplate: sheetData.pageVisibility?.armorTemplate ?? false,
        adventureNotes: sheetData.pageVisibility?.adventureNotes ?? false,
        relationshipQuestions: sheetData.pageVisibility?.relationshipQuestions ?? false,
        [pageId]: !currentValue,
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-[color,background-color,box-shadow,opacity]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
            "hover:bg-muted-foreground/10",
            "h-10 min-w-[40px]"
          )}
          title="管理页面显示"
          aria-label="管理页面显示"
        >
          <Settings className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {pageOptions.map((option) => (
          <DropdownMenuItem
            key={option.id as string}
            onClick={() => togglePageVisibility(option.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
            <div className="flex items-center justify-center w-4 h-4">
              {option.visible && <Check className="h-3 w-3" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

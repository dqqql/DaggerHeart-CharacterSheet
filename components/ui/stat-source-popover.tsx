"use client"

import { CircleHelp } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface StatSourcePopoverProps {
  title: string
  value: string
  sources: Array<{ label: string; value: number }>
}

export function StatSourcePopover({ title, value, sources }: StatSourcePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 print:hidden"
          title={`${title}来源说明`}
          aria-label={`${title}来源说明`}
        >
          <CircleHelp className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="center">
        <div className="space-y-2">
          <div className="border-b border-gray-200 pb-2">
            <div className="text-xs font-semibold text-gray-800">{title}</div>
            <div className="text-lg font-bold text-gray-900">{value || "-"}</div>
          </div>
          {sources.length > 0 ? (
            <div className="space-y-1">
              {sources.map((source) => (
                <div key={`${source.label}-${source.value}`} className="flex items-center justify-between text-xs text-gray-700">
                  <span>{source.label}</span>
                  <span className={source.value >= 0 ? "text-green-700" : "text-red-700"}>
                    {source.value >= 0 ? "+" : ""}
                    {source.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">当前没有可展示的计算来源。</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

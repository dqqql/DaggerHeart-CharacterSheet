"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BookOpen,
  Code,
  Dice5,
  Download,
  FileJson,
  FileText,
  FileType,
  FolderOpen,
  KeyRound,
  Layers,
  Package,
  Plus,
  Sparkles,
  Upload,
  UsersRound,
} from "lucide-react"
import { DualPageToggle } from "@/components/ui/dual-page-toggle"
import { cn, navigateToPage } from "@/lib/utils"

const MAX_CHARACTERS = 10

interface BottomDockBaseProps {
  isMobile: boolean
}

interface MainModeProps extends BottomDockBaseProps {
  mode: "main"
  isCardDrawerOpen: boolean
  characterCount: number
  onToggleCardDrawer: () => void
  onToggleGuide: () => void
  onToggleNotebook: () => void
  onPrintAll: () => void
  onOpenSealDiceExport: () => void
  onOpenCharacterCodeExport: () => void
  onQuickExportJSON: () => void
  onQuickExportPDF: () => void
  onQuickExportHTML: () => void
  onOpenCharacterManagement: () => void
  onQuickCreateArchive: () => void
  onQuickImportFromHTML: () => void
}

interface PreviewModeProps extends BottomDockBaseProps {
  mode: "preview"
  onExportPDF: () => void
  onExportHTML: () => void
  onExportJSON: () => void
  onOpenSealDiceExport: () => void
  onOpenCharacterCodeExport: () => void
  onClose: () => void
}

type BottomDockProps = MainModeProps | PreviewModeProps

function MainModeContent(props: MainModeProps) {
  const { isMobile } = props

  return (
    <>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={props.onToggleCardDrawer}
              className={cn(
                "relative flex items-center justify-center rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90",
                isMobile ? "h-12 w-12" : "h-10 w-10",
                props.isCardDrawerOpen && "ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900",
              )}
              aria-label="打开卡牌抽屉"
              aria-expanded={props.isCardDrawerOpen}
            >
              <Layers className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
              {props.isCardDrawerOpen && (
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>卡牌抽屉</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {props.isCardDrawerOpen ? "点击关闭" : "浏览和选择卡牌"}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={props.onToggleGuide}
              className={cn(
                "gap-1.5 bg-primary text-sm text-primary-foreground hover:bg-primary/90",
                isMobile ? "px-4 py-2.5" : "px-3 py-1.5",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              建卡指引
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>新手建卡指引</p>
            <p className="mt-1 text-xs text-muted-foreground">跟随步骤快速创建你的第一个角色</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => navigateToPage("/gm-panel")}
              className={cn(
                "gap-1.5 bg-primary text-sm text-primary-foreground hover:bg-primary/90",
                isMobile ? "px-4 py-2.5" : "px-3 py-1.5",
              )}
            >
              <UsersRound className="h-3.5 w-3.5" />
              玩家面板
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>GM 玩家面板</p>
            <p className="mt-1 text-xs text-muted-foreground">上传多个角色 JSON，集中追踪玩家数值</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={props.onToggleNotebook}
              className={cn(
                "gap-1.5 bg-primary text-sm text-primary-foreground hover:bg-primary/90",
                isMobile ? "px-4 py-2.5" : "px-3 py-1.5",
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              笔记
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>笔记本</p>
            <p className="mt-1 text-xs text-muted-foreground">记录游戏中的笔记、计数器和骰子</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-5 bg-slate-500/30" />

      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  data-testid="export-menu-trigger"
                  className={cn(
                    "gap-1.5 bg-primary text-sm text-primary-foreground hover:bg-primary/90",
                    isMobile ? "px-4 py-2.5" : "px-3 py-1.5",
                  )}
                >
                  <Download className="h-3.5 w-3.5" />
                  导出
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>导出角色卡</p>
              <p className="mt-1 text-xs text-muted-foreground">导出为 PDF、HTML、JSON 或角色码</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side="top" className={cn("w-56", isMobile && "text-base")}>
            <DropdownMenuItem onClick={props.onPrintAll} className={cn(isMobile && "px-4 py-3")}>
              <FileText className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              打开导出预览界面
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-testid="export-character-code-item"
              onClick={props.onOpenCharacterCodeExport}
              className={cn(isMobile && "px-4 py-3")}
            >
              <KeyRound className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              导出角色码
            </DropdownMenuItem>
            <DropdownMenuItem onClick={props.onOpenSealDiceExport} className={cn(isMobile && "px-4 py-3")}>
              <Dice5 className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              导出到骰子
            </DropdownMenuItem>
            <DropdownMenuItem onClick={props.onQuickExportJSON} className={cn(isMobile && "px-4 py-3")}>
              <FileJson className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              导出 JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={props.onQuickExportPDF} className={cn(isMobile && "px-4 py-3")}>
              <FileType className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              导出 PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={props.onQuickExportHTML} className={cn(isMobile && "px-4 py-3")}>
              <Code className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              导出 HTML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  className={cn(
                    "gap-1.5 bg-primary text-sm text-primary-foreground hover:bg-primary/90",
                    isMobile ? "px-4 py-2.5" : "px-3 py-1.5",
                  )}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  存档
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>存档管理</p>
              <p className="mt-1 text-xs text-muted-foreground">管理多个角色存档</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side="top" className={cn("w-56", isMobile && "text-base")}>
            <DropdownMenuItem onClick={props.onOpenCharacterManagement} className={cn(isMobile && "px-4 py-3")}>
              <FolderOpen className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              打开存档管理器
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={props.onQuickCreateArchive}
              disabled={props.characterCount >= MAX_CHARACTERS}
              className={cn(isMobile && "px-4 py-3")}
            >
              <Plus className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              新建存档
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={props.onQuickImportFromHTML}
              disabled={props.characterCount >= MAX_CHARACTERS}
              className={cn(isMobile && "px-4 py-3")}
            >
              <Upload className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
              从 HTML 导入
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator orientation="vertical" className="h-5 bg-slate-500/30" />

      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => navigateToPage("/card-manager")}
              className={cn(
                "gap-1.5 bg-primary text-sm text-primary-foreground hover:bg-primary/90",
                isMobile ? "px-4 py-2.5" : "px-3 py-1.5",
              )}
            >
              <Package className="h-3.5 w-3.5" />
              卡包
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>卡包管理</p>
            <p className="mt-1 text-xs text-muted-foreground">管理和导入自定义卡包</p>
          </TooltipContent>
        </Tooltip>

        {!isMobile && <DualPageToggle />}
      </div>
    </>
  )
}

function PreviewModeContent(props: PreviewModeProps) {
  const { isMobile } = props

  return (
    <div className="flex items-center gap-4">
      <Button
        onClick={props.onExportPDF}
        className={cn(
          "whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none",
          isMobile ? "px-6 py-3 text-base" : "px-4 py-2 text-sm",
        )}
      >
        导出为 PDF
      </Button>
      <Button
        onClick={props.onExportHTML}
        className={cn(
          "whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none",
          isMobile ? "px-6 py-3 text-base" : "px-4 py-2 text-sm",
        )}
      >
        导出为 HTML
      </Button>
      <Button
        onClick={props.onExportJSON}
        className={cn(
          "whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none",
          isMobile ? "px-6 py-3 text-base" : "px-4 py-2 text-sm",
        )}
      >
        导出为 JSON
      </Button>
      <Button
        onClick={props.onOpenCharacterCodeExport}
        className={cn(
          "whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none",
          isMobile ? "px-6 py-3 text-base" : "px-4 py-2 text-sm",
        )}
      >
        导出角色码
      </Button>
      <Button
        onClick={props.onOpenSealDiceExport}
        className={cn(
          "whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none",
          isMobile ? "px-6 py-3 text-base" : "px-4 py-2 text-sm",
        )}
      >
        导出到骰子
      </Button>
      <Button
        onClick={props.onClose}
        className={cn(
          "whitespace-nowrap bg-red-600 text-white hover:bg-red-700 focus:outline-none",
          isMobile ? "px-6 py-3 text-base" : "px-4 py-2 text-sm",
        )}
      >
        返回
      </Button>
    </div>
  )
}

export function BottomDock(props: BottomDockProps) {
  const { isMobile, mode } = props
  const isPreviewMode = mode === "preview"

  return (
    <div
      className={cn(
        "fixed left-0 right-0 print:hidden",
        isMobile ? "bottom-8" : "bottom-4",
        isPreviewMode ? "z-[60] print-control-buttons" : "z-30",
      )}
    >
      <div className="flex justify-center px-4">
        <TooltipProvider>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-2.5 py-1.5 shadow-md transition-all duration-200",
              isPreviewMode && "gap-4",
            )}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(16px) saturate(180%)",
              borderColor: "rgba(255, 255, 255, 0.15)",
              boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.1)",
            }}
          >
            {mode === "main" ? <MainModeContent {...props} /> : <PreviewModeContent {...props} />}
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}

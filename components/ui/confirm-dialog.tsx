"use client"

import { useEffect, useRef, useState } from "react"
import { create } from "zustand"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type DialogKind = "confirm" | "prompt"

interface BaseOptions {
  title?: string
  /** 主体说明文案，支持多行（\n 会被渲染为换行） */
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export interface ConfirmOptions extends BaseOptions {}

export interface PromptOptions extends BaseOptions {
  defaultValue?: string
  placeholder?: string
  /** 输入框上方的小标签 */
  label?: string
  /** 若设置，仅当输入完全等于该值时确认按钮才可用（用于高危二次确认） */
  requireMatch?: string
}

interface DialogState {
  open: boolean
  kind: DialogKind
  options: ConfirmOptions & PromptOptions
  resolve: ((value: boolean | string | null) => void) | null
  openConfirm: (options: ConfirmOptions) => Promise<boolean>
  openPrompt: (options: PromptOptions) => Promise<string | null>
  close: (value: boolean | string | null) => void
}

const useDialogStore = create<DialogState>((set, get) => ({
  open: false,
  kind: "confirm",
  options: {},
  resolve: null,
  openConfirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        kind: "confirm",
        options,
        resolve: (value) => resolve(value === true),
      })
    }),
  openPrompt: (options) =>
    new Promise<string | null>((resolve) => {
      set({
        open: true,
        kind: "prompt",
        options,
        resolve: (value) => resolve(typeof value === "string" ? value : null),
      })
    }),
  close: (value) => {
    const { resolve } = get()
    resolve?.(value)
    set({ open: false, resolve: null })
  },
}))

/** 异步确认对话框，替代 window.confirm。返回用户是否确认。 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useDialogStore.getState().openConfirm(options)
}

/** 异步输入对话框，替代 window.prompt。取消返回 null。 */
export function promptDialog(options: PromptOptions): Promise<string | null> {
  return useDialogStore.getState().openPrompt(options)
}

function renderMultiline(text?: string) {
  if (!text) return null
  return text.split("\n").map((line, index) => (
    <span key={index} className="block">
      {line === "" ? " " : line}
    </span>
  ))
}

/** 全局挂载一次（在 layout 中），承载所有 confirm()/promptDialog() 调用。 */
export function ConfirmDialogHost() {
  const open = useDialogStore((state) => state.open)
  const kind = useDialogStore((state) => state.kind)
  const options = useDialogStore((state) => state.options)
  const close = useDialogStore((state) => state.close)

  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue(options.defaultValue ?? "")
      if (kind === "prompt") {
        // 等待对话框渲染后聚焦
        const timer = setTimeout(() => inputRef.current?.select(), 50)
        return () => clearTimeout(timer)
      }
    }
  }, [open, kind, options.defaultValue])

  const matchOk = !options.requireMatch || value === options.requireMatch
  const isDestructive = options.variant === "destructive"

  const handleConfirm = () => {
    if (kind === "prompt") {
      if (!matchOk) return
      close(value)
    } else {
      close(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close(kind === "prompt" ? null : false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{options.title ?? (kind === "prompt" ? "请输入" : "请确认")}</DialogTitle>
          {options.description && (
            <DialogDescription className="whitespace-pre-line">
              {renderMultiline(options.description)}
            </DialogDescription>
          )}
        </DialogHeader>

        {kind === "prompt" && (
          <div className="space-y-2">
            {options.label && <Label htmlFor="confirm-dialog-input">{options.label}</Label>}
            <Input
              id="confirm-dialog-input"
              ref={inputRef}
              value={value}
              placeholder={options.placeholder}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleConfirm()
                }
              }}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(kind === "prompt" ? null : false)}>
            {options.cancelText ?? "取消"}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            disabled={kind === "prompt" && !matchOk}
            onClick={handleConfirm}
          >
            {options.confirmText ?? "确认"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

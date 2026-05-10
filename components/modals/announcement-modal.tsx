"use client"

import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Announcement } from "@/lib/announcements"

interface AnnouncementModalProps {
  announcements: Announcement[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAcknowledge: () => void
}

export function AnnouncementModal({
  announcements,
  open,
  onOpenChange,
  onAcknowledge,
}: AnnouncementModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>更新公告</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto pr-2">
          {announcements.map((announcement) => (
            <section
              key={announcement.id}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  {announcement.title}
                </h3>
                <p className="text-sm text-slate-500">
                  发布日期：{announcement.publishedAt}
                </p>
              </div>

              <div className="max-w-none text-[14px] leading-6 text-slate-700">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="mb-2 mt-4 text-xl font-semibold text-slate-900 first:mt-0">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="mb-2 mt-4 text-lg font-semibold text-slate-900 first:mt-0">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-2 mt-3 text-base font-semibold text-slate-900 first:mt-0">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => <p className="my-2">{children}</p>,
                    ul: ({ children }) => <ul className="my-2 list-disc pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2 list-decimal pl-5">{children}</ol>,
                    li: ({ children }) => <li className="my-1">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-slate-900">{children}</strong>
                    ),
                    code: ({ children }) => (
                      <code className="rounded bg-slate-200 px-1 py-0.5 text-[0.9em] text-slate-800">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {announcement.content}
                </ReactMarkdown>
              </div>
            </section>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={onAcknowledge}>我知道了</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

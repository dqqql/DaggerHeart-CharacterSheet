"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { rhodesIslandCatalog } from "@/data/rhodes-island"
import type { MulticlassSelection } from "@/lib/sheet-data"

interface RhodesMulticlassModalProps {
  open: boolean
  mainProfessionId?: string
  onOpenChange: (open: boolean) => void
  onConfirm: (selection: MulticlassSelection) => void
}

export function RhodesMulticlassModal({
  open,
  mainProfessionId,
  onOpenChange,
  onConfirm,
}: RhodesMulticlassModalProps) {
  const professions = useMemo(
    () => rhodesIslandCatalog.professions.filter(item => item.id !== mainProfessionId),
    [mainProfessionId],
  )
  const [professionId, setProfessionId] = useState("")
  const [branchId, setBranchId] = useState("")
  const [domainId, setDomainId] = useState("")
  const branches = rhodesIslandCatalog.branches.filter(branch => branch.professionId === professionId)

  const confirm = () => {
    const profession = professions.find(item => item.id === professionId)
    const branch = branches.find(item => item.id === branchId)
    const domain = rhodesIslandCatalog.domains.find(item => item.id === domainId)
    if (!profession || !branch || !domain) return
    onConfirm({
      profession: { id: profession.id, name: profession.name },
      branch: { id: branch.id, name: branch.name },
      domain: { id: domain.id, name: domain.name },
    })
    onOpenChange(false)
  }

  const selectClass = "h-10 w-full border border-cyan-200 bg-white px-3 text-sm text-slate-800 [color-scheme:light] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700 [&>option]:bg-white [&>option]:text-slate-800"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-rhodes-multiclass-modal
        className="max-w-lg gap-0 overflow-hidden p-0"
      >
        <DialogHeader data-multiclass-modal-header className="space-y-2 px-6 pb-5 pt-6">
          <DialogTitle className="text-xl text-slate-900">兼职选择向导</DialogTitle>
          <DialogDescription className="max-w-md leading-relaxed text-slate-600">
            兼职只取得额外职业、初始分支和一个领域，不会改变生命、闪避或主武器。
          </DialogDescription>
        </DialogHeader>
        <div data-multiclass-modal-body className="space-y-3 border-y border-cyan-100 px-6 py-5">
          <label data-multiclass-field className="block space-y-2 border border-cyan-100 bg-white p-3 text-sm font-medium text-slate-700">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 bg-cyan-500 shadow-[0_0_8px_rgb(6_182_212_/_55%)]" />
              额外职业
            </span>
            <select
              aria-label="额外职业"
              className={selectClass}
              value={professionId}
              onChange={(event) => {
                setProfessionId(event.target.value)
                setBranchId("")
              }}
            >
              <option value="">请选择</option>
              {professions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label data-multiclass-field className="block space-y-2 border border-cyan-100 bg-white p-3 text-sm font-medium text-slate-700">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 bg-cyan-500 shadow-[0_0_8px_rgb(6_182_212_/_55%)]" />
              初始分支
            </span>
            <select
              aria-label="初始分支"
              className={selectClass}
              value={branchId}
              onChange={event => setBranchId(event.target.value)}
              disabled={!professionId}
            >
              <option value="">请选择</option>
              {branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label data-multiclass-field className="block space-y-2 border border-cyan-100 bg-white p-3 text-sm font-medium text-slate-700">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 bg-cyan-500 shadow-[0_0_8px_rgb(6_182_212_/_55%)]" />
              领域
            </span>
            <select
              aria-label="领域"
              className={selectClass}
              value={domainId}
              onChange={event => setDomainId(event.target.value)}
            >
              <option value="">请选择</option>
              {rhodesIslandCatalog.domains.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
        <DialogFooter data-multiclass-modal-footer className="gap-2 px-6 py-4 sm:space-x-0">
          <Button
            variant="outline"
            className="border-cyan-200 bg-white text-slate-700 hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-800"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="bg-cyan-700 text-white hover:bg-cyan-800 disabled:bg-slate-200 disabled:text-slate-500"
            disabled={!professionId || !branchId || !domainId}
            onClick={confirm}
          >
            确认兼职
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

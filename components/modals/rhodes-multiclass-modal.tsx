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

  const selectClass = "h-9 w-full border border-slate-300 bg-white px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>兼职选择向导</DialogTitle>
          <DialogDescription>
            兼职只取得额外职业、初始分支和一个领域，不会改变生命、闪避或主武器。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <label className="block space-y-1 text-sm font-medium">
            <span>额外职业</span>
            <select
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
          <label className="block space-y-1 text-sm font-medium">
            <span>初始分支</span>
            <select className={selectClass} value={branchId} onChange={event => setBranchId(event.target.value)} disabled={!professionId}>
              <option value="">请选择</option>
              {branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>领域</span>
            <select className={selectClass} value={domainId} onChange={event => setDomainId(event.target.value)}>
              <option value="">请选择</option>
              {rhodesIslandCatalog.domains.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={!professionId || !branchId || !domainId} onClick={confirm}>确认兼职</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

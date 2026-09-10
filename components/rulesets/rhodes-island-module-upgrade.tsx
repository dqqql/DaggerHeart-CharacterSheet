import type { UpgradeOption } from "@/data/list/upgrade"
import { getRhodesBranch } from "@/lib/rulesets/rhodes-island/automation"

interface RhodesIslandModuleUpgradeProps {
  branchId: string | undefined
  option: UpgradeOption
  selectedModule: "x" | "y" | undefined
  onSelect: (module: "x" | "y") => void
}

export function RhodesIslandModuleUpgrade({
  branchId,
  option,
  selectedModule,
  onSelect,
}: RhodesIslandModuleUpgradeProps) {
  const branch = getRhodesBranch(branchId)

  return (
    <div data-module-upgrade-section className="mt-3 border-t-2 border-cyan-700 pt-2">
      <div className="text-[10px] leading-[1.6] text-gray-800 dark:text-gray-200">
        {option.label}
      </div>

      {branch && (
        <div className="mt-2 border-l-4 border-cyan-700 bg-slate-50 p-2 print:border-slate-500">
          <div className="grid grid-cols-2 gap-1">
            {(["x", "y"] as const).map((moduleId) => {
              const module = branch.modules[moduleId]
              const selected = selectedModule === moduleId

              return (
                <button
                  key={moduleId}
                  type="button"
                  aria-label={module.name}
                  aria-pressed={selected}
                  className={`flex items-center gap-1 border px-1 py-1 text-left text-[9px] font-bold transition-colors ${selected ? "border-cyan-800 bg-cyan-800 text-white" : "border-slate-400 bg-white text-slate-700"}`}
                  title={module.description}
                  onClick={() => onSelect(moduleId)}
                >
                  <span aria-hidden="true" className={`inline-block h-3 w-3 border ${selected ? "border-white bg-white" : "border-gray-800 bg-white"}`} />
                  {module.name}
                </button>
              )
            })}
          </div>
          {selectedModule && (
            <p className="mt-1 whitespace-pre-line text-[8px] leading-snug text-slate-600">
              {branch.modules[selectedModule].description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

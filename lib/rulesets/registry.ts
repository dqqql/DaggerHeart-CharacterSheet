import type { RuleSetId } from "@/lib/sheet-data"
import { daggerheartRuleSet } from "@/lib/rulesets/daggerheart/definition"
import { rhodesIslandRuleSet } from "@/lib/rulesets/rhodes-island/definition"
import type { RuleSetModule } from "@/lib/rulesets/types"

const RULE_SET_MODULES = {
  daggerheart: daggerheartRuleSet,
  "rhodes-island": rhodesIslandRuleSet,
} satisfies Record<RuleSetId, RuleSetModule>

export function getRuleSetModule(id: RuleSetId): RuleSetModule {
  return RULE_SET_MODULES[id]
}

export const RULE_SET_LABELS: Record<RuleSetId, string> = Object.fromEntries(
  Object.values(RULE_SET_MODULES).map(module => [module.id, module.label]),
) as Record<RuleSetId, string>

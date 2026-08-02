import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RuleSetId } from './sheet-data'

const DEFAULT_TEXT_MODE_BY_RULE_SET: Record<RuleSetId, boolean> = {
  daggerheart: false,
  'rhodes-island': false,
}

interface TextModeStore {
  isTextMode: boolean
  activeRuleSetId: RuleSetId
  textModeByRuleSet: Record<RuleSetId, boolean>
  toggleTextMode: () => void
  setTextMode: (enabled: boolean) => void
  setRuleSet: (ruleSetId: RuleSetId) => void
}

export const useTextModeStore = create<TextModeStore>()(
  persist(
    (set) => ({
      isTextMode: false,
      activeRuleSetId: 'daggerheart',
      // 新规则首次进入默认图片模式；两套规则之后分别记忆。
      textModeByRuleSet: { ...DEFAULT_TEXT_MODE_BY_RULE_SET },
      
      toggleTextMode: () => set((state) => {
        const enabled = !state.isTextMode
        return {
          isTextMode: enabled,
          textModeByRuleSet: { ...state.textModeByRuleSet, [state.activeRuleSetId]: enabled },
        }
      }),

      setTextMode: (enabled: boolean) => set((state) => ({
        isTextMode: enabled,
        textModeByRuleSet: { ...state.textModeByRuleSet, [state.activeRuleSetId]: enabled },
      })),

      setRuleSet: (ruleSetId: RuleSetId) => set((state) => ({
        activeRuleSetId: ruleSetId,
        isTextMode: state.textModeByRuleSet?.[ruleSetId] ?? false,
      })),
    }),
    {
      name: 'text-mode-storage',
      version: 1,
      migrate: (persisted: unknown) => {
        const legacy = persisted && typeof persisted === 'object'
          ? persisted as Partial<TextModeStore>
          : {}
        const daggerheartMode = typeof legacy.isTextMode === 'boolean'
          ? legacy.isTextMode
          : DEFAULT_TEXT_MODE_BY_RULE_SET.daggerheart
        const activeRuleSetId = legacy.activeRuleSetId === 'rhodes-island'
          ? 'rhodes-island'
          : 'daggerheart'
        const textModeByRuleSet = {
          daggerheart: legacy.textModeByRuleSet?.daggerheart ?? daggerheartMode,
          'rhodes-island': legacy.textModeByRuleSet?.['rhodes-island'] ?? DEFAULT_TEXT_MODE_BY_RULE_SET['rhodes-island'],
        }
        return {
          ...legacy,
          activeRuleSetId,
          textModeByRuleSet,
          isTextMode: textModeByRuleSet[activeRuleSetId],
        } as TextModeStore
      },
    }
  )
)

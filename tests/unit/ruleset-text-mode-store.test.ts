import { beforeEach, describe, expect, it } from "vitest"

import { useTextModeStore } from "@/lib/text-mode-store"

describe("ruleset text mode preferences", () => {
  beforeEach(() => {
    const store = useTextModeStore.getState()
    store.setRuleSet("daggerheart")
    store.setTextMode(false)
    store.setRuleSet("rhodes-island")
    store.setTextMode(false)
  })

  it("remembers display mode independently per ruleset", () => {
    const store = useTextModeStore.getState()
    store.setRuleSet("daggerheart")
    store.setTextMode(true)

    store.setRuleSet("rhodes-island")
    expect(useTextModeStore.getState().isTextMode).toBe(false)

    useTextModeStore.getState().setRuleSet("daggerheart")
    expect(useTextModeStore.getState().isTextMode).toBe(true)
  })
})

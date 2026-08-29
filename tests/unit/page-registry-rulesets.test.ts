import { beforeEach, describe, expect, it } from "vitest"

import { CHARACTER_SHEET_PAGES } from "@/components/layout/character-sheet-pages"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  clearRegistry,
  getTabPages,
  registerPages,
  resolveVisibleTabValue,
} from "@/lib/page-registry"
import type { RuleSetId, SheetData } from "@/lib/sheet-data"

function sheetDataFor(ruleSetId: RuleSetId): SheetData {
  return {
    ...defaultSheetData,
    ruleSetId,
    pageVisibility: {
      ...defaultSheetData.pageVisibility!,
      rangerCompanion: true,
      armorTemplate: true,
      adventureNotes: true,
      relationshipQuestions: true,
    },
  }
}

describe("page registry ruleset policies", () => {
  beforeEach(() => {
    clearRegistry()
    registerPages(CHARACTER_SHEET_PAGES)
  })

  it.each(["daggerheart", "rhodes-island"] satisfies RuleSetId[])(
    "shows the first two pages for %s",
    ruleSetId => {
      const pageIds = getTabPages(sheetDataFor(ruleSetId)).map(page => page.id)

      expect(pageIds).toEqual(expect.arrayContaining(["page1", "page2"]))
    },
  )

  it("shows the relationship page only for Rhodes Island", () => {
    expect(getTabPages(sheetDataFor("rhodes-island")).map(page => page.id)).toContain(
      "rhodes-relationships",
    )
    expect(getTabPages(sheetDataFor("daggerheart")).map(page => page.id)).not.toContain(
      "rhodes-relationships",
    )
  })

  it.each(["page3", "page4", "adventure-notes"])(
    "shows %s only for Daggerheart",
    pageId => {
      expect(getTabPages(sheetDataFor("daggerheart")).map(page => page.id)).toContain(pageId)
      expect(getTabPages(sheetDataFor("rhodes-island")).map(page => page.id)).not.toContain(pageId)
    },
  )

  it("falls back instead of retaining a selected tab hidden by a ruleset switch", () => {
    const selectedTab = "rhodes-relationships"
    const daggerheartPages = getTabPages(sheetDataFor("daggerheart"))

    expect(resolveVisibleTabValue(selectedTab, daggerheartPages)).toBe("page1")
  })
})

import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { defaultSheetData } from "@/lib/default-sheet-data"
import { useDualPageStore } from "@/lib/dual-page-store"
import { useSheetStore } from "@/lib/sheet-store"

const homeState = vi.hoisted(() => ({
  activeRuleSetId: "daggerheart" as "daggerheart" | "rhodes-island",
}))

vi.mock("@/components/layout/character-sheet-pages", () => {
  const Page = () => null
  return {
    CHARACTER_SHEET_PAGES: [
      {
        id: "page1",
        label: "第一页",
        component: Page,
        printClass: "page-one",
        visibility: { type: "always" },
        printOrder: 1,
      },
      {
        id: "page2",
        label: "第二页",
        component: Page,
        printClass: "page-two",
        visibility: { type: "always" },
        printOrder: 2,
      },
      {
        id: "rhodes-relationships",
        label: "关系与问题",
        component: Page,
        printClass: "page-rhodes-relationships",
        ruleSetIds: ["rhodes-island"],
        visibility: { type: "config", configKey: "relationshipQuestions" },
        printOrder: 3,
      },
    ],
  }
})

vi.mock("@/hooks/use-character-management", () => ({
  useCharacterManagement: () => ({
    currentCharacterId: null,
    activeRuleSetId: homeState.activeRuleSetId,
    characterList: [],
    isLoading: false,
    switchToCharacter: vi.fn(),
    switchRuleSetHandler: vi.fn(),
    createNewCharacterHandler: vi.fn(),
    deleteCharacterHandler: vi.fn(),
    duplicateCharacterHandler: vi.fn(),
    renameCharacterHandler: vi.fn(),
    handleQuickCreateArchive: vi.fn(),
    persistCharacterData: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-export-handlers", () => ({
  useExportHandlers: () => ({
    handlePrintAll: vi.fn(),
    handleExportHTML: vi.fn(),
    handleExportJSON: vi.fn(),
    handleExportCharacterCode: vi.fn(),
    handleQuickExportPDF: vi.fn(),
    handleQuickExportHTML: vi.fn(),
    handleQuickExportJSON: vi.fn(),
  }),
}))
vi.mock("@/hooks/use-sheet-auto-save", () => ({ useSheetAutoSave: vi.fn() }))
vi.mock("@/lib/announcements", () => ({ getAnnouncements: () => [] }))
vi.mock("@/lib/announcement-index", () => ({ getLatestAnnouncementId: () => null }))
vi.mock("@/lib/official-image-pack", () => ({
  clearOfficialImagePackData: vi.fn(),
  importOfficialImagePack: vi.fn(),
}))
vi.mock("@/components/card-drawer", () => ({ CardDrawer: () => null }))
vi.mock("@/components/card-system-initializer", () => ({ CardSystemInitializer: () => null }))
vi.mock("@/components/layout/bottom-dock", () => ({ BottomDock: () => null }))
vi.mock("@/components/ui/save-switcher", () => ({ SaveSwitcher: () => null }))
vi.mock("@/components/ui/pinned-card-window", () => ({ PinnedCardWindow: () => null }))
vi.mock("@/components/modals/card-selection-modal", () => ({ CardSelectionModal: () => null }))
vi.mock("@/components/modals/announcement-modal", () => ({ AnnouncementModal: () => null }))
vi.mock("@/components/layout/page-display", () => ({
  PageDisplay: ({ currentTabValue, visibleTabs }: {
    currentTabValue: string
    visibleTabs: Array<{ id: string }>
  }) => (
    <div
      data-testid="page-display-state"
      data-current-tab={currentTabValue}
      data-visible-tabs={visibleTabs.map(page => page.id).join(",")}
    />
  ),
}))
vi.mock("@/lib/announcement-store", () => ({
  useAnnouncementStore: () => ({
    lastSeenAnnouncementId: null,
    hydrated: false,
    markAnnouncementSeen: vi.fn(),
  }),
}))
vi.mock("@/lib/official-image-pack-store", () => ({
  useOfficialImagePackStore: () => ({
    metadata: null,
    hydrated: true,
    setMetadata: vi.fn(),
    clearMetadata: vi.fn(),
  }),
}))
vi.mock("@/lib/pinned-cards-store", () => ({
  usePinnedCardsStore: () => ({ pinnedCards: [] }),
}))

import Home from "@/app/page"

function setRuleSet(ruleSetId: "daggerheart" | "rhodes-island") {
  homeState.activeRuleSetId = ruleSetId
  useSheetStore.setState({
    sheetData: {
      ...defaultSheetData,
      ruleSetId,
      pageVisibility: {
        ...defaultSheetData.pageVisibility!,
        relationshipQuestions: true,
      },
    },
  })
}

describe("Home page navigation ruleset integration", () => {
  beforeEach(() => {
    setRuleSet("daggerheart")
    useDualPageStore.setState({
      isDualPageMode: false,
      leftPageId: "page1",
      rightPageId: "page2",
      leftTabValue: "page1",
      rightTabValue: "page2",
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps Daggerheart arrow and number shortcuts active when showing the shortcut hint", async () => {
    vi.useFakeTimers()
    const { container } = render(<Home />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText("⌨️ 快捷键提示")).toBeInTheDocument()

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })))
    expect(screen.getByTestId("page-display-state")).toHaveAttribute("data-current-tab", "page2")

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true })))
    expect(screen.getByTestId("page-display-state")).toHaveAttribute("data-current-tab", "page1")

    expect(container.querySelector("main")).toHaveAttribute("data-ruleset", "daggerheart")
    expect(container.querySelector("main")).not.toHaveClass("rhodes-island-shell")
  })

  it("reconciles Home single and dual-page selections after a ruleset switch", async () => {
    setRuleSet("rhodes-island")
    useDualPageStore.setState({
      leftPageId: "rhodes-relationships",
      rightPageId: "rhodes-relationships",
      leftTabValue: "rhodes-relationships",
      rightTabValue: "rhodes-relationships",
    })
    const { container, rerender } = render(<Home />)

    expect(container.querySelector("main")).toHaveClass("rhodes-island-shell")

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "3", bubbles: true })))
    expect(screen.getByTestId("page-display-state")).toHaveAttribute(
      "data-current-tab",
      "rhodes-relationships",
    )

    act(() => setRuleSet("daggerheart"))
    rerender(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId("page-display-state")).toHaveAttribute("data-current-tab", "page1")
      expect(useDualPageStore.getState().leftTabValue).toBe("page1")
      expect(useDualPageStore.getState().rightTabValue).toBe("page1")
      expect(container.querySelector("main")).not.toHaveClass("rhodes-island-shell")
    })
  })
})

import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import CharacterSheetPageRhodesRelationships from "@/components/character-sheet-page-rhodes-relationships"
import { PageVisibilityDropdown } from "@/components/ui/page-visibility-dropdown"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { useSheetStore } from "@/lib/sheet-store"
import {
  getRhodesIslandRelationshipPrompts,
  RHODES_ISLAND_RELATIONSHIP_PROMPTS,
} from "@/data/rhodes-island/relationship-questions"
import { rhodesIslandCatalog } from "@/data/rhodes-island"

const originalSheetData = useSheetStore.getState().sheetData

describe("Rhodes Island relationship questions page", () => {
  beforeEach(() => {
    const profession = rhodesIslandCatalog.professions.find(
      (item) => item.name === "先锋",
    )!
    act(() => {
      useSheetStore.setState({
        sheetData: {
          ...defaultSheetData,
          ruleSetId: "rhodes-island",
          profession: profession.id,
          professionRef: { id: profession.id, name: profession.name },
          pageVisibility: {
            ...defaultSheetData.pageVisibility!,
            relationshipQuestions: true,
          },
        },
      })
    })
  })

  afterEach(() => {
    act(() => {
      useSheetStore.setState({ sheetData: originalSheetData })
    })
  })

  it("contains three background prompts and three relationship prompts for every profession", () => {
    expect(Object.keys(RHODES_ISLAND_RELATIONSHIP_PROMPTS).sort()).toEqual(
      rhodesIslandCatalog.professions.map((item) => item.name).sort(),
    )

    for (const profession of rhodesIslandCatalog.professions) {
      const prompts = getRhodesIslandRelationshipPrompts(profession.name)
      expect(prompts?.backgroundQuestions).toHaveLength(3)
      expect(prompts?.relationships).toHaveLength(3)
    }
  })

  it("shows the selected profession prompts and saves each answer under that profession", async () => {
    const user = userEvent.setup()
    render(<CharacterSheetPageRhodesRelationships />)

    const answerField = screen.getByLabelText(
      /你因什么原因而总是主动选择冲在队伍的最前方？/,
    )
    await user.type(answerField, "为了保护身后的队友。")

    const professionId = useSheetStore.getState().sheetData.professionRef?.id
    expect(
      useSheetStore.getState().sheetData.rhodesIslandRelationshipAnswers?.[
        professionId!
      ].backgroundQuestions[0],
    ).toBe("为了保护身后的队友。")
  })

  it("offers only the relationship page in the Rhodes Island gear menu and enables printing visibility", async () => {
    const user = userEvent.setup()
    act(() => {
      useSheetStore.setState((state) => ({
        sheetData: {
          ...state.sheetData,
          pageVisibility: {
            ...state.sheetData.pageVisibility!,
            relationshipQuestions: false,
          },
        },
      }))
    })
    render(<PageVisibilityDropdown />)

    await user.click(
      screen.getByRole("button", { name: "管理页面显示" }),
    )

    expect(await screen.findByText("关系与问题")).toBeInTheDocument()
    expect(screen.queryByText("冒险笔记")).not.toBeInTheDocument()
    expect(screen.queryByText("游侠伙伴")).not.toBeInTheDocument()

    await user.click(screen.getByText("关系与问题"))

    expect(
      useSheetStore.getState().sheetData.pageVisibility?.relationshipQuestions,
    ).toBe(true)
  })
})

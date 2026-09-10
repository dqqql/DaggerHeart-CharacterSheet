import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { UpgradeSection } from "@/components/character-sheet-page-two-sections/upgrade-section"
import { rhodesIslandCatalog } from "@/data/rhodes-island"
import { rhodesIslandUpgradeOptionsData } from "@/data/list/upgrade"
import { defaultSheetData } from "@/lib/default-sheet-data"

const setSheetData = vi.fn()

vi.mock("@/lib/sheet-store", () => ({
  useSheetStore: (selector: (state: unknown) => unknown) =>
    selector({
      updateLevel: vi.fn(),
      setSheetData,
    }),
}))

describe("UpgradeSection Rhodes Island layout", () => {
  it("uses the Rhodes Island no-box instruction and places the module option after the upgrade list", () => {
    const moduleLabel = "所选模组器："

    render(
      <UpgradeSection
        tier={3}
        title="T4："
        description="当你到达 8 级时，解锁一项专属模组"
        formData={{ ...defaultSheetData, ruleSetId: "rhodes-island", subclassRef: { id: rhodesIslandCatalog.branches[0].id, name: rhodesIslandCatalog.branches[0].name } }}
        isUpgradeChecked={() => false}
        handleUpgradeCheck={vi.fn()}
        toggleUpgradeCheckbox={vi.fn()}
        getUpgradeOptions={() => [
          { id: "test-evasion", action: "evasion", label: "获得闪避值+1。", doubleBox: false, boxCount: 1, stateIndex: 5 },
          { id: "test-module", action: "select-module", label: moduleLabel, doubleBox: false, boxCount: 1, stateIndex: 6 },
          { id: "test-proficiency", action: "proficiency", label: "(同时标记两格) 获得熟练值+1。", doubleBox: true, boxCount: 2, stateIndex: 7 },
        ]}
      />,
    )

    const instruction = screen.getByText("每升1级便从下面列表中选择两个选项格子并标记它们")
    const moduleSection = screen.getByText(moduleLabel).closest("[data-module-upgrade-section]")

    expect(moduleSection).not.toBeNull()
    expect(moduleSection).toHaveClass("border-t-2", "border-cyan-700")
    expect(instruction.compareDocumentPosition(moduleSection!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.queryByText(/将伤害阈值\+1/)).not.toBeInTheDocument()
  })

  it("defines the screenshot text and automatic upgrades for all three Rhodes Island tiers", () => {
    expect(rhodesIslandUpgradeOptionsData.tier1).toMatchObject([
      { label: "强化训练：两项未标记的角色属性+1，然后标记它们", boxCount: 3 },
      { label: "体能训练：获得一个生命槽", boxCount: 2 },
      { label: "意志训练：获得一个压力槽", boxCount: 2 },
      { label: "发展规划：选择你的两项经历+1", boxCount: 1 },
      { label: expect.stringContaining("最高为4级"), boxCount: 1 },
      { label: "机动训练：闪避值+1", boxCount: 1 },
      { label: expect.stringContaining("最高为2级"), doubleBox: true, boxCount: 2 },
      { label: "提升武器原型：将你的武器原型等级提升至正式干员级别", boxCount: 0, automatic: true },
    ])
    expect(rhodesIslandUpgradeOptionsData.tier2.at(-2)).toMatchObject({
      label: "实战模拟：熟练值+1",
      doubleBox: true,
      boxCount: 2,
    })
    expect(rhodesIslandUpgradeOptionsData.tier2.at(-1)).toMatchObject({
      label: "提升武器原型：将你的武器原型等级提升至资深干员级别",
      boxCount: 0,
      automatic: true,
    })
    expect(rhodesIslandUpgradeOptionsData.tier3).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: expect.stringContaining("最高为10级") }),
        expect.objectContaining({ label: expect.stringContaining("最高为5级") }),
      ]),
    )
    expect(
      Object.values(rhodesIslandUpgradeOptionsData)
        .flat()
        .filter(option => option.id.includes("cross-domain")),
    ).toEqual([
      expect.objectContaining({ doubleBox: true, boxCount: 2 }),
      expect.objectContaining({ doubleBox: true, boxCount: 2 }),
      expect.objectContaining({ doubleBox: true, boxCount: 2 }),
    ])
  })

  it("places combat simulation above the divider and renders the automatic weapon upgrade without a checkbox or highlight", () => {
    const { container } = render(
      <UpgradeSection
        tier={2}
        title="T3："
        description="当你到达 5 级时自动提升"
        formData={{ ...defaultSheetData, ruleSetId: "rhodes-island", subclassRef: { id: rhodesIslandCatalog.branches[0].id, name: rhodesIslandCatalog.branches[0].name } }}
        isUpgradeChecked={() => false}
        handleUpgradeCheck={vi.fn()}
        toggleUpgradeCheckbox={vi.fn()}
        getUpgradeOptions={() => [...rhodesIslandUpgradeOptionsData.tier2]}
      />,
    )

    const proficiency = screen.getByText("实战模拟：熟练值+1")
    const weaponUpgrade = screen.getByText("提升武器原型：将你的武器原型等级提升至资深干员级别")
    const divider = container.querySelector("[data-automatic-upgrade-divider]")!

    expect(proficiency.compareDocumentPosition(divider)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(divider.compareDocumentPosition(weaponUpgrade)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.queryByRole("button", { name: /提升武器原型/ })).not.toBeInTheDocument()
    expect(weaponUpgrade).toHaveClass("text-gray-800")
    expect(screen.getByText(/技艺交流/)).toHaveClass("text-gray-800")
  })

  it("keeps legacy persisted indices attached to their original automation", () => {
    render(
      <UpgradeSection
        tier={3}
        title="T4："
        description="当你到达 8 级时，解锁一项专属模组"
        formData={{ ...defaultSheetData, ruleSetId: "rhodes-island", subclassRef: { id: rhodesIslandCatalog.branches[0].id, name: rhodesIslandCatalog.branches[0].name } }}
        isUpgradeChecked={(key, index) => key === "tier3-6-0" && index === 6}
        handleUpgradeCheck={vi.fn()}
        toggleUpgradeCheckbox={vi.fn()}
        getUpgradeOptions={() => [...rhodesIslandUpgradeOptionsData.tier3]}
      />,
    )

    expect(screen.getByRole("button", { name: "机动训练：闪避值+1" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "X模组" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "Y模组" })).toHaveAttribute("aria-pressed", "false")
  })
})

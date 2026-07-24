import { act, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { CardHoverPreview } from "@/components/ui/card-hover-preview"
import {
  getRhodesProfessionDomain,
  ProfessionDomainAnimation,
  RhodesDomainIcon,
} from "@/components/rhodes-island/domain-icon"

function createRhodesCard(overrides: Partial<StandardCard>): StandardCard {
  return {
    standarized: true,
    ruleset: "rhodes-island",
    id: "test-card",
    name: "测试卡",
    type: "profession",
    class: "测试",
    description: "测试说明",
    cardSelectDisplay: {},
    ...overrides,
  }
}

describe("Rhodes Island domain icons", () => {
  it("maps every Rhodes Island profession to its primary domain", () => {
    expect(getRhodesProfessionDomain("ri-profession-2d1b8c4a3249")).toBe("迅攻")
    expect(getRhodesProfessionDomain("ri-profession-81bb919f5f13")).toBe("攻坚")
    expect(getRhodesProfessionDomain("ri-profession-102152bab2bd")).toBe("精准")
    expect(getRhodesProfessionDomain("ri-profession-1fed1ec9a637")).toBe("奥术")
    expect(getRhodesProfessionDomain("ri-profession-1529538bc255")).toBe("秘行")
    expect(getRhodesProfessionDomain("ri-profession-76d8dd1c763a")).toBe("坚阵")
    expect(getRhodesProfessionDomain("ri-profession-0319582eb790")).toBe("支柱")
  })

  it("renders animated SVG parts instead of a raster profession image", () => {
    const { container } = render(<RhodesDomainIcon domain="迅攻" animated />)

    expect(screen.getByRole("img", { name: "迅攻领域图标" })).toBeInTheDocument()
    expect(container.querySelector(".rhodes-domain-icon--animated")).toBeInTheDocument()
    expect(container.querySelectorAll(".ak-part")).toHaveLength(4)
  })

  it("waits 500ms before mounting the selected profession animation", () => {
    vi.useFakeTimers()

    render(
      <ProfessionDomainAnimation
        professionId="ri-profession-2d1b8c4a3249"
        replayKey={1}
      />,
    )

    expect(screen.queryByRole("img", { name: "迅攻领域图标" })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(screen.queryByRole("img", { name: "迅攻领域图标" })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole("img", { name: "迅攻领域图标" })).toBeInTheDocument()

    vi.useRealTimers()
  })

  it("shows a profession primary domain in the hover preview", async () => {
    render(
      <CardHoverPreview
        card={createRhodesCard({
          name: "先锋",
          cardSelectDisplay: { item1: "迅攻" },
        })}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "迅攻领域图标" })).toBeInTheDocument()
      expect(screen.getByText("BLITZ")).toBeInTheDocument()
    })
  })

  it("shows both recommended domains in a branch hover preview", async () => {
    render(
      <CardHoverPreview
        card={createRhodesCard({
          name: "冲锋手",
          type: "subclass",
          cardSelectDisplay: {
            item1: "先锋",
            item2: "预备干员",
            item3: "第二领域推荐：秘行/攻坚",
          },
        })}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "秘行领域图标" })).toBeInTheDocument()
      expect(screen.getByRole("img", { name: "攻坚领域图标" })).toBeInTheDocument()
      expect(screen.getByText("STEALTH")).toBeInTheDocument()
      expect(screen.getByText("ASSAULT")).toBeInTheDocument()
    })
  })
})

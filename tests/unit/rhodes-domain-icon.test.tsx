import { act, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { CardHoverPreview } from "@/components/ui/card-hover-preview"
import {
  DualDomainAnimation,
  getRhodesProfessionDomain,
  ProfessionDomainAnimation,
  RhodesDomainIcon,
} from "@/components/rhodes-island/domain-icon"

vi.mock("next/image", () => ({
  default: ({ fill: _fill, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} />
  ),
}))

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

  it("waits 500ms before mounting and releases animation hints after the sequence", () => {
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
    const icon = screen.getByRole("img", { name: "迅攻领域图标" })
    expect(icon).toHaveClass("rhodes-domain-icon--animated")

    act(() => {
      vi.advanceTimersByTime(8250)
    })
    expect(icon).not.toHaveClass("rhodes-domain-icon--animated")
    expect(icon).toHaveClass("rhodes-domain-icon--glow")

    vi.useRealTimers()
  })

  it("mounts both domain screens together on entry and keeps them visually joined", () => {
    vi.useFakeTimers()

    const { container } = render(
      <DualDomainAnimation
        professionId="ri-profession-102152bab2bd"
        secondaryDomain="奇迹"
      />,
    )

    expect(screen.queryByRole("img", { name: "精准领域图标" })).not.toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "奇迹领域图标" })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByRole("img", { name: "精准领域图标" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "奇迹领域图标" })).toBeInTheDocument()
    expect(container.querySelector('[aria-label="主职业与次选领域动画"]')?.children).toHaveLength(4)

    vi.useRealTimers()
  })

  it("replays the secondary screen without remounting the profession screen", () => {
    vi.useFakeTimers()

    const { rerender } = render(
      <DualDomainAnimation
        professionId="ri-profession-102152bab2bd"
        replayKey={1}
        secondaryDomain="奇迹"
        secondaryReplayKey={1}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(500)
    })

    const professionIcon = screen.getByRole("img", { name: "精准领域图标" })

    rerender(
      <DualDomainAnimation
        professionId="ri-profession-102152bab2bd"
        replayKey={1}
        secondaryDomain="奇迹"
        secondaryReplayKey={2}
      />,
    )

    expect(screen.getByRole("img", { name: "精准领域图标" })).toBe(professionIcon)
    expect(screen.queryByRole("img", { name: "奇迹领域图标" })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByRole("img", { name: "精准领域图标" })).toBe(professionIcon)
    expect(screen.getByRole("img", { name: "奇迹领域图标" })).toBeInTheDocument()

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

  it("shows only the card image for a domain card hover preview", async () => {
    render(
      <CardHoverPreview
        card={createRhodesCard({
          name: "一心双响",
          type: "domain",
          description: "不应在卡图旁重复展示的规则文本",
          imageUrl: "/rhodes-island/domains/arcane/32065fe36e1c.webp",
          cardSelectDisplay: {
            item1: "奥术",
            item2: "能力",
            item3: "RC.2",
          },
        })}
        isTextMode
      />,
    )

    const preview = await screen.findByTestId("domain-card-image-preview")
    expect(screen.getByRole("img", { name: "一心双响卡图" })).toBeInTheDocument()
    expect(preview).toHaveClass("aspect-[5/7]")
    expect(screen.queryByText("一心双响")).not.toBeInTheDocument()
    expect(screen.queryByText("不应在卡图旁重复展示的规则文本")).not.toBeInTheDocument()
    expect(screen.queryByText("奥术")).not.toBeInTheDocument()
  })
})

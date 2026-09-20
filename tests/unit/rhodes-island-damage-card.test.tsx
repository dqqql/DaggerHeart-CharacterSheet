import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CardHoverPreview } from "@/components/ui/card-hover-preview"
import { PrintImageCard } from "@/components/ui/print-image-card"
import { createRhodesElementalDamageCards } from "@/lib/rulesets/rhodes-island/damage-cards"

describe("本源铁卫损伤卡", () => {
  it("把六条损伤规则均匀拆成两张卡", () => {
    const [first, second] = createRhodesElementalDamageCards()

    expect(first.description).toContain("神经损伤")
    expect(first.description).toContain("凋亡损伤")
    expect(first.description).not.toContain("狂躁损伤")
    expect(second.description).toContain("狂躁损伤")
    expect(second.description).toContain("元素伤害")
  })

  it("悬浮预览完整展开且没有滚动容器", async () => {
    const [card] = createRhodesElementalDamageCards()
    const { container } = render(<CardHoverPreview card={card} />)

    await waitFor(() => expect(screen.getByText("神经损伤：")).toBeInTheDocument())
    expect(container.querySelector(".overflow-auto")).toBeNull()
    expect(container.querySelector(".overflow-y-auto")).toBeNull()
  })

  it("打印时省略装饰图并让正文自然撑开", async () => {
    const [card] = createRhodesElementalDamageCards()
    const { container } = render(<PrintImageCard card={card} />)

    expect(container.querySelector("img")).toBeNull()
    expect(container.firstElementChild).toHaveClass("overflow-visible")
    expect(container.querySelector(".print-card-description")).toHaveClass("overflow-visible")
    await waitFor(() => expect(screen.getByText("神经损伤：")).toBeInTheDocument())
  })
})

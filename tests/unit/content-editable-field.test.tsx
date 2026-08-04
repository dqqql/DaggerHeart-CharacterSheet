import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-textarea-autosize", () => ({
  default: ({ minRows, maxRows, ...props }: Record<string, any>) => (
    <textarea {...props} data-min-rows={minRows} data-max-rows={maxRows} />
  ),
}))

import { ContentEditableField } from "@/components/ui/content-editable-field"

describe("ContentEditableField", () => {
  it("keeps the compact height while allowing a long field to grow", () => {
    render(
      <ContentEditableField
        name="armorFeature"
        value="强化：当你标记最后一个护甲槽时，你的伤害阈值提升+2，直至你清除至少1个护甲槽。"
        onChange={vi.fn()}
        minLines={2}
        maxLines={3}
      />,
    )

    const textarea = screen.getByRole("textbox")
    expect(textarea).toHaveAttribute("data-min-rows", "2")
    expect(textarea).toHaveAttribute("data-max-rows", "3")
    expect(textarea).toHaveValue("强化：当你标记最后一个护甲槽时，你的伤害阈值提升+2，直至你清除至少1个护甲槽。")
  })
})

import { describe, expect, it } from "vitest"
import { highlightTextChanges } from "@/lib/text-change-highlighter"

describe("highlightTextChanges", () => {
  it("marks inserted and replaced text while keeping unchanged text unmarked", () => {
    const segments = highlightTextChanges(
      "临危寻变：花费 3 希望点。",
      "临危寻变-冲锋手：花费 2 希望点。额外移动。",
    )

    expect(segments.map(segment => segment.text).join("")).toBe("临危寻变-冲锋手：花费 2 希望点。额外移动。")
    expect(segments.filter(segment => segment.changed).map(segment => segment.text).join(""))
      .toContain("-冲锋手")
    expect(segments.filter(segment => segment.changed).map(segment => segment.text).join(""))
      .toContain("额外移动")
  })

  it("returns one unchanged segment for identical text", () => {
    expect(highlightTextChanges("相同文本", "相同文本"))
      .toEqual([{ text: "相同文本", changed: false }])
  })
})

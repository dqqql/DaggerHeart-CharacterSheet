import { describe, expect, it } from "vitest"

import {
  getRhodesDomainFilterOptions,
  getRhodesSecondaryDomainSelectionOptions,
} from "@/lib/rhodes-domain-filter"

describe("getRhodesDomainFilterOptions", () => {
  it("orders primary and secondary domains and marks their boundary", () => {
    const options = getRhodesDomainFilterOptions([
      "工业", "坚阵", "奇迹", "迅攻", "远见", "秘行",
      "奥术", "心界", "精准", "支柱", "攻坚",
    ])

    expect(options.map(option => option.value)).toEqual([
      "迅攻", "攻坚", "坚阵", "精准", "奥术", "支柱", "秘行",
      "远见", "奇迹", "心界", "工业",
    ])
    expect(options.filter(option => option.separatorBefore)).toEqual([
      { value: "远见", label: "远见", separatorBefore: "主次领域分界线" },
    ])
  })

  it("keeps unknown imported domains after the built-in domains", () => {
    expect(getRhodesDomainFilterOptions(["自定义乙", "迅攻", "自定义甲"]))
      .toEqual([
        { value: "迅攻", label: "迅攻" },
        { value: "自定义甲", label: "自定义甲" },
        { value: "自定义乙", label: "自定义乙" },
      ])
  })

  it("keeps the boundary when the first secondary domain is filtered out", () => {
    expect(getRhodesDomainFilterOptions(["心界", "迅攻", "奇迹"]))
      .toEqual([
        { value: "迅攻", label: "迅攻" },
        { value: "奇迹", label: "奇迹", separatorBefore: "主次领域分界线" },
        { value: "心界", label: "心界" },
      ])
  })

  it("offers every domain except the profession primary domain in selector order", () => {
    const options = getRhodesSecondaryDomainSelectionOptions("精准")

    expect(options.map(option => option.value)).toEqual([
      "迅攻", "攻坚", "坚阵", "奥术", "支柱", "秘行",
      "远见", "奇迹", "心界", "工业",
    ])
    expect(options.some(option => option.value === "精准")).toBe(false)
    expect(options.find(option => option.separatorBefore)).toEqual({
      value: "远见",
      label: "远见",
      separatorBefore: "主次领域分界线",
    })
  })
})

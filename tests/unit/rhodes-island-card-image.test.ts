import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import type { StandardCard } from "@/card/card-types"
import {
  RHODES_ISLAND_PLACEHOLDER_IMAGE,
  rhodesIslandCards,
  rhodesIslandCatalog,
} from "@/data/rhodes-island"
import { getCardImageUrl, getCardImageUrlAsync } from "@/lib/utils"

describe("Rhodes Island bundled card images", () => {
  it("uses the bundled ancestry image without the original image-pack prefix", async () => {
    const ancestry = rhodesIslandCards.find(card => card.id === "ri-ancestry-eae561990633") as unknown as StandardCard
    expect(getCardImageUrl(ancestry)).toBe("./rhodes-island/ancestries/01-eae561990633.webp")
    await expect(getCardImageUrlAsync(ancestry)).resolves.toBe("./rhodes-island/ancestries/01-eae561990633.webp")
  })

  it("uses bundled domain-card images in image mode", async () => {
    const card = rhodesIslandCards.find(card => card.id === "ri-domain-card-32065fe36e1c") as unknown as StandardCard
    expect(getCardImageUrl(card)).toBe("./rhodes-island/domains/arcane/32065fe36e1c.webp")
    await expect(getCardImageUrlAsync(card)).resolves.toBe("./rhodes-island/domains/arcane/32065fe36e1c.webp")
  })

  it("links every supplied card face and only leaves genuinely missing cards on the placeholder", () => {
    const domainCards = rhodesIslandCatalog.domainCards
    const missingCards = domainCards
      .filter(card => card.imageUrl === RHODES_ISLAND_PLACEHOLDER_IMAGE)
      .map(card => `${card.domain}/${card.name}`)

    expect(missingCards).toEqual([])
    expect(domainCards.filter(card => card.imageUrl !== RHODES_ISLAND_PLACEHOLDER_IMAGE)).toHaveLength(236)

    for (const imageUrl of new Set(domainCards.map(card => card.imageUrl))) {
      if (imageUrl === RHODES_ISLAND_PLACEHOLDER_IMAGE) continue
      expect(existsSync(join(process.cwd(), "public", imageUrl))).toBe(true)
    }
  })

  it("keeps the final source map, catalog, and output directory one-to-one", () => {
    const sourceMap = JSON.parse(
      readFileSync(join(process.cwd(), "data", "rhodes-island", "domain-source-map.json"), "utf8"),
    ) as {
      mappings: Array<{ id: string; sourceFile: string; imageUrl: string }>
      unmatchedSources: unknown[]
    }
    const outputFiles = readdirSync(
      join(process.cwd(), "public", "rhodes-island", "domains"),
      { recursive: true, withFileTypes: true },
    ).filter(entry => entry.isFile() && entry.name.endsWith(".webp"))

    expect(sourceMap.mappings).toHaveLength(236)
    expect(sourceMap.unmatchedSources).toEqual([])
    expect(new Set(sourceMap.mappings.map(mapping => mapping.id)).size).toBe(236)
    expect(new Set(sourceMap.mappings.map(mapping => mapping.sourceFile)).size).toBe(236)
    expect(new Set(sourceMap.mappings.map(mapping => mapping.imageUrl)).size).toBe(236)
    expect(outputFiles).toHaveLength(236)
    expect(rhodesIslandCatalog.domainCards.map(card => card.id)).toEqual(
      sourceMap.mappings.map(mapping => mapping.id),
    )
    expect(
      rhodesIslandCards
        .filter(card => card.type === "domain")
        .map(card => card.id),
    ).toEqual(sourceMap.mappings.map(mapping => mapping.id))

    for (const mapping of sourceMap.mappings) {
      const card = rhodesIslandCatalog.domainCards.find(item => item.id === mapping.id)
      expect(card?.imageUrl).toBe(mapping.imageUrl)
    }
  })

  it("keeps Industrial cards in the card-overview reading order", () => {
    expect(
      rhodesIslandCatalog.domainCards
        .filter(card => card.domain === "工业")
        .map(card => card.name),
    ).toEqual([
      "精准投放",
      "涤净流程",
      "前方施工",
      "钢铁拟心",
      "奇思妙想",
      "运载助手",
      "牵引绳索",
      "神工意匠",
      "全线警报",
      "加速航道",
      "定向崩毁",
      "筑固有方",
      "不息熔炉",
      "工业誓约",
      "天堂坠落",
      "巧筑八方",
      "团结一心",
      "反击炮火",
      "一墟作烬",
      "号令巨兵",
      "辉煌裂片",
      "召唤：炮台",
      "召唤：巨兵",
    ])
  })

  it("bundles a dedicated image for every community", () => {
    const communities = rhodesIslandCatalog.communities

    expect(communities).toHaveLength(15)
    expect(communities.some(community => community.imageUrl === RHODES_ISLAND_PLACEHOLDER_IMAGE)).toBe(false)

    for (const community of communities) {
      expect(community.imageUrl).toMatch(/^\/rhodes-island\/communities\/[a-f0-9]{12}\.webp$/)
      expect(existsSync(join(process.cwd(), "public", community.imageUrl))).toBe(true)
    }
  })
})

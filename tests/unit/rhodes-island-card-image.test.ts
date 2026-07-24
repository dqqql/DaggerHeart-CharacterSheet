import { existsSync } from "node:fs"
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
    expect(domainCards.filter(card => card.imageUrl !== RHODES_ISLAND_PLACEHOLDER_IMAGE)).toHaveLength(228)

    for (const imageUrl of new Set(domainCards.map(card => card.imageUrl))) {
      if (imageUrl === RHODES_ISLAND_PLACEHOLDER_IMAGE) continue
      expect(existsSync(join(process.cwd(), "public", imageUrl))).toBe(true)
    }
  })
})

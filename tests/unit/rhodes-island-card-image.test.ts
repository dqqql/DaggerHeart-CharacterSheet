import { describe, expect, it } from "vitest"

import type { StandardCard } from "@/card/card-types"
import { rhodesIslandCards } from "@/data/rhodes-island"
import { getCardImageUrl, getCardImageUrlAsync } from "@/lib/utils"

describe("Rhodes Island bundled card images", () => {
  it("uses the bundled ancestry image without the original image-pack prefix", async () => {
    const ancestry = rhodesIslandCards.find(card => card.id === "ri-ancestry-eae561990633") as unknown as StandardCard
    expect(getCardImageUrl(ancestry)).toBe("./rhodes-island/ancestries/01-eae561990633.webp")
    await expect(getCardImageUrlAsync(ancestry)).resolves.toBe("./rhodes-island/ancestries/01-eae561990633.webp")
  })
})

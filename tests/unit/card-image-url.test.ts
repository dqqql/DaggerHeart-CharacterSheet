import { beforeEach, describe, expect, it, vi } from "vitest"

const { getOfficialImageUrlMock } = vi.hoisted(() => ({
  getOfficialImageUrlMock: vi.fn(),
}))

vi.mock("@/card/stores/unified-card-store", () => ({
  useUnifiedCardStore: {
    getState: () => ({
      initialized: false,
      getCardById: vi.fn(),
      imageService: {
        initialized: false,
      },
      getImageUrl: vi.fn(),
    }),
  },
}))

vi.mock("@/lib/official-image-pack", () => ({
  getOfficialImageUrl: (...args: unknown[]) => getOfficialImageUrlMock(...args),
  isBuiltinCard: (card: { id?: string } | undefined) =>
    typeof card?.id === "string" && card.id.startsWith("builtin-"),
}))

import { getCardImageUrlAsync } from "@/lib/utils"

describe("getCardImageUrlAsync", () => {
  beforeEach(() => {
    getOfficialImageUrlMock.mockReset()
  })

  it("returns the shared placeholder for builtin cards when no official image is available", async () => {
    getOfficialImageUrlMock.mockResolvedValue(null)

    const url = await getCardImageUrlAsync({
      id: "builtin-bard",
      imageUrl: "/builtin-cards/profession/bard.webp",
    } as never)

    expect(getOfficialImageUrlMock).toHaveBeenCalledWith("builtin-bard")
    expect(url).toBe("./image/empty-card.webp")
  })

  it("returns the official image blob url for builtin cards when available", async () => {
    getOfficialImageUrlMock.mockResolvedValue("blob:official-image")

    const url = await getCardImageUrlAsync({
      id: "builtin-bard",
      imageUrl: "/builtin-cards/profession/bard.webp",
    } as never)

    expect(url).toBe("blob:official-image")
  })

  it("keeps the existing imageUrl fallback for non-builtin cards", async () => {
    const url = await getCardImageUrlAsync({
      id: "custom-bard",
      imageUrl: "/custom-pack/profession/bard.webp",
    } as never)

    expect(getOfficialImageUrlMock).not.toHaveBeenCalled()
    expect(url).toBe("./image/custom-pack/profession/bard.webp")
  })
})

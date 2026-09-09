import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import {
  DEFAULT_ZOOT_BASE_URL,
  formatRoomCodeDisplay,
  normalizeRoomCode,
  sendCharacterToZoot,
  validateZootCharacter,
} from "@/lib/zoot-client"
import { createDefaultSheetData } from "@/lib/default-sheet-data"
import type { SheetData } from "@/lib/sheet-data"

function createSampleSheet(overrides?: Partial<SheetData>): SheetData {
  return {
    ...createDefaultSheetData("rhodes-island"),
    name: "阿米娅",
    ...overrides,
  }
}

describe("zoot-client", () => {
  describe("normalizeRoomCode", () => {
    it("normalizes lowercase and removes dashes and non-alphanumeric characters", () => {
      expect(normalizeRoomCode("abcd-efgh")).toBe("ABCDEFGH")
      expect(normalizeRoomCode("  AbCd EFgh! ")).toBe("ABCDEFGH")
      expect(normalizeRoomCode("1234-5678")).toBe("12345678")
    })
  })

  describe("formatRoomCodeDisplay", () => {
    it("formats 8-char code with hyphen", () => {
      expect(formatRoomCodeDisplay("abcdefgh")).toBe("ABCD-EFGH")
      expect(formatRoomCodeDisplay("ABCD-EFGH")).toBe("ABCD-EFGH")
      expect(formatRoomCodeDisplay("ABC")).toBe("ABC")
    })
  })

  describe("validateZootCharacter", () => {
    it("passes for valid rhodes island sheet", () => {
      expect(() => validateZootCharacter(createSampleSheet())).not.toThrow()
    })

    it("throws if ruleset is not rhodes-island", () => {
      expect(() =>
        validateZootCharacter(createSampleSheet({ ruleSetId: "daggerheart" })),
      ).toThrow("ZOOT 投递仅支持罗德岛模式角色卡")
    })

    it("throws if character name is empty", () => {
      expect(() =>
        validateZootCharacter(createSampleSheet({ name: "" })),
      ).toThrow("角色名不能为空")
      expect(() =>
        validateZootCharacter(createSampleSheet({ name: "   " })),
      ).toThrow("角色名不能为空")
    })

    it("throws if character name exceeds 80 characters", () => {
      expect(() =>
        validateZootCharacter(createSampleSheet({ name: "a".repeat(81) })),
      ).toThrow("最多 80 个字符")
    })
  })

  describe("sendCharacterToZoot", () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
      globalThis.fetch = vi.fn()
    })

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    it("rejects room codes not equal to 8 characters", async () => {
      await expect(
        sendCharacterToZoot({
          roomCode: "ABC",
          sheetData: createSampleSheet(),
        }),
      ).rejects.toThrow("必须为 8 位")
    })

    it("posts normalized room code and returns success result", async () => {
      const mockResponse = {
        ok: true,
        action: "created",
        characterName: "阿米娅",
        receivedAt: "2026-09-09T01:30:00.000Z",
      }

      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )

      const sheet = createSampleSheet()
      const result = await sendCharacterToZoot({
        baseUrl: "https://zootos.pages.dev/",
        roomCode: "abcd-efgh",
        sheetData: sheet,
      })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://zootos.pages.dev/api/v1/rooms/ABCDEFGH/characters",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sheet),
        },
      )
      expect(result).toEqual(mockResponse)
    })

    it("maps ROOM_NOT_FOUND to friendly error", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "ROOM_NOT_FOUND", message: "房间不存在" },
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        ),
      )

      await expect(
        sendCharacterToZoot({
          roomCode: "ABCDEFGH",
          sheetData: createSampleSheet(),
        }),
      ).rejects.toThrow("房间不存在或已关闭")
    })

    it("maps INVALID_ORIGIN to friendly error", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "INVALID_ORIGIN", message: "来源错误" },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
      )

      await expect(
        sendCharacterToZoot({
          roomCode: "ABCDEFGH",
          sheetData: createSampleSheet(),
        }),
      ).rejects.toThrow("MYDH_ALLOWED_ORIGINS")
    })

    it("maps PAYLOAD_TOO_LARGE to friendly error", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "PAYLOAD_TOO_LARGE", message: "过大" },
          }),
          { status: 413, headers: { "Content-Type": "application/json" } },
        ),
      )

      await expect(
        sendCharacterToZoot({
          roomCode: "ABCDEFGH",
          sheetData: createSampleSheet(),
        }),
      ).rejects.toThrow("512 KiB")
    })

    it("maps RATE_LIMITED to friendly error", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "RATE_LIMITED", message: "频繁" },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
      )

      await expect(
        sendCharacterToZoot({
          roomCode: "ABCDEFGH",
          sheetData: createSampleSheet(),
        }),
      ).rejects.toThrow("频繁")
    })

    it("maps network connection error", async () => {
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(
        new TypeError("Failed to fetch"),
      )

      await expect(
        sendCharacterToZoot({
          roomCode: "ABCDEFGH",
          sheetData: createSampleSheet(),
        }),
      ).rejects.toThrow("无法连接到 ZOOT 服务器")
    })
  })
})

import { describe, expect, it } from "vitest"

import { CardSource, createEmptyCard } from "@/card/card-types"
import { BUILTIN_BATCH_ID } from "@/card/stores/store-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  CHARACTER_CODE_DOMAIN_DICT_V1,
} from "@/lib/character-code-dictionary"
import {
  decodeCharacterCode,
  exportCharacterCode,
} from "@/lib/character-code"

function createBuiltinDomainCard(index: number) {
  const entry = CHARACTER_CODE_DOMAIN_DICT_V1[index]
  return {
    ...createEmptyCard("domain"),
    id: entry.id,
    name: entry.title,
    description: entry.text,
    type: "domain",
    source: CardSource.BUILTIN,
  }
}

function createProfessionCard(startingEvasion: number) {
  return {
    ...createEmptyCard("profession"),
    id: "test-profession",
    name: "测试职业",
    type: "profession",
    professionSpecial: {
      起始生命: 5,
      起始闪避: startingEvasion,
      起始物品: "",
      希望特性: "",
    },
  }
}

function toBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join("")
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  const binary = atob(`${normalized}${padding}`)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function updateChecksum(bytes: Uint8Array) {
  let checksum = 0
  for (let index = 0; index < bytes.length - 2; index++) {
    checksum = (checksum + bytes[index]) & 0xffff
  }
  bytes[bytes.length - 2] = checksum & 0xff
  bytes[bytes.length - 1] = (checksum >> 8) & 0xff
}

describe("character code export", () => {
  it("exports builtin domain cards and decodes them back to title and text", () => {
    const result = exportCharacterCode({
      ...defaultSheetData,
      cards: [createProfessionCard(10), createBuiltinDomainCard(0), createBuiltinDomainCard(1)],
    })

    const decoded = decodeCharacterCode(result)

    expect(result.startsWith("dhc1_")).toBe(true)
    expect(decoded.domainCardIndices).toEqual([0, 1])
    expect(decoded.domains).toEqual([
      CHARACTER_CODE_DOMAIN_DICT_V1[0],
      CHARACTER_CODE_DOMAIN_DICT_V1[1],
    ])
  })

  it("accepts builtin domain cards that carry the system batch id", () => {
    const builtinCardWithBatchId = {
      ...createBuiltinDomainCard(0),
      batchId: BUILTIN_BATCH_ID,
    }

    const result = exportCharacterCode({
      ...defaultSheetData,
      cards: [createProfessionCard(10), builtinCardWithBatchId as any],
    })

    expect(decodeCharacterCode(result).domainCardIndices).toEqual([0])
  })

  it("exports displayed evasion, armor, and thresholds instead of raw stored fields", () => {
    const result = exportCharacterCode({
      ...defaultSheetData,
      level: "4",
      evasion: "99",
      evasionManualModifier: "3",
      armorValue: "88",
      armorBaseScore: "7",
      armorValueManualModifier: "2",
      armorThreshold: "5/12",
      cards: [createProfessionCard(10), createBuiltinDomainCard(0)],
    })

    const decoded = decodeCharacterCode(result)

    expect(decoded.evasion).toBe(13)
    expect(decoded.armor).toBe(9)
    expect(decoded.damageThresholds).toEqual({
      minor: 9,
      major: 16,
    })
  })

  it("exports only hope, stress, and gold maximum values", () => {
    const result = exportCharacterCode({
      ...defaultSheetData,
      hope: 2,
      hopeMax: 8,
      stressMax: 7,
      stress: [true, true, false],
      gold: Array(13).fill(false),
      cards: [createProfessionCard(10)],
    })

    const decoded = decodeCharacterCode(result)

    expect(decoded.resources).toEqual({
      hopeMax: 8,
      stressMax: 7,
      goldMax: 13,
    })
  })

  it("rejects custom and adhoc domain cards", () => {
    expect(() =>
      exportCharacterCode({
        ...defaultSheetData,
        cards: [
          {
            ...createEmptyCard("domain"),
            id: "custom-domain-card",
            name: "自定义领域卡",
            type: "domain",
            source: CardSource.CUSTOM,
            batchId: "custom-batch",
          } as any,
        ],
      }),
    ).toThrow("角色码暂不支持导出自定义领域卡")

    expect(() =>
      exportCharacterCode({
        ...defaultSheetData,
        cards: [
          {
            ...createEmptyCard("domain"),
            id: "sheet-custom-player-1",
            name: "即席领域卡",
            type: "domain",
            source: CardSource.ADHOC,
          } as any,
        ],
      }),
    ).toThrow("角色码暂不支持导出自定义领域卡")
  })

  it("ignores empty slots and non-domain cards", () => {
    const result = exportCharacterCode({
      ...defaultSheetData,
      cards: [
        createProfessionCard(10),
        createEmptyCard(),
        {
          ...createEmptyCard("ancestry"),
          id: "ancestry-1",
          name: "测试种族",
          type: "ancestry",
        },
        createBuiltinDomainCard(0),
      ],
    })

    expect(decodeCharacterCode(result).domainCardIndices).toEqual([0])
  })

  it("rejects invalid prefix and corrupted content", () => {
    const code = exportCharacterCode({
      ...defaultSheetData,
      cards: [createProfessionCard(10), createBuiltinDomainCard(0)],
    })

    expect(() => decodeCharacterCode("bad-prefix")).toThrow("角色码版本前缀无效")
    expect(() => decodeCharacterCode(`${code}x`)).toThrow()
  })

  it("rejects unknown dictionary indices", () => {
    const code = exportCharacterCode({
      ...defaultSheetData,
      cards: [createProfessionCard(10), createBuiltinDomainCard(0)],
    })

    const bytes = fromBase64Url(code.slice("dhc1_".length))
    const domainIndexOffset = 27
    bytes[domainIndexOffset] = 0xff
    bytes[domainIndexOffset + 1] = 0xff
    updateChecksum(bytes)

    expect(() => decodeCharacterCode(`dhc1_${toBase64Url(bytes)}`)).toThrow("未知的领域卡索引")
  })
})

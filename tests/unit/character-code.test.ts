import { describe, expect, it } from "vitest"

import { CardSource, createEmptyCard } from "@/card/card-types"
import { BUILTIN_BATCH_ID } from "@/card/stores/store-types"
import { defaultSheetData } from "@/lib/default-sheet-data"
import {
  CHARACTER_CODE_ANCESTRY_DICT_V1,
  CHARACTER_CODE_COMMUNITY_DICT_V1,
  CHARACTER_CODE_DOMAIN_DICT_V1,
  CHARACTER_CODE_PROFESSION_DICT_V1,
  CHARACTER_CODE_SUBCLASS_DICT_V1,
} from "@/lib/character-code-dictionary"
import { decodeCharacterCode, exportCharacterCode } from "@/lib/character-code"

function createBuiltinProfessionCard(index: number, startingEvasion = 10) {
  const entry = CHARACTER_CODE_PROFESSION_DICT_V1[index]

  return {
    ...createEmptyCard("profession"),
    id: entry.id,
    name: entry.title,
    description: entry.text,
    type: "profession",
    source: CardSource.BUILTIN,
    professionSpecial: {
      起始生命: 5,
      起始闪避: startingEvasion,
      起始物品: "",
      希望特性: entry.hopeFeature,
    },
  }
}

function createBuiltinSubclassCard(index: number) {
  const entry = CHARACTER_CODE_SUBCLASS_DICT_V1[index]

  return {
    ...createEmptyCard("subclass"),
    id: entry.id,
    name: entry.title,
    description: entry.text,
    type: "subclass",
    source: CardSource.BUILTIN,
  }
}

function createBuiltinAncestryCard(index: number) {
  const entry = CHARACTER_CODE_ANCESTRY_DICT_V1[index]

  return {
    ...createEmptyCard("ancestry"),
    id: entry.id,
    name: entry.title,
    description: entry.text,
    type: "ancestry",
    source: CardSource.BUILTIN,
  }
}

function createBuiltinCommunityCard(index: number) {
  const entry = CHARACTER_CODE_COMMUNITY_DICT_V1[index]

  return {
    ...createEmptyCard("community"),
    id: entry.id,
    name: entry.title,
    description: entry.text,
    type: "community",
    source: CardSource.BUILTIN,
  }
}

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
  it("exports builtin special cards and domain cards, then decodes them back", () => {
    const result = exportCharacterCode({
      ...defaultSheetData,
      cards: [
        createBuiltinProfessionCard(0),
        createBuiltinSubclassCard(0),
        createBuiltinAncestryCard(0),
        createBuiltinAncestryCard(1),
        createBuiltinCommunityCard(0),
        createBuiltinDomainCard(0),
        createBuiltinDomainCard(1),
      ],
    })

    const decoded = decodeCharacterCode(result)

    expect(result.startsWith("dhc2_")).toBe(true)
    expect(decoded.version).toBe(2)
    expect(decoded.specialCardIndices).toEqual({
      profession: 0,
      subclass: 0,
      ancestry1: 0,
      ancestry2: 1,
      community: 0,
    })
    expect(decoded.specialCards.profession).toEqual(CHARACTER_CODE_PROFESSION_DICT_V1[0])
    expect(decoded.specialCards.subclass).toEqual(CHARACTER_CODE_SUBCLASS_DICT_V1[0])
    expect(decoded.specialCards.ancestry1).toEqual(CHARACTER_CODE_ANCESTRY_DICT_V1[0])
    expect(decoded.specialCards.ancestry2).toEqual(CHARACTER_CODE_ANCESTRY_DICT_V1[1])
    expect(decoded.specialCards.community).toEqual(CHARACTER_CODE_COMMUNITY_DICT_V1[0])
    expect(decoded.domainCardIndices).toEqual([0, 1])
    expect(decoded.domains).toEqual([CHARACTER_CODE_DOMAIN_DICT_V1[0], CHARACTER_CODE_DOMAIN_DICT_V1[1]])
  })

  it("accepts builtin cards that carry the system batch id", () => {
    const builtinCardWithBatchId = {
      ...createBuiltinDomainCard(0),
      batchId: BUILTIN_BATCH_ID,
    }

    const result = exportCharacterCode({
      ...defaultSheetData,
      cards: [createBuiltinProfessionCard(0), createEmptyCard(), createEmptyCard(), createEmptyCard(), createEmptyCard(), builtinCardWithBatchId as any],
    })

    const decoded = decodeCharacterCode(result)
    expect(decoded.version).toBe(2)
    expect(decoded.domainCardIndices).toEqual([0])
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
      cards: [createBuiltinProfessionCard(0, 10), createEmptyCard(), createEmptyCard(), createEmptyCard(), createEmptyCard(), createBuiltinDomainCard(0)],
    })

    const decoded = decodeCharacterCode(result)
    expect(decoded.version).toBe(2)
    expect(decoded.evasion).toBe(13)
    expect(decoded.armor).toBe(9)
    expect(decoded.damageThresholds).toEqual({
      minor: 9,
      major: 16,
    })
  })

  it("exports hope/stress max and current gold value", () => {
    const gold = Array(21).fill(false)
    gold[0] = true
    gold[1] = true
    gold[10] = true
    gold[20] = true

    const result = exportCharacterCode({
      ...defaultSheetData,
      hope: 2,
      hopeMax: 8,
      stressMax: 7,
      stress: [true, true, false],
      gold,
      cards: [createBuiltinProfessionCard(0)],
    })

    const decoded = decodeCharacterCode(result)
    expect(decoded.version).toBe(2)
    expect(decoded.resources).toEqual({
      hopeMax: 8,
      stressMax: 7,
      goldCurrent: 4,
      hpMax: 6,
      armorMax: 12,
    })
  })

  it("exports displayed hp max and armor max", () => {
    const result = exportCharacterCode({
      ...defaultSheetData,
      hpMax: 7,
      armorMax: 5,
      armorValue: "5",
      cards: [createBuiltinProfessionCard(0)],
    })

    const decoded = decodeCharacterCode(result)

    expect(decoded.resources.hpMax).toBe(7)
    expect(decoded.resources.armorMax).toBe(5)
  })

  it("rejects custom special cards and adhoc domain cards", () => {
    expect(() =>
      exportCharacterCode({
        ...defaultSheetData,
        cards: [
          {
            ...createEmptyCard("profession"),
            id: "custom-profession-card",
            name: "自定义职业",
            type: "profession",
            source: CardSource.CUSTOM,
            batchId: "custom-batch",
          } as any,
        ],
      }),
    ).toThrow("角色码暂不支持导出自定义职业特性卡牌")

    expect(() =>
      exportCharacterCode({
        ...defaultSheetData,
        cards: [
          createBuiltinProfessionCard(0),
          createEmptyCard(),
          createEmptyCard(),
          createEmptyCard(),
          createEmptyCard(),
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

  it("ignores empty slots and non-domain cards outside the special card area", () => {
    const result = exportCharacterCode({
      ...defaultSheetData,
      cards: [
        createBuiltinProfessionCard(0),
        createEmptyCard(),
        createEmptyCard(),
        createEmptyCard(),
        createEmptyCard(),
        createBuiltinAncestryCard(0),
        createBuiltinDomainCard(0),
      ],
    })

    const decoded = decodeCharacterCode(result)
    expect(decoded.version).toBe(2)
    expect(decoded.specialCardIndices).toEqual({
      profession: 0,
      subclass: null,
      ancestry1: null,
      ancestry2: null,
      community: null,
    })
    expect(decoded.domainCardIndices).toEqual([0])
  })

  it("rejects invalid prefix and corrupted content", () => {
    const code = exportCharacterCode({
      ...defaultSheetData,
      cards: [createBuiltinProfessionCard(0), createEmptyCard(), createEmptyCard(), createEmptyCard(), createEmptyCard(), createBuiltinDomainCard(0)],
    })

    expect(() => decodeCharacterCode("bad-prefix")).toThrow("角色码版本前缀无效")
    expect(() => decodeCharacterCode(`${code}x`)).toThrow()
  })

  it("rejects unknown dictionary indices", () => {
    const code = exportCharacterCode({
      ...defaultSheetData,
      cards: [createBuiltinProfessionCard(0), createEmptyCard(), createEmptyCard(), createEmptyCard(), createEmptyCard(), createBuiltinDomainCard(0)],
    })

    const bytes = fromBase64Url(code.slice("dhc2_".length))
    const professionIndexOffset = 28
    bytes[professionIndexOffset] = 0xfe
    bytes[professionIndexOffset + 1] = 0xff
    updateChecksum(bytes)

    expect(() => decodeCharacterCode(`dhc2_${toBase64Url(bytes)}`)).toThrow("未知的职业特性索引")
  })
})

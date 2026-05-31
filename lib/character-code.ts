import type { StandardCard } from "@/card/card-types"
import { CardSource } from "@/card/card-types"
import { BUILTIN_BATCH_ID } from "@/card/stores/store-types"
import {
  calculateArmorValueBreakdown,
  calculateDamageThresholdBreakdown,
  calculateEvasionBreakdown,
  getDisplayedHpMax,
  getDisplayedStressMax,
} from "@/lib/domain-card-derived-stats"
import {
  CHARACTER_CODE_ANCESTRY_DICT_V1,
  CHARACTER_CODE_ANCESTRY_ID_TO_INDEX_V1,
  CHARACTER_CODE_COMMUNITY_DICT_V1,
  CHARACTER_CODE_COMMUNITY_ID_TO_INDEX_V1,
  CHARACTER_CODE_DOMAIN_DICT_V1,
  CHARACTER_CODE_DOMAIN_ID_TO_INDEX_V1,
  CHARACTER_CODE_PROFESSION_DICT_V1,
  CHARACTER_CODE_PROFESSION_ID_TO_INDEX_V1,
  CHARACTER_CODE_SUBCLASS_DICT_V1,
  CHARACTER_CODE_SUBCLASS_ID_TO_INDEX_V1,
  type CharacterCodeCardEntry,
  type CharacterCodeDomainEntry,
  type CharacterCodeProfessionEntry,
} from "@/lib/character-code-dictionary"
import { safeEvaluateExpression } from "@/lib/number-utils"
import type { AttributeValue, SheetData } from "@/lib/sheet-data"

type CharacterCodeVersion = 2 | 3

const CHARACTER_CODE_FORMATS = [
  { prefix: "dhc3_", version: 3 as const },
  { prefix: "dhc2_", version: 2 as const },
] as const
const CURRENT_CHARACTER_CODE_FORMAT = CHARACTER_CODE_FORMATS[0]
const DEFAULT_HOPE_MAX = 6
const UINT8_MAX = 0xff
const UINT16_NULL = 0xffff
const INT16_MIN = -32768
const INT16_MAX = 32767
const MIN_CHARACTER_CODE_LENGTH = 41
const GOLD_HANDFUL_END = 10
const GOLD_BAG_END = 20
const GOLD_BAG_VALUE = 10
const GOLD_CHEST_INDEX = 20
const GOLD_CHEST_VALUE = 100

interface CharacterCodeAttributes {
  agility: number
  strength: number
  finesse: number
  instinct: number
  presence: number
  knowledge: number
}

interface CharacterCodeDamageThresholds {
  minor: number
  major: number
}

interface CharacterCodeSpecialCardIndices {
  profession: number | null
  subclass: number | null
  ancestry1: number | null
  ancestry2: number | null
  community: number | null
}

export interface CharacterCodePayload {
  version: CharacterCodeVersion
  level: number
  proficiency: number
  evasion: number
  armor: number
  attributes: CharacterCodeAttributes
  damageThresholds: CharacterCodeDamageThresholds
  resources: {
    hopeMax: number
    stressMax: number
    goldCurrent: number
    hpMax: number
    armorMax: number
  }
  specialCardIndices: CharacterCodeSpecialCardIndices
  domainCardIndices: number[]
}

export interface DecodedCharacterCode extends CharacterCodePayload {
  specialCards: {
    profession?: CharacterCodeProfessionEntry
    subclass?: CharacterCodeCardEntry
    ancestry1?: CharacterCodeCardEntry
    ancestry2?: CharacterCodeCardEntry
    community?: CharacterCodeCardEntry
  }
  domains: CharacterCodeDomainEntry[]
}

export function exportCharacterCode(sheetData: SheetData): string {
  const payload = buildCharacterCodePayload(sheetData)
  const bytes = encodeCharacterCodePayload(payload)
  return `${CURRENT_CHARACTER_CODE_FORMAT.prefix}${toBase64Url(bytes)}`
}

export function decodeCharacterCode(code: string): DecodedCharacterCode {
  const matchedFormat = CHARACTER_CODE_FORMATS.find(({ prefix }) => code.startsWith(prefix))
  if (!matchedFormat) {
    throw new Error("角色码版本前缀无效。")
  }

  const payload = decodeCharacterCodePayload(getEncodedBody(code, matchedFormat.prefix))
  if (payload.version !== matchedFormat.version) {
    throw new Error(`角色码前缀与内容版本不匹配: ${matchedFormat.prefix} / ${payload.version}`)
  }

  return {
    ...payload,
    specialCards: {
      profession: decodeOptionalCardIndex(
        payload.specialCardIndices.profession,
        CHARACTER_CODE_PROFESSION_DICT_V1,
        "职业特性",
      ),
      subclass: decodeOptionalCardIndex(
        payload.specialCardIndices.subclass,
        CHARACTER_CODE_SUBCLASS_DICT_V1,
        "子职业特性",
      ),
      ancestry1: decodeOptionalCardIndex(
        payload.specialCardIndices.ancestry1,
        CHARACTER_CODE_ANCESTRY_DICT_V1,
        "种族特性",
      ),
      ancestry2: decodeOptionalCardIndex(
        payload.specialCardIndices.ancestry2,
        CHARACTER_CODE_ANCESTRY_DICT_V1,
        "种族特性",
      ),
      community: decodeOptionalCardIndex(
        payload.specialCardIndices.community,
        CHARACTER_CODE_COMMUNITY_DICT_V1,
        "社群特性",
      ),
    },
    domains: decodeRequiredCardIndices(payload.domainCardIndices, CHARACTER_CODE_DOMAIN_DICT_V1, "领域卡"),
  }
}

function getEncodedBody(code: string, prefix: string): Uint8Array {
  const encodedBody = code.slice(prefix.length)
  if (!encodedBody) {
    throw new Error("角色码内容为空。")
  }

  return fromBase64Url(encodedBody)
}

function buildCharacterCodePayload(sheetData: SheetData): CharacterCodePayload {
  const evasion = calculateEvasionBreakdown(sheetData).total ?? 0
  const armor = calculateArmorValueBreakdown(sheetData).total ?? 0
  const thresholds = calculateDamageThresholdBreakdown(sheetData)

  return {
    version: CURRENT_CHARACTER_CODE_FORMAT.version,
    level: parseStoredNumber(sheetData.level),
    proficiency: getProficiencyCount(sheetData.proficiency),
    evasion,
    armor,
    attributes: {
      agility: getAttributeNumericValue(sheetData.agility),
      strength: getAttributeNumericValue(sheetData.strength),
      finesse: getAttributeNumericValue(sheetData.finesse),
      instinct: getAttributeNumericValue(sheetData.instinct),
      presence: getAttributeNumericValue(sheetData.presence),
      knowledge: getAttributeNumericValue(sheetData.knowledge),
    },
    damageThresholds: {
      minor: thresholds.minor.total ?? 0,
      major: thresholds.major.total ?? 0,
    },
    resources: {
      hopeMax: typeof sheetData.hopeMax === "number" ? sheetData.hopeMax : DEFAULT_HOPE_MAX,
      stressMax: getDisplayedStressMax(sheetData),
      goldCurrent: getCurrentGoldValue(sheetData.gold),
      hpMax: getDisplayedHpMax(sheetData),
      armorMax: getDisplayedArmorMax(sheetData),
    },
    specialCardIndices: getSpecialCardIndices(sheetData.cards),
    domainCardIndices: getDomainCardIndices(sheetData.cards),
  }
}

function getSpecialCardIndices(cards: SheetData["cards"] | undefined): CharacterCodeSpecialCardIndices {
  return {
    profession: getOptionalSpecialCardIndex(
      cards?.[0],
      "profession",
      "职业特性",
      CHARACTER_CODE_PROFESSION_ID_TO_INDEX_V1,
    ),
    subclass: getOptionalSpecialCardIndex(
      cards?.[1],
      "subclass",
      "子职业特性",
      CHARACTER_CODE_SUBCLASS_ID_TO_INDEX_V1,
    ),
    ancestry1: getOptionalSpecialCardIndex(
      cards?.[2],
      "ancestry",
      "种族特性",
      CHARACTER_CODE_ANCESTRY_ID_TO_INDEX_V1,
    ),
    ancestry2: getOptionalSpecialCardIndex(
      cards?.[3],
      "ancestry",
      "种族特性",
      CHARACTER_CODE_ANCESTRY_ID_TO_INDEX_V1,
    ),
    community: getOptionalSpecialCardIndex(
      cards?.[4],
      "community",
      "社群特性",
      CHARACTER_CODE_COMMUNITY_ID_TO_INDEX_V1,
    ),
  }
}

function getOptionalSpecialCardIndex(
  card: StandardCard | undefined,
  expectedType: StandardCard["type"],
  label: string,
  dictionary: Map<string, number>,
): number | null {
  if (!isFilledCard(card)) {
    return null
  }

  if (card.type !== expectedType) {
    throw new Error(`${label}槽位中的卡牌类型不正确，无法导出角色码：${card.name || card.id}`)
  }

  if (isUnsupportedCustomCard(card)) {
    throw new Error(`角色码暂不支持导出自定义${label}卡牌：${card.name}`)
  }

  const dictionaryIndex = dictionary.get(card.id)
  if (dictionaryIndex === undefined) {
    throw new Error(`${label}卡未收录到角色码字典中：${card.name || card.id}`)
  }

  return dictionaryIndex
}

function getDomainCardIndices(cards: SheetData["cards"] | undefined): number[] {
  const indices: number[] = []

  for (const card of cards || []) {
    if (!isFilledDomainCard(card)) {
      continue
    }

    if (isUnsupportedCustomCard(card)) {
      throw new Error(`角色码暂不支持导出自定义领域卡：${card.name}`)
    }

    const dictionaryIndex = CHARACTER_CODE_DOMAIN_ID_TO_INDEX_V1.get(card.id)
    if (dictionaryIndex === undefined) {
      throw new Error(`领域卡未收录到角色码字典中：${card.name || card.id}`)
    }

    indices.push(dictionaryIndex)
  }

  return indices
}

function isFilledCard(card: StandardCard | undefined): card is StandardCard {
  return !!card && !!card.id && !!card.name && card.type !== "unknown"
}

function isFilledDomainCard(card: StandardCard | undefined): card is StandardCard {
  return isFilledCard(card) && card.type === "domain"
}

function isUnsupportedCustomCard(card: StandardCard): boolean {
  const extendedCard = card as StandardCard & { source?: CardSource; batchId?: string }
  const batchId = extendedCard.batchId

  return (
    extendedCard.source === CardSource.CUSTOM ||
    extendedCard.source === CardSource.ADHOC ||
    (!!batchId && batchId !== BUILTIN_BATCH_ID) ||
    card.id.startsWith("sheet-custom-")
  )
}

function getAttributeNumericValue(attribute: AttributeValue | undefined): number {
  if (!attribute?.value) {
    return 0
  }

  return safeEvaluateExpression(attribute.value)
}

function getProficiencyCount(proficiency: SheetData["proficiency"]): number {
  if (typeof proficiency === "number") {
    return proficiency
  }

  if (Array.isArray(proficiency)) {
    return proficiency.filter(Boolean).length
  }

  return 0
}

function getCurrentGoldValue(gold: SheetData["gold"] | undefined): number {
  if (!Array.isArray(gold)) {
    return 0
  }

  const handfulCount = gold.slice(0, GOLD_HANDFUL_END).filter(Boolean).length
  const bagCount = gold.slice(GOLD_HANDFUL_END, GOLD_BAG_END).filter(Boolean).length
  const chestCount = gold[GOLD_CHEST_INDEX] ? 1 : 0

  return handfulCount + bagCount * GOLD_BAG_VALUE + chestCount * GOLD_CHEST_VALUE
}

function getDisplayedArmorMax(data: Pick<SheetData, "armorMax" | "armorBoxes" | "armorValue" | "armorValueManualModifier" | "cards" | "strength" | "armorName" | "armorBaseScore" | "armorThreshold" | "armorSelection" | "primaryWeaponName" | "primaryWeaponTrait" | "primaryWeaponDamage" | "primaryWeaponFeature" | "primaryWeaponSelection" | "secondaryWeaponName" | "secondaryWeaponTrait" | "secondaryWeaponDamage" | "secondaryWeaponFeature" | "secondaryWeaponSelection">): number {
  if (typeof data.armorMax === "number" && data.armorMax > 0) {
    return data.armorMax
  }

  const derivedArmorValue = calculateArmorValueBreakdown(data).total
  if (typeof derivedArmorValue === "number" && derivedArmorValue > 0) {
    return derivedArmorValue
  }

  if (Array.isArray(data.armorBoxes) && data.armorBoxes.length > 0) {
    return data.armorBoxes.length
  }

  return 0
}

function parseStoredNumber(value?: string): number {
  if (!value?.trim()) {
    return 0
  }

  return safeEvaluateExpression(value)
}

function decodeRequiredCardIndices<T extends CharacterCodeCardEntry>(
  indices: number[],
  dictionary: T[],
  label: string,
): T[] {
  return indices.map((index) => {
    const entry = dictionary[index]
    if (!entry) {
      throw new Error(`角色码中包含未知的${label}索引: ${index}`)
    }
    return entry
  })
}

function decodeOptionalCardIndex<T extends CharacterCodeCardEntry>(
  index: number | null,
  dictionary: T[],
  label: string,
): T | undefined {
  if (index === null) {
    return undefined
  }

  const entry = dictionary[index]
  if (!entry) {
    throw new Error(`角色码中包含未知的${label}索引: ${index}`)
  }

  return entry
}

function encodeCharacterCodePayload(payload: CharacterCodePayload): Uint8Array {
  const domainCount = payload.domainCardIndices.length
  assertUInt8("领域卡数量", domainCount)

  const bytes = new Uint8Array(39 + domainCount * 2 + 2)
  let offset = 0

  bytes[offset++] = payload.version
  bytes[offset++] = toUInt8("等级", payload.level)
  bytes[offset++] = toUInt8("熟练度", payload.proficiency)
  offset = writeInt16(bytes, offset, payload.evasion, "闪避")
  offset = writeInt16(bytes, offset, payload.armor, "护甲")
  offset = writeInt16(bytes, offset, payload.attributes.agility, "敏捷")
  offset = writeInt16(bytes, offset, payload.attributes.strength, "力量")
  offset = writeInt16(bytes, offset, payload.attributes.finesse, "灵巧")
  offset = writeInt16(bytes, offset, payload.attributes.instinct, "本能")
  offset = writeInt16(bytes, offset, payload.attributes.presence, "风度")
  offset = writeInt16(bytes, offset, payload.attributes.knowledge, "知识")
  offset = writeInt16(bytes, offset, payload.damageThresholds.minor, "重伤阈值")
  offset = writeInt16(bytes, offset, payload.damageThresholds.major, "严重阈值")
  bytes[offset++] = toUInt8("希望上限", payload.resources.hopeMax)
  bytes[offset++] = toUInt8("压力上限", payload.resources.stressMax)
  bytes[offset++] = toUInt8("金币当前值", payload.resources.goldCurrent)
  bytes[offset++] = toUInt8("生命上限", payload.resources.hpMax)
  bytes[offset++] = toUInt8("护甲上限", payload.resources.armorMax)
  offset = writeNullableUInt16(bytes, offset, payload.specialCardIndices.profession)
  offset = writeNullableUInt16(bytes, offset, payload.specialCardIndices.subclass)
  offset = writeNullableUInt16(bytes, offset, payload.specialCardIndices.ancestry1)
  offset = writeNullableUInt16(bytes, offset, payload.specialCardIndices.ancestry2)
  offset = writeNullableUInt16(bytes, offset, payload.specialCardIndices.community)
  bytes[offset++] = domainCount

  for (const domainIndex of payload.domainCardIndices) {
    if (!CHARACTER_CODE_DOMAIN_DICT_V1[domainIndex]) {
      throw new Error(`存在无法编码的领域卡索引: ${domainIndex}`)
    }
    offset = writeUInt16(bytes, offset, domainIndex)
  }

  const checksum = calculateChecksum(bytes.subarray(0, offset))
  writeUInt16(bytes, offset, checksum)

  return bytes
}

function decodeCharacterCodePayload(bytes: Uint8Array): CharacterCodePayload {
  if (bytes.length < MIN_CHARACTER_CODE_LENGTH) {
    throw new Error("角色码长度不足。")
  }

  const payloadLength = bytes.length - 2
  assertChecksum(bytes, payloadLength)

  let offset = 0
  const version = bytes[offset++]
  if (!isSupportedCharacterCodeVersion(version)) {
    throw new Error(`暂不支持的角色码版本: ${version}`)
  }

  const level = bytes[offset++]
  const proficiency = bytes[offset++]
  const evasion = readInt16(bytes, offset)
  offset += 2
  const armor = readInt16(bytes, offset)
  offset += 2
  const agility = readInt16(bytes, offset)
  offset += 2
  const strength = readInt16(bytes, offset)
  offset += 2
  const finesse = readInt16(bytes, offset)
  offset += 2
  const instinct = readInt16(bytes, offset)
  offset += 2
  const presence = readInt16(bytes, offset)
  offset += 2
  const knowledge = readInt16(bytes, offset)
  offset += 2
  const minor = readInt16(bytes, offset)
  offset += 2
  const major = readInt16(bytes, offset)
  offset += 2
  const hopeMax = bytes[offset++]
  const stressMax = bytes[offset++]
  const goldCurrent = bytes[offset++]
  const hpMax = bytes[offset++]
  const armorMax = bytes[offset++]
  const profession = readNullableUInt16(bytes, offset)
  offset += 2
  const subclass = readNullableUInt16(bytes, offset)
  offset += 2
  const ancestry1 = readNullableUInt16(bytes, offset)
  offset += 2
  const ancestry2 = readNullableUInt16(bytes, offset)
  offset += 2
  const community = readNullableUInt16(bytes, offset)
  offset += 2
  const domainCount = bytes[offset++]

  const remainingDomainBytes = payloadLength - offset
  if (remainingDomainBytes !== domainCount * 2) {
    throw new Error("角色码中的领域卡数据长度不正确。")
  }

  const domainCardIndices: number[] = []
  for (let index = 0; index < domainCount; index++) {
    const domainCardIndex = readUInt16(bytes, offset)
    offset += 2

    if (!CHARACTER_CODE_DOMAIN_DICT_V1[domainCardIndex]) {
      throw new Error(`角色码中包含未知的领域卡索引: ${domainCardIndex}`)
    }

    domainCardIndices.push(domainCardIndex)
  }

  return {
    version,
    level,
    proficiency,
    evasion,
    armor,
    attributes: {
      agility,
      strength,
      finesse,
      instinct,
      presence,
      knowledge,
    },
    damageThresholds: {
      minor,
      major,
    },
    resources: {
      hopeMax,
      stressMax,
      goldCurrent,
      hpMax,
      armorMax,
    },
    specialCardIndices: {
      profession,
      subclass,
      ancestry1,
      ancestry2,
      community,
    },
    domainCardIndices,
  }
}

function isSupportedCharacterCodeVersion(value: number): value is CharacterCodeVersion {
  return CHARACTER_CODE_FORMATS.some((format) => format.version === value)
}

function assertChecksum(bytes: Uint8Array, payloadLength: number): void {
  const expectedChecksum = readUInt16(bytes, payloadLength)
  const actualChecksum = calculateChecksum(bytes.subarray(0, payloadLength))

  if (expectedChecksum !== actualChecksum) {
    throw new Error("角色码校验失败，可能已损坏或未完整复制。")
  }
}

function toUInt8(label: string, value: number): number {
  assertUInt8(label, value)
  return value
}

function assertUInt8(label: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > UINT8_MAX) {
    throw new Error(`${label}超出可编码范围。`)
  }
}

function writeInt16(buffer: Uint8Array, offset: number, value: number, label: string): number {
  if (!Number.isInteger(value) || value < INT16_MIN || value > INT16_MAX) {
    throw new Error(`${label}超出可编码范围。`)
  }

  const normalized = value < 0 ? 0x10000 + value : value
  buffer[offset] = normalized & 0xff
  buffer[offset + 1] = (normalized >> 8) & 0xff
  return offset + 2
}

function writeNullableUInt16(buffer: Uint8Array, offset: number, value: number | null): number {
  return writeUInt16(buffer, offset, value ?? UINT16_NULL)
}

function writeUInt16(buffer: Uint8Array, offset: number, value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new Error("数值超出可编码范围。")
  }

  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >> 8) & 0xff
  return offset + 2
}

function readNullableUInt16(buffer: Uint8Array, offset: number): number | null {
  const value = readUInt16(buffer, offset)
  return value === UINT16_NULL ? null : value
}

function readUInt16(buffer: Uint8Array, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8)
}

function readInt16(buffer: Uint8Array, offset: number): number {
  const value = readUInt16(buffer, offset)
  return value > 0x7fff ? value - 0x10000 : value
}

function calculateChecksum(bytes: Uint8Array): number {
  let checksum = 0

  for (const value of bytes) {
    checksum = (checksum + value) & 0xffff
  }

  return checksum
}

function toBase64Url(bytes: Uint8Array): string {
  return encodeBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))

  try {
    return decodeBase64(`${normalized}${padding}`)
  } catch (error) {
    throw new Error(
      `角色码内容无法解析为有效数据。${error instanceof Error ? ` ${error.message}` : ""}`.trim(),
    )
  }
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = ""
    for (const value of bytes) {
      binary += String.fromCharCode(value)
    }
    return btoa(binary)
  }

  const bufferCtor = (globalThis as { Buffer?: typeof Buffer }).Buffer
  if (bufferCtor) {
    return bufferCtor.from(bytes).toString("base64")
  }

  throw new Error("当前环境不支持 Base64 编码。")
}

function decodeBase64(value: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index)
    }

    return bytes
  }

  const bufferCtor = (globalThis as { Buffer?: typeof Buffer }).Buffer
  if (bufferCtor) {
    return Uint8Array.from(bufferCtor.from(value, "base64"))
  }

  throw new Error("当前环境不支持 Base64 解码。")
}

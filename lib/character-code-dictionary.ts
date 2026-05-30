import { ancestryCardConverter, type AncestryCard } from "@/card/ancestry-card/convert"
import { communityCardConverter, type CommunityCard } from "@/card/community-card/convert"
import { domainCardConverter, type DomainCard } from "@/card/domain-card/convert"
import { professionCardConverter, type ProfessionCard } from "@/card/profession-card/convert"
import { subclassCardConverter, type SubClassCard } from "@/card/subclass-card/convert"
import builtinCardPack from "@/data/cards/builtin-base.json"

export interface CharacterCodeCardEntry {
  id: string
  title: string
  text: string
}

export interface CharacterCodeDomainEntry extends CharacterCodeCardEntry {}

export interface CharacterCodeProfessionEntry extends CharacterCodeCardEntry {
  hopeFeature: string
}

const builtinDomainCards = (builtinCardPack.domain || []) as DomainCard[]
const builtinProfessionCards = (builtinCardPack.profession || []) as ProfessionCard[]
const builtinSubclassCards = (builtinCardPack.subclass || []) as SubClassCard[]
const builtinAncestryCards = (builtinCardPack.ancestry || []) as AncestryCard[]
const builtinCommunityCards = (builtinCardPack.community || []) as CommunityCard[]

function buildIndexMap<T extends { id: string }>(entries: T[]): Map<string, number> {
  return new Map(entries.map((entry, index) => [entry.id, index]))
}

export const CHARACTER_CODE_DOMAIN_DICT_V1: CharacterCodeDomainEntry[] = builtinDomainCards.map((card) => {
  const standardCard = domainCardConverter.toStandard(card)

  return {
    id: standardCard.id,
    title: standardCard.name,
    text: standardCard.description || "",
  }
})

export const CHARACTER_CODE_PROFESSION_DICT_V1: CharacterCodeProfessionEntry[] = builtinProfessionCards.map((card) => {
  const standardCard = professionCardConverter.toStandard(card)

  return {
    id: standardCard.id,
    title: standardCard.name,
    text: standardCard.description || "",
    hopeFeature:
      typeof card["希望特性"] === "string"
        ? card["希望特性"]
        : standardCard.professionSpecial?.["希望特性"] || "",
  }
})

export const CHARACTER_CODE_SUBCLASS_DICT_V1: CharacterCodeCardEntry[] = builtinSubclassCards.map((card) => {
  const standardCard = subclassCardConverter.toStandard(card)

  return {
    id: standardCard.id,
    title: standardCard.name,
    text: standardCard.description || "",
  }
})

export const CHARACTER_CODE_ANCESTRY_DICT_V1: CharacterCodeCardEntry[] = builtinAncestryCards.map((card) => {
  const standardCard = ancestryCardConverter.toStandard(card)

  return {
    id: standardCard.id,
    title: standardCard.name,
    text: standardCard.description || "",
  }
})

export const CHARACTER_CODE_COMMUNITY_DICT_V1: CharacterCodeCardEntry[] = builtinCommunityCards.map((card) => {
  const standardCard = communityCardConverter.toStandard(card)

  return {
    id: standardCard.id,
    title: standardCard.name,
    text: standardCard.description || "",
  }
})

export const CHARACTER_CODE_DOMAIN_ID_TO_INDEX_V1 = buildIndexMap(CHARACTER_CODE_DOMAIN_DICT_V1)
export const CHARACTER_CODE_PROFESSION_ID_TO_INDEX_V1 = buildIndexMap(CHARACTER_CODE_PROFESSION_DICT_V1)
export const CHARACTER_CODE_SUBCLASS_ID_TO_INDEX_V1 = buildIndexMap(CHARACTER_CODE_SUBCLASS_DICT_V1)
export const CHARACTER_CODE_ANCESTRY_ID_TO_INDEX_V1 = buildIndexMap(CHARACTER_CODE_ANCESTRY_DICT_V1)
export const CHARACTER_CODE_COMMUNITY_ID_TO_INDEX_V1 = buildIndexMap(CHARACTER_CODE_COMMUNITY_DICT_V1)

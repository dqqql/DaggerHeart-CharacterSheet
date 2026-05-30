import builtinCardPack from "@/data/cards/builtin-base.json"
import { domainCardConverter, type DomainCard } from "@/card/domain-card/convert"

export interface CharacterCodeDomainEntry {
  id: string
  title: string
  text: string
}

const builtinDomainCards = (builtinCardPack.domain || []) as DomainCard[]

export const CHARACTER_CODE_DOMAIN_DICT_V1: CharacterCodeDomainEntry[] = builtinDomainCards.map((card) => {
  const standardCard = domainCardConverter.toStandard(card)

  return {
    id: standardCard.id,
    title: standardCard.name,
    text: standardCard.description || "",
  }
})

export const CHARACTER_CODE_DOMAIN_ID_TO_INDEX_V1 = new Map<string, number>(
  CHARACTER_CODE_DOMAIN_DICT_V1.map((entry, index) => [entry.id, index]),
)


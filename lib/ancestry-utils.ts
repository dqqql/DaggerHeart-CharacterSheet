import { CardType, createEmptyCard, isEmptyCard, type StandardCard } from "@/card/card-types"
import type { SheetCardReference, SheetData } from "@/lib/sheet-data"

const EMPTY_ANCESTRY_REF: SheetCardReference = {
  id: "",
  name: "",
}

function isAncestryCard(card: StandardCard | null | undefined): card is StandardCard {
  return !!card && card.type === CardType.Ancestry && !isEmptyCard(card)
}

function toAncestryRef(card: StandardCard | null | undefined): SheetCardReference {
  if (!isAncestryCard(card)) {
    return EMPTY_ANCESTRY_REF
  }

  return {
    id: card.id,
    name: card.name,
  }
}

function sortAncestryPair(cards: StandardCard[]): StandardCard[] {
  return [...cards].sort((left, right) => {
    if (typeof left.level === "number" && typeof right.level === "number" && left.level !== right.level) {
      return left.level - right.level
    }

    return left.name.localeCompare(right.name, "zh-CN")
  })
}

function buildMergedAncestryDescription(primary: StandardCard, secondary: StandardCard): string {
  const sections = [
    `**${primary.name}**`,
    primary.description || "",
    `**${secondary.name}**`,
    secondary.description || "",
  ].filter(Boolean)

  return sections.join("\n\n")
}

function createSingleAncestrySelectionCard(primary: StandardCard, secondary: StandardCard | null): StandardCard {
  return {
    ...primary,
    name: primary.class || primary.name,
    description: secondary ? buildMergedAncestryDescription(primary, secondary) : primary.description,
    cardSelectDisplay: {
      item1: primary.class,
    },
  }
}

function findCurrentAncestryCard(data: SheetData, ancestryCards: StandardCard[]): StandardCard | null {
  const slottedCards = [data.cards?.[2], data.cards?.[3]]

  for (const candidate of slottedCards) {
    if (isAncestryCard(candidate)) {
      return candidate
    }
  }

  const candidateIds = [
    data.ancestry1Ref?.id,
    data.ancestry1,
    data.ancestry2Ref?.id,
    data.ancestry2,
  ].filter(Boolean) as string[]

  for (const id of candidateIds) {
    const card = ancestryCards.find((candidate) => candidate.id === id)
    if (isAncestryCard(card)) {
      return card
    }
  }

  return null
}

export function clearAncestrySelection(): Pick<
  SheetData,
  "ancestry1" | "ancestry2" | "ancestry1Ref" | "ancestry2Ref"
> {
  return {
    ancestry1: "",
    ancestry2: "",
    ancestry1Ref: EMPTY_ANCESTRY_REF,
    ancestry2Ref: EMPTY_ANCESTRY_REF,
  }
}

export function findPairedAncestryCard(
  selectedCard: StandardCard | null | undefined,
  ancestryCards: StandardCard[],
): StandardCard | null {
  if (!isAncestryCard(selectedCard) || !selectedCard.class) {
    return null
  }

  return (
    ancestryCards.find(
      (candidate) =>
        candidate.id !== selectedCard.id &&
        candidate.type === CardType.Ancestry &&
        candidate.class === selectedCard.class,
    ) || null
  )
}

export function buildSingleAncestrySelection(
  selectedCard: StandardCard,
  ancestryCards: StandardCard[],
): Pick<SheetData, "ancestry1" | "ancestry2" | "ancestry1Ref" | "ancestry2Ref"> {
  const pairedCard = findPairedAncestryCard(selectedCard, ancestryCards)
  const orderedCards = sortAncestryPair([selectedCard, ...(pairedCard ? [pairedCard] : [])])
  const primary = orderedCards[0] || null
  const secondary = orderedCards[1] || null

  return {
    ancestry1: primary?.id || "",
    ancestry2: secondary?.id || "",
    ancestry1Ref: toAncestryRef(primary),
    ancestry2Ref: toAncestryRef(secondary),
  }
}

export function normalizeSingleAncestrySelection(
  data: SheetData,
  ancestryCards: StandardCard[],
): Pick<SheetData, "ancestry1" | "ancestry2" | "ancestry1Ref" | "ancestry2Ref"> {
  const currentCard = findCurrentAncestryCard(data, ancestryCards)

  if (!currentCard) {
    return clearAncestrySelection()
  }

  return buildSingleAncestrySelection(currentCard, ancestryCards)
}

export function createMergedAncestryCard(primary: StandardCard, secondary: StandardCard): StandardCard {
  return {
    ...primary,
    description: buildMergedAncestryDescription(primary, secondary),
  }
}

export function getSingleAncestrySelectionCards(ancestryCards: StandardCard[]): StandardCard[] {
  const cardsByRace = new Map<string, StandardCard[]>()

  ancestryCards.forEach((card) => {
    if (!isAncestryCard(card) || !card.class) {
      return
    }

    const cards = cardsByRace.get(card.class) || []
    cards.push(card)
    cardsByRace.set(card.class, cards)
  })

  return Array.from(cardsByRace.values()).map((cards) => {
    const orderedCards = sortAncestryPair(cards)
    return createSingleAncestrySelectionCard(orderedCards[0], orderedCards[1] || null)
  })
}

export function getDisplayedCharacterCards(data: SheetData): StandardCard[] {
  const displayCards = [...(data.cards || [])]

  while (displayCards.length < 20) {
    displayCards.push(createEmptyCard())
  }

  if (data.mixedAncestryEnabled) {
    return displayCards
  }

  const ancestry1Card = displayCards[2]
  const ancestry2Card = displayCards[3]

  if (isAncestryCard(ancestry1Card) && isAncestryCard(ancestry2Card)) {
    displayCards[2] = createMergedAncestryCard(ancestry1Card, ancestry2Card)
    displayCards[3] = createEmptyCard(CardType.Ancestry)
    return displayCards
  }

  if (!isAncestryCard(ancestry1Card) && isAncestryCard(ancestry2Card)) {
    displayCards[2] = ancestry2Card
    displayCards[3] = createEmptyCard(CardType.Ancestry)
  }

  return displayCards
}

export function inferMixedAncestryEnabled(data: Partial<SheetData>): boolean {
  if (typeof data.mixedAncestryEnabled === "boolean") {
    return data.mixedAncestryEnabled
  }

  const ancestry1Card = data.cards?.[2]
  const ancestry2Card = data.cards?.[3]

  if (!isAncestryCard(ancestry1Card) || !isAncestryCard(ancestry2Card)) {
    return false
  }

  return ancestry1Card.class !== ancestry2Card.class
}

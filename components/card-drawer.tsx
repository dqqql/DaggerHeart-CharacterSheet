"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { Badge } from "@/components/ui/badge"
import { ImageCard } from "@/components/ui/image-card"
import { SimpleImageCard } from "@/components/ui/simple-image-card"
import { AddCardPlaceholder } from "@/components/ui/add-card-placeholder"
import { CardMarkdown } from "@/components/ui/card-markdown"
import { getCardTypeName } from "@/card/card-ui-config"
import {
  StandardCard,
  getVariantRealType,
  isEmptyCard,
  isVariantCard,
} from "@/card/card-types"
import { useTextModeStore } from "@/lib/text-mode-store"
import { getOfficialImageUrl } from "@/lib/official-image-pack"
import { getBasePath } from "@/lib/utils"
import { getCardRuleSetId } from "@/lib/ruleset"
import { formatRhodesSubclassDomainRecommendation } from "@/lib/rulesets/rhodes-island/card-display"

interface CardDrawerProps {
  cards: Array<StandardCard>
  inventoryCards: Array<StandardCard>
  isOpen?: boolean
  onClose?: () => void
  onDeleteCard?: (cardIndex: number, isInventory: boolean) => void
  onMoveCard?: (cardIndex: number, fromInventory: boolean, toInventory: boolean) => void
  onAddCard?: (index: number, isInventory: boolean) => void
  isModalOpen?: boolean
}

type MainDeckType = "focused" | "inventory"
type TypeFilterType = "all" | "profession" | "background" | "domain" | "variant"

const BEAST_FORM_PREVIEW_CARD_ID = "breast-transform-001"

const getDisplayTypeName = (card: StandardCard) => {
  if (isVariantCard(card)) {
    const realType = getVariantRealType(card)
    if (realType) {
      return getCardTypeName(realType)
    }
  }

  return getCardTypeName(card.type)
}

export function CardDrawer({
  cards,
  inventoryCards,
  isOpen: externalIsOpen,
  onClose,
  onDeleteCard,
  onMoveCard,
  onAddCard,
  isModalOpen,
}: CardDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [mainDeck, setMainDeck] = useState<MainDeckType>("focused")
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>("all")
  const [hoveredCard, setHoveredCard] = useState<StandardCard | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [drawerPreviewImageSrc, setDrawerPreviewImageSrc] = useState<string | null>(null)

  const { isTextMode } = useTextModeStore()
  const finalIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen

  const handleClose = () => {
    setIsClosing(true)
    setHoveredCard(null)
    setTimeout(() => {
      setIsClosing(false)
      if (onClose) {
        onClose()
      } else {
        setIsOpen(false)
      }
    }, 300)
  }

  const sourceCards = mainDeck === "focused" ? cards : inventoryCards
  const validCards = sourceCards.filter((card) => card && card.name)

  const getFilteredCards = () => {
    if (typeFilter === "all") {
      return validCards
    }

    switch (typeFilter) {
      case "profession":
        return validCards.filter((card) => card.type === "profession" || card.type === "subclass")
      case "background":
        return validCards.filter((card) => card.type === "ancestry" || card.type === "community")
      case "domain":
        return validCards.filter((card) => card.type === "domain")
      case "variant":
        return validCards.filter((card) => isVariantCard(card))
      default:
        return validCards
    }
  }

  const currentCards = getFilteredCards()

  const availableFilters = [
    { key: "all" as const, label: "全部", count: validCards.length, alwaysShow: true },
    {
      key: "profession" as const,
      label: "职业",
      count: validCards.filter((c) => c.type === "profession" || c.type === "subclass").length,
      show: validCards.some((c) => c.type === "profession" || c.type === "subclass"),
    },
    {
      key: "background" as const,
      label: "背景",
      count: validCards.filter((c) => c.type === "ancestry" || c.type === "community").length,
      show: validCards.some((c) => c.type === "ancestry" || c.type === "community"),
    },
    {
      key: "domain" as const,
      label: "领域",
      count: validCards.filter((c) => c.type === "domain").length,
      show: validCards.some((c) => c.type === "domain"),
    },
    {
      key: "variant" as const,
      label: "扩展",
      count: validCards.filter((c) => isVariantCard(c)).length,
      show: validCards.some((c) => isVariantCard(c)),
    },
  ].filter((filter) => filter.alwaysShow || filter.show)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window)
    }

    checkIsMobile()
    window.addEventListener("resize", checkIsMobile)
    return () => window.removeEventListener("resize", checkIsMobile)
  }, [])

  useEffect(() => {
    if (!isTextMode) {
      setDrawerPreviewImageSrc(null)
      return
    }

    let isCancelled = false

    const loadDrawerPreviewImage = async () => {
      try {
        const officialImageUrl = await getOfficialImageUrl(BEAST_FORM_PREVIEW_CARD_ID)
        if (!isCancelled && officialImageUrl) {
          setDrawerPreviewImageSrc(officialImageUrl)
          return
        }
      } catch (error) {
        console.error("[CardDrawer] Failed to load beast-form preview image:", error)
      }

      if (!isCancelled) {
        setDrawerPreviewImageSrc(`${getBasePath()}/image/empty-card.webp`)
      }
    }

    loadDrawerPreviewImage()

    return () => {
      isCancelled = true
    }
  }, [isTextMode])

  useEffect(() => {
    if (!finalIsOpen) {
      setHoveredCard(null)
    }
  }, [finalIsOpen])

  useEffect(() => {
    if (isModalOpen) {
      setHoveredCard(null)
    }
  }, [isModalOpen])

  useEffect(() => {
    if (!hoveredCard) {
      return
    }

    const cardStillExists = currentCards.some(
      (card) => card.id === hoveredCard.id && card.name === hoveredCard.name,
    )

    if (!cardStillExists) {
      setHoveredCard(null)
    }
  }, [cards, inventoryCards, hoveredCard, currentCards])

  useEffect(() => {
    const filterStillValid = availableFilters.some((filter) => filter.key === typeFilter)
    if (!filterStillValid) {
      setTypeFilter("all")
    }
  }, [mainDeck, availableFilters, typeFilter])

  const handleCardHover = (card: StandardCard | null) => {
    if (!isMobile) {
      setHoveredCard(card)
    }
  }

  const handleCardClick = (card: StandardCard) => {
    if (isMobile) {
      setHoveredCard(hoveredCard === card ? null : card)
    }
  }

  const getNextEmptySlot = (cardsList: StandardCard[], isInventoryTab: boolean): number => {
    const startIndex = isInventoryTab ? 0 : 5
    for (let i = startIndex; i < 20; i++) {
      if (isEmptyCard(cardsList[i])) {
        return i
      }
    }
    return -1
  }

  const handleAddCardClick = () => {
    const isInventory = mainDeck === "inventory"
    const targetCards = isInventory ? inventoryCards : cards
    const nextEmptyIndex = getNextEmptySlot(targetCards, isInventory)

    if (onAddCard) {
      onAddCard(nextEmptyIndex, isInventory)
    }
  }

  const previewImageSrc = isTextMode ? drawerPreviewImageSrc : null

  return (
    <>
      {(finalIsOpen || isClosing) && (
        <div data-ri-card-drawer className="fixed inset-0 z-50 flex items-end">
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${isClosing ? "bg-opacity-0" : "bg-opacity-50"}`}
            onClick={handleClose}
          />

          <div
            className={`card-drawer-content fixed bottom-0 left-0 right-0 flex min-h-[35vh] w-full flex-col rounded-t-lg bg-white shadow-xl transition-transform duration-300 ease-out ${isClosing ? "translate-y-full" : "translate-y-0"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center border-b border-gray-200">
              <div className="flex flex-shrink-0 gap-3 border-r border-gray-200 px-4 py-3">
                <button
                  onClick={() => setMainDeck("focused")}
                  className={`
                    flex-shrink-0 rounded-lg font-bold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 active:scale-95
                    ${isMobile ? "px-6 py-3 text-lg" : "px-5 py-2.5 text-base"}
                    ${mainDeck === "focused" ? "bg-blue-500 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
                  `}
                >
                  {isMobile ? "配置" : "配置卡组"}
                  <Badge variant="secondary" className="ml-2">
                    {cards.filter((c) => c && c.name).length}
                  </Badge>
                </button>

                <button
                  onClick={() => setMainDeck("inventory")}
                  className={`
                    flex-shrink-0 rounded-lg font-bold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 active:scale-95
                    ${isMobile ? "px-6 py-3 text-lg" : "px-5 py-2.5 text-base"}
                    ${mainDeck === "inventory" ? "bg-blue-500 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
                  `}
                >
                  {isMobile ? "宝库" : "宝库卡组"}
                  <Badge variant="secondary" className="ml-2">
                    {inventoryCards.filter((c) => c && c.name).length}
                  </Badge>
                </button>
              </div>

              <div className="scrollbar-thin scrollbar-thumb-gray-300 flex-1 overflow-x-auto px-4 py-3">
                <div className="flex gap-2">
                  {availableFilters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setTypeFilter(filter.key)}
                      className={`
                        flex-shrink-0 rounded-full font-medium transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 hover:scale-105 active:scale-95
                        ${isMobile ? "px-5 py-2.5 text-base" : "px-4 py-2 text-sm"}
                        ${typeFilter === filter.key ? "border-2 border-blue-400 bg-blue-100 text-blue-700" : "border border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100"}
                      `}
                    >
                      {filter.label}
                      {filter.count > 0 && <span className="ml-1.5 opacity-75">({filter.count})</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent h-full overflow-x-auto overflow-y-hidden px-4 py-3">
                <div
                  className="animate-in slide-in-from-right flex h-full items-start gap-3 duration-300"
                  style={{ touchAction: "pan-x" }}
                >
                  {currentCards.map((card, index) => {
                    const isInventory = mainDeck === "inventory"
                    const realIndex = isInventory
                      ? inventoryCards.findIndex((c) => c === card)
                      : cards.findIndex((c) => c === card)
                    const isSpecialSlot = !isInventory && realIndex < 5

                    return (
                      <div
                        key={`${card.type}-${card.name}-${index}`}
                        className={`group relative w-72 flex-shrink-0 animate-in fade-in duration-300 ${isSpecialSlot ? "rounded-lg border-2 border-yellow-400" : ""}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                        onMouseEnter={() => handleCardHover(card)}
                        onMouseLeave={() => handleCardHover(null)}
                        onClick={() => handleCardClick(card)}
                      >
                        {onMoveCard && realIndex !== -1 && !isSpecialSlot && (
                          <button
                            className={`absolute left-2 top-2 z-[70] flex items-center justify-center rounded-full bg-blue-500 font-bold text-white opacity-0 shadow-lg transition-[color,background-color,box-shadow,transform,opacity] duration-200 group-hover:opacity-100 hover:bg-blue-600 ${isMobile ? "h-12 w-12 text-sm" : "h-6 w-6 text-xs"}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onMoveCard(realIndex, isInventory, !isInventory)
                            }}
                            title={isInventory ? "移动到配置卡组" : "移动到宝库卡组"}
                          >
                            {"<>"}
                          </button>
                        )}

                        {onDeleteCard && realIndex !== -1 && !isSpecialSlot && (
                          <button
                            className={`absolute right-2 top-2 z-[70] flex items-center justify-center rounded-full bg-red-500 font-bold text-white opacity-0 shadow-lg transition-[color,background-color,box-shadow,transform,opacity] duration-200 group-hover:opacity-100 hover:bg-red-600 ${isMobile ? "h-12 w-12 text-sm" : "h-6 w-6 text-xs"}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteCard(realIndex, isInventory)
                            }}
                            title="删除卡牌"
                          >
                            x
                          </button>
                        )}

                        {isSpecialSlot && (
                          <div className="absolute -top-1 left-2 z-[60]">
                            <span className="rounded border border-yellow-300 bg-yellow-100 px-1 py-0.5 text-[10px] font-medium text-yellow-700 shadow-sm">
                              特殊卡位
                            </span>
                          </div>
                        )}

                        <div className="transform transition-[transform,box-shadow,opacity] duration-200 hover:scale-105 hover:shadow-lg">
                          <SimpleImageCard
                            card={card}
                            onClick={() => {}}
                            isSelected={false}
                            priority={index < 5}
                            imageOverrideSrc={previewImageSrc}
                          />
                        </div>
                      </div>
                    )
                  })}

                  {onAddCard && (
                    <AddCardPlaceholder
                      onClick={handleAddCardClick}
                      disabled={
                        getNextEmptySlot(
                          mainDeck === "inventory" ? inventoryCards : cards,
                          mainDeck === "inventory",
                        ) === -1
                      }
                      isMobile={isMobile}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {hoveredCard && (
        <div
          className="fixed left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 transform"
          style={{ pointerEvents: isMobile ? "auto" : "none" }}
          onClick={isMobile ? () => setHoveredCard(null) : undefined}
        >
          <div className="animate-in zoom-in-95 fade-in w-80 max-w-[90vw] scale-110 transform duration-200">
            {previewImageSrc ? (
              <div className="flex w-[520px] max-w-[90vw] flex-row overflow-auto rounded-lg border border-gray-200 bg-white text-gray-800 shadow-lg">
                <div className="flex w-[220px] flex-shrink-0 flex-col">
                  <div
                    className={`relative w-full ${
                      getCardRuleSetId(hoveredCard) === "rhodes-island" ? "h-[220px] bg-white" : "h-40"
                    }`}
                  >
                    <Image
                      src={previewImageSrc}
                      alt={hoveredCard.name}
                      fill
                      className={
                        getCardRuleSetId(hoveredCard) === "rhodes-island" ? "object-contain p-2" : "object-cover"
                      }
                      sizes="220px"
                    />
                  </div>
                  <div className="flex flex-col p-3">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="break-words pr-2 text-base font-bold leading-tight">
                        {hoveredCard.name}
                      </h3>
                      <span className="whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {getDisplayTypeName(hoveredCard)}
                      </span>
                    </div>
                    <div className="flex flex-row flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                      {hoveredCard.cardSelectDisplay?.item1 && <span>{hoveredCard.cardSelectDisplay.item1}</span>}
                      {hoveredCard.cardSelectDisplay?.item2 && <span>{hoveredCard.cardSelectDisplay.item2}</span>}
                      {hoveredCard.cardSelectDisplay?.item3 && (
                        <span>{formatRhodesSubclassDomainRecommendation(hoveredCard)}</span>
                      )}
                      {hoveredCard.cardSelectDisplay?.item4 && <span>{hoveredCard.cardSelectDisplay.item4}</span>}
                    </div>
                  </div>
                </div>

                <div className="w-px bg-gray-200" />

                <div className="flex min-w-0 flex-grow flex-col rounded-r-lg bg-gray-100 p-3">
                  {hoveredCard.description && (
                    <div className="flex-grow overflow-y-auto pr-1 text-sm text-gray-700">
                      <CardMarkdown>{hoveredCard.description}</CardMarkdown>
                    </div>
                  )}
                  {hoveredCard.hint && hoveredCard.type !== "profession" && (
                    <>
                      {hoveredCard.description && (
                        <div className="my-2 h-px w-full flex-shrink-0 bg-gray-200" />
                      )}
                      <p className="flex-shrink-0 text-xs italic text-gray-500">{hoveredCard.hint}</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <ImageCard
                card={hoveredCard}
                onClick={() => {}}
                isSelected={false}
                showSource
                priority
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

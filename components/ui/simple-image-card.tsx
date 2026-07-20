"use client"

import React, { useState } from "react"
import Image from "next/image"

import { StandardCard, getVariantRealType, isVariantCard } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import { getCardImageUrl, getCardImageUrlAsync } from "@/lib/utils"
import { formatRhodesSubclassDomainRecommendation } from "@/lib/rhodes-island-card-display"

const getDisplayTypeName = (card: StandardCard) => {
  if (isVariantCard(card)) {
    const realType = getVariantRealType(card)
    if (realType) {
      return getCardTypeName(realType)
    }
  }

  return getCardTypeName(card.type)
}

interface SimpleImageCardProps {
  card: StandardCard
  onClick: (cardId: string) => void
  isSelected: boolean
  priority?: boolean
  imageOverrideSrc?: string | null
}

export function SimpleImageCard({
  card,
  onClick,
  isSelected,
  priority = false,
  imageOverrideSrc = null,
}: SimpleImageCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  React.useEffect(() => {
    if (imageOverrideSrc) {
      setImageError(false)
      setImageSrc(imageOverrideSrc)
      return
    }

    setImageError(false)

    const loadImageUrl = async () => {
      const url = await getCardImageUrlAsync(card, false)
      setImageSrc(url)
    }

    loadImageUrl()
  }, [card, imageOverrideSrc])

  React.useEffect(() => {
    if (imageOverrideSrc) {
      return
    }

    if (imageError && !imageSrc?.includes("empty-card.webp")) {
      const url = getCardImageUrl(card, true)
      setImageSrc(url)
    }
  }, [imageError, card, imageSrc, imageOverrideSrc])

  if (!card) {
    console.warn("[SimpleImageCard] Card prop is null or undefined.")
    return null
  }

  const cardId = card.id || `temp-id-${Math.random().toString(36).substring(2, 9)}`
  const displayName = card.name || "Unnamed Card"
  const displayItem1 = card.cardSelectDisplay?.item1 || ""
  const displayItem2 = card.cardSelectDisplay?.item2 || ""
  const displayItem3 = formatRhodesSubclassDomainRecommendation(card)
  const displayItem4 = card.cardSelectDisplay?.item4 || ""

  return (
    <div
      key={cardId}
      className={`group relative flex w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 ease-in-out hover:shadow-xl ${isSelected ? "ring-2 ring-blue-500" : "border"}`}
      onClick={() => onClick(cardId)}
    >
      <div className="relative w-full aspect-[1.4] overflow-hidden">
        {imageSrc && (
          <Image
            src={imageSrc}
            alt={displayName}
            width={300}
            height={420}
            className="h-auto w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            onError={() => setImageError(true)}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end p-4">
          <div className="space-y-0.5">
            <h3
              className="text-xl font-extrabold leading-none text-white"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,1)" }}
            >
              {displayName}
            </h3>
            <span
              className="block text-xs font-normal leading-tight tracking-widest text-gray-200"
              style={{ textShadow: "0 1px 5px rgba(0,0,0,1)" }}
            >
              {getDisplayTypeName(card)}
            </span>
          </div>
        </div>
      </div>

      {(displayItem1 || displayItem2 || displayItem3 || displayItem4) && (
        <div className="p-3">
          <div className="flex flex-row flex-wrap items-center gap-2 text-xs">
            {displayItem1 && (
              <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                {displayItem1}
              </div>
            )}
            {displayItem2 && (
              <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                {displayItem2}
              </div>
            )}
            {displayItem3 && (
              <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                {displayItem3}
              </div>
            )}
            {displayItem4 && (
              <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                {displayItem4}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

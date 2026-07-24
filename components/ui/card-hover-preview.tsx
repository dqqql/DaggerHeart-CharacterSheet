"use client"

import type { StandardCard } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import { getVariantRealType, isVariantCard } from "@/card/card-types"
import Image from "next/image"
import React, { useState } from "react"
import { getCardImageUrl, getCardImageUrlAsync } from "@/lib/utils"
import { SelectableCard } from "@/components/ui/selectable-card"
import { CardMarkdown } from "@/components/ui/card-markdown"
import { getCardRuleSetId } from "@/lib/ruleset"
import { formatRhodesSubclassDomainRecommendation } from "@/lib/rhodes-island-card-display"
import {
    getRhodesDomainEnglish,
    isRhodesDomainName,
    RhodesDomainIcon,
    type RhodesDomainName,
} from "@/components/rhodes-island/domain-icon"

interface CardHoverPreviewProps {
    card: StandardCard
    isTextMode?: boolean
}

// Helper function to get display type name, moved outside for consistency
const getDisplayTypeName = (card: StandardCard) => {
    if (isVariantCard(card)) {
        const realType = getVariantRealType(card)
        if (realType) {
            return getCardTypeName(realType)
        }
    }
    return getCardTypeName(card.type)
}

export function CardHoverPreview({ card, isTextMode = false }: CardHoverPreviewProps) {
    const [imageError, setImageError] = useState(false)
    const [imageSrc, setImageSrc] = useState<string>('')
    const isRhodesIslandCard = getCardRuleSetId(card) === "rhodes-island"
    const domainNames: RhodesDomainName[] = (() => {
        if (!isRhodesIslandCard) return []

        if (card.type === "profession") {
            const domain = card.cardSelectDisplay?.item1?.trim() || ""
            return isRhodesDomainName(domain) ? [domain] : []
        }

        if (card.type === "subclass") {
            return (card.cardSelectDisplay?.item3 || "")
                .replace(/^第二领域推荐：\s*/, "")
                .replace(/^推荐\s*/, "")
                .split(/\s*\/\s*/)
                .filter(isRhodesDomainName)
        }

        return []
    })()
    const isRhodesDomainPreview = domainNames.length > 0
    
    // 异步获取图片URL
    React.useEffect(() => {
        setImageError(false); // 重置错误状态
        const loadImageUrl = async () => {
            const url = await getCardImageUrlAsync(card, false);
            setImageSrc(url);
        };
        
        loadImageUrl();
    }, [card]);

    // 处理图片加载失败
    React.useEffect(() => {
        if (imageError && !imageSrc?.includes('empty-card.webp')) {
            const url = getCardImageUrl(card, true);
            setImageSrc(url);
        }
    }, [imageError, card, imageSrc]);
    
    if (!card) return null

    // 文字模式下使用 SelectableCard 组件
    if (isTextMode) {
        return (
            <div className="shadow-lg">
                <SelectableCard
                    card={card}
                    onClick={() => {}}
                    isSelected={false}
                />
            </div>
        )
    }

    const displayTypeName = getDisplayTypeName(card)
    return (
        <div className="flex flex-row bg-white border border-gray-200 rounded-lg shadow-lg w-[520px] text-gray-800 overflow-auto">
            {/* Left Column: Image and Info Section */}
            <div className="flex flex-col w-[220px] flex-shrink-0">
                {/* Image Section */}
                {isRhodesDomainPreview ? (
                    <div className="relative flex h-[220px] w-full items-center justify-center gap-5 overflow-hidden bg-slate-950 text-cyan-50">
                        <div aria-hidden="true" className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(103,232,249,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.12)_1px,transparent_1px)] [background-size:24px_24px]" />
                        {domainNames.map((domain) => (
                            <div key={domain} className="relative flex min-w-0 flex-col items-center">
                                <RhodesDomainIcon
                                    domain={domain}
                                    className={domainNames.length > 1 ? "h-20 w-20" : "h-28 w-28"}
                                />
                                <span className="mt-3 text-xs font-semibold tracking-[0.22em]">{domain}</span>
                                <span className="mt-1 text-[8px] tracking-[0.14em] text-cyan-200/70">
                                    {getRhodesDomainEnglish(domain)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : imageSrc && (
                    <div className={`relative w-full ${isRhodesIslandCard ? "h-[220px] bg-white" : "h-40"}`}>
                        <Image
                            src={imageSrc}
                            alt={`Image for ${card.name}`}
                            fill
                            className={isRhodesIslandCard ? "object-contain p-2" : "object-cover"}
                            sizes="220px"
                            onError={() => setImageError(true)}
                        />
                    </div>
                )}
                {/* Info Section Below Image */}
                <div className="p-3 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-base leading-tight pr-2 break-words">{card.name}</h3>
                        <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 whitespace-nowrap flex-shrink-0">
                            {displayTypeName}
                        </span>
                    </div>
                    <div className="flex flex-row flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                        {card.cardSelectDisplay?.item1 && <span className="truncate">{card.cardSelectDisplay.item1}</span>}
                        {card.cardSelectDisplay?.item2 && <span className="truncate">{card.cardSelectDisplay.item2}</span>}
                        {card.cardSelectDisplay?.item3 && (
                            <span className="truncate">{formatRhodesSubclassDomainRecommendation(card)}</span>
                        )}
                        {card.cardSelectDisplay?.item4 && <span className="truncate">{card.cardSelectDisplay.item4}</span>}
                    </div>
                </div>
            </div>

            {/* Separator */}
            <div className="w-px bg-gray-200"></div>

            {/* Right Column: Description + Hint */}
            <div className="flex-grow p-3 min-w-0 flex flex-col bg-gray-100 rounded-r-lg">
                {card.description && (
                    <div className="text-sm text-gray-700 flex-grow overflow-y-auto pr-1">
                        <CardMarkdown>{card.description}</CardMarkdown>
                    </div>
                )}
                {card.hint && card.type !== "profession" && (
                    <>
                        {card.description && <div className="h-px bg-gray-200 w-full my-2 flex-shrink-0"></div>}
                        <p className="text-xs text-gray-500 italic flex-shrink-0">{card.hint}</p>
                    </>
                )}
            </div>
        </div>
    )
}

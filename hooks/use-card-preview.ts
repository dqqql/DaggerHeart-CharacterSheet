import { useState, useCallback, useMemo, type CSSProperties } from 'react'
import type { StandardCard } from '@/card/card-types'
import type { SheetCardReference } from '@/lib/sheet-data'

export interface UseCardPreviewOptions {
    cards: StandardCard[]
    containerRef?: React.RefObject<HTMLElement | null>
    previewWidth?: number
    previewHeight?: number
}

export function useCardPreview({
    cards,
    containerRef,
    previewWidth = 300,
    previewHeight = 400,
}: UseCardPreviewOptions) {
    const [hoveredCard, setHoveredCard] = useState<StandardCard | null>(null)
    const [previewPosition, setPreviewPosition] = useState<CSSProperties>({})

    // 查找卡牌的函数
    const findCardByReference = useCallback((ref: SheetCardReference | undefined): StandardCard | null => {
        if (!ref?.id) return null
        const card = cards.find(c => c.id === ref.id)
        // formData.cards 中存储的已经是 StandardCard，无需再次转换
        return card || null
    }, [cards])

    // 获取预览位置的函数
    const calculatePreviewPosition = useCallback((element: HTMLElement): CSSProperties => {
        const rect = element.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // 计算最佳位置
        let left = rect.right + 10 // 默认在右侧
        let top = rect.top

        // 如果右侧空间不够，显示在左侧
        if (left + previewWidth > viewportWidth) {
            left = rect.left - previewWidth - 10
        }

        // 如果底部空间不够，向上调整
        if (top + previewHeight > viewportHeight) {
            top = viewportHeight - previewHeight - 10
        }

        // 确保不会超出顶部边界
        if (top < 10) {
            top = 10
        }

        return {
            position: 'fixed' as const,
            left: `${Math.max(10, left)}px`,
            top: `${top}px`,
            zIndex: 50,
        }
    }, [previewHeight, previewWidth])

    // 处理鼠标进入
    const handleMouseEnter = useCallback((ref: SheetCardReference | undefined, element: HTMLElement) => {
        const card = findCardByReference(ref)
        if (card) {
            setHoveredCard(card)
            setPreviewPosition(calculatePreviewPosition(element))
        }
    }, [findCardByReference, calculatePreviewPosition])

    // 处理鼠标离开
    const handleMouseLeave = useCallback(() => {
        setHoveredCard(null)
        setPreviewPosition({})
    }, [])

    return {
        hoveredCard,
        previewPosition,
        handleMouseEnter,
        handleMouseLeave,
        findCardByReference,
    }
}

"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { motion, useReducedMotion } from "framer-motion"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { ExtendedStandardCard, StandardCard } from "@/card/card-types"
import { ImageCard } from "@/components/ui/image-card"
import { SelectableCard } from "@/components/ui/selectable-card"
import { useTextModeStore } from "@/lib/text-mode-store"
import { cn } from "@/lib/utils"

const ROW_GAP = 24

interface VirtualizedCardGridProps<T extends StandardCard | ExtendedStandardCard> {
  cards: T[]
  onCardClick?: (card: T) => void
  isTextMode?: boolean
  selectedCardId?: string
  refreshTrigger?: number
  scrollableTarget: string
  className?: string
  hasMore?: boolean
  onLoadMore?: () => void
}

function getColumnCount(width: number, isTextMode: boolean) {
  if (isTextMode) {
    if (width >= 768) return 3
    if (width >= 640) return 2
    return 1
  }

  if (width >= 1024) return 3
  if (width >= 640) return 2
  return 1
}

export function VirtualizedCardGrid<T extends StandardCard | ExtendedStandardCard>({
  cards,
  onCardClick,
  isTextMode: isTextModeProp,
  selectedCardId,
  refreshTrigger = 0,
  scrollableTarget,
  className,
  hasMore = false,
  onLoadMore,
}: VirtualizedCardGridProps<T>) {
  const globalTextMode = useTextModeStore((state) => state.isTextMode)
  const isTextMode = isTextModeProp ?? globalTextMode
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)
  const lastLoadRequestSize = useRef(-1)

  useLayoutEffect(() => {
    setScrollElement(document.getElementById(scrollableTarget))
  }, [scrollableTarget])

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateWidth = () => setContainerWidth(element.clientWidth)
    updateWidth()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth)
      return () => window.removeEventListener("resize", updateWidth)
    }

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const columnCount = getColumnCount(containerWidth, isTextMode)
  const rowCount = Math.ceil(cards.length / columnCount)
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => isTextMode ? 390 : 570,
    initialRect: {
      width: containerWidth,
      height: scrollElement?.clientHeight ?? 0,
    },
    gap: ROW_GAP,
    overscan: isTextMode ? 3 : 2,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()

  useEffect(() => {
    lastLoadRequestSize.current = -1
    rowVirtualizer.scrollToOffset(0)
  }, [columnCount, isTextMode, refreshTrigger, rowVirtualizer])

  useEffect(() => {
    if (!hasMore || !onLoadMore || virtualRows.length === 0) return

    const lastVisibleRow = virtualRows[virtualRows.length - 1]
    if (
      lastVisibleRow.index >= rowCount - 2
      && lastLoadRequestSize.current !== cards.length
    ) {
      lastLoadRequestSize.current = cards.length
      onLoadMore()
    }
  }, [cards.length, hasMore, onLoadMore, rowCount, virtualRows])

  const cardIndexById = useMemo(
    () => new Map(cards.map((card, index) => [card.id, index])),
    [cards],
  )

  const focusCard = useCallback((index: number) => {
    if (index < 0 || index >= cards.length) return

    const rowIndex = Math.floor(index / columnCount)
    rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" })
    requestAnimationFrame(() => {
      const cardId = cards[index]?.id
      if (!cardId) return
      const item = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>("[data-card-grid-id]") ?? [],
      ).find((element) => element.dataset.cardGridId === cardId)
      const interactive = item?.matches("[data-card-interactive]")
        ? item
        : item?.querySelector<HTMLElement>("[data-card-interactive]")
      interactive?.focus()
    })
  }, [cards, columnCount, rowVirtualizer])

  const handleGridKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return

    const currentItem = (event.target as HTMLElement).closest<HTMLElement>("[data-card-grid-id]")
    const currentId = currentItem?.dataset.cardGridId
    const currentIndex = currentId ? cardIndexById.get(currentId) : undefined
    if (currentIndex === undefined) return

    const offset = event.key === "ArrowLeft"
      ? -1
      : event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp"
          ? -columnCount
          : columnCount

    event.preventDefault()
    focusCard(currentIndex + offset)
  }, [cardIndexById, columnCount, focusCard])

  return (
    <div
      ref={containerRef}
      data-virtualized-card-grid
      data-testid="virtual-grid"
      data-column-count={columnCount}
      className="relative w-full"
      style={{ height: `${rowVirtualizer.getTotalSize()}px`, contain: "layout paint style" }}
      onKeyDown={handleGridKeyDown}
    >
      {virtualRows.map((virtualRow) => {
        const rowCards = cards.slice(
          virtualRow.index * columnCount,
          (virtualRow.index + 1) * columnCount,
        )

        return (
          <div
            key={virtualRow.key}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translate3d(0, ${virtualRow.start}px, 0)`,
              contain: "layout paint style",
            }}
          >
            <motion.div
              key={`${virtualRow.index}-${refreshTrigger}-${isTextMode}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.24, delay: Math.min(virtualRow.index, 4) * 0.025, ease: "easeOut" }}
              className={cn("grid items-stretch justify-items-center gap-4", className)}
              style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
            >
              {rowCards.map((card, indexInRow) => (
                <div
                  key={card.id}
                  data-card-grid-id={card.id}
                  className="flex h-full w-full justify-center"
                  style={{ contain: "layout paint style" }}
                  {...(!isTextMode
                    ? {
                        "data-card-interactive": true,
                        role: "button",
                        tabIndex: 0,
                        "aria-label": `选择卡牌：${card.name || "未命名卡牌"}`,
                        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            onCardClick?.(card)
                          }
                        },
                      }
                    : {})}
                >
                  {isTextMode ? (
                    <SelectableCard
                      card={card}
                      onSelectCard={onCardClick as ((selectedCard: StandardCard | ExtendedStandardCard) => void) | undefined}
                      isSelected={card.id === selectedCardId}
                    />
                  ) : (
                    <ImageCard
                      card={card}
                      onClick={() => onCardClick?.(card)}
                      isSelected={card.id === selectedCardId}
                      priority={virtualRow.index === 0 && indexInRow < columnCount}
                      refreshTrigger={refreshTrigger}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

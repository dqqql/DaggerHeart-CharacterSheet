import { useCallback, useEffect, useRef } from 'react'

interface UseAutoResizeFontProps {
    maxFontSize?: number
    minFontSize?: number
    enableTooltip?: boolean
    tooltipDelay?: number
}

interface FontConfig {
    maxFontSize: number
    minFontSize: number
    enableTooltip: boolean
    tooltipDelay: number
}

interface ElementRecord {
    id: string
    text: string
    element: HTMLInputElement | null
    ref: (element: HTMLInputElement | null) => void
    needsMeasurement: boolean
    pendingContentWidth?: number
    lastContentWidth?: number
    lastMeasurementSignature?: string
    lastConfigSignature?: string
}

let sharedMeasureContext: CanvasRenderingContext2D | null | undefined
let sharedTooltip: HTMLDivElement | null = null
let activeTooltipOwner: symbol | null = null

function getMeasureContext() {
    if (sharedMeasureContext !== undefined) {
        return sharedMeasureContext
    }

    if (typeof document === 'undefined') {
        sharedMeasureContext = null
        return sharedMeasureContext
    }

    try {
        sharedMeasureContext = document.createElement('canvas').getContext('2d')
    } catch {
        sharedMeasureContext = null
    }
    return sharedMeasureContext
}

function getTooltipElement() {
    if (typeof document === 'undefined') return null
    if (sharedTooltip) return sharedTooltip

    sharedTooltip = document.createElement('div')
    sharedTooltip.id = 'auto-resize-tooltip'
    sharedTooltip.style.cssText = `
        position: fixed;
        z-index: 9999;
        display: none;
        background-color: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        max-width: 300px;
        word-break: break-word;
        white-space: normal;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `
    document.body.appendChild(sharedTooltip)
    return sharedTooltip
}

function positionTooltip(element: HTMLDivElement, x: number, y: number) {
    const rect = element.getBoundingClientRect()
    let left = x + 10
    let top = y - rect.height - 10

    if (left + rect.width > window.innerWidth) {
        left = x - rect.width - 10
    }
    if (top < 0) {
        top = y + 20
    }

    element.style.left = `${Math.max(10, left)}px`
    element.style.top = `${Math.max(10, top)}px`
}

function showTooltip(owner: symbol, text: string, x: number, y: number) {
    const element = getTooltipElement()
    if (!element) return

    activeTooltipOwner = owner
    element.textContent = text
    element.style.display = 'block'
    positionTooltip(element, x, y)
}

function moveTooltip(owner: symbol, x: number, y: number) {
    if (!sharedTooltip || activeTooltipOwner !== owner || sharedTooltip.style.display === 'none') {
        return
    }
    positionTooltip(sharedTooltip, x, y)
}

function hideTooltip(owner: symbol) {
    if (!sharedTooltip || activeTooltipOwner !== owner) return
    activeTooltipOwner = null
    sharedTooltip.style.display = 'none'
}

function parsePixelValue(value: string) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
}

function buildCanvasFont(style: CSSStyleDeclaration, fontSize: number) {
    return [
        style.fontStyle,
        style.fontVariant,
        style.fontWeight,
        style.fontStretch,
        `${fontSize}px`,
        style.fontFamily,
    ].filter(Boolean).join(' ')
}

function measureTextWidth(text: string, style: CSSStyleDeclaration, fontSize: number) {
    const context = getMeasureContext()
    let width: number

    if (context) {
        context.font = buildCanvasFont(style, fontSize)
        width = context.measureText(text).width
    } else {
        // Canvas is unavailable in a few test/webview environments. This fallback
        // remains allocation-free and errs slightly on the side of smaller print text.
        width = text.length * fontSize * 0.6
    }

    const letterSpacing = parsePixelValue(style.letterSpacing)
    if (letterSpacing && text.length > 1) {
        width += letterSpacing * (text.length - 1)
    }
    return width
}

function getContentWidth(element: HTMLInputElement, style: CSSStyleDeclaration) {
    return Math.max(
        0,
        element.clientWidth
            - parsePixelValue(style.paddingLeft)
            - parsePixelValue(style.paddingRight),
    )
}

function calculatePrintFontSize(
    textWidthAtMaxSize: number,
    availableWidth: number,
    maxFontSize: number,
    minFontSize: number,
) {
    if (textWidthAtMaxSize <= availableWidth || textWidthAtMaxSize <= 0) {
        return maxFontSize
    }

    return Math.max(
        minFontSize,
        Math.min(maxFontSize, Math.floor(maxFontSize * availableWidth / textWidthAtMaxSize)),
    )
}

export function useAutoResizeFont({
    maxFontSize = 14,
    minFontSize = 10,
    enableTooltip = true,
    tooltipDelay = 300,
}: UseAutoResizeFontProps = {}) {
    const configRef = useRef<FontConfig>({
        maxFontSize,
        minFontSize,
        enableTooltip,
        tooltipDelay,
    })
    configRef.current = { maxFontSize, minFontSize, enableTooltip, tooltipDelay }

    const ownerRef = useRef(Symbol('auto-resize-font'))
    const recordsRef = useRef(new Map<string, ElementRecord>())
    const dirtyRecordsRef = useRef(new Set<ElementRecord>())
    const animationFrameRef = useRef<number | null>(null)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pointerRef = useRef({ x: 0, y: 0 })
    const printingRef = useRef(false)

    const flushMeasurements = useCallback(() => {
        animationFrameRef.current = null
        const records = Array.from(dirtyRecordsRef.current)
        dirtyRecordsRef.current.clear()
        const config = configRef.current

        for (const record of records) {
            const element = record.element
            if (!element) continue

            const style = window.getComputedStyle(element)
            const contentWidth = record.pendingContentWidth
                ?? getContentWidth(element, style)
            record.pendingContentWidth = undefined

            const fontSignature = [
                style.fontStyle,
                style.fontVariant,
                style.fontWeight,
                style.fontStretch,
                style.fontFamily,
                style.letterSpacing,
            ].join('|')
            const signature = [
                record.text,
                contentWidth,
                config.maxFontSize,
                config.minFontSize,
                fontSignature,
                printingRef.current,
            ].join('|')

            record.needsMeasurement = false
            record.lastContentWidth = contentWidth
            if (signature === record.lastMeasurementSignature) continue
            record.lastMeasurementSignature = signature

            const normalizedText = record.text.trim()
            const textWidth = normalizedText
                ? measureTextWidth(record.text, style, config.maxFontSize)
                : 0
            const overflowing = normalizedText !== '' && textWidth > contentWidth
            const printFontSize = normalizedText
                ? calculatePrintFontSize(
                    textWidth,
                    contentWidth,
                    config.maxFontSize,
                    config.minFontSize,
                )
                : config.maxFontSize

            element.dataset.textOverflow = overflowing ? 'true' : 'false'
            element.style.setProperty('--print-font-size', `${printFontSize}px`)
        }
    }, [])

    const scheduleMeasurement = useCallback((record: ElementRecord, contentWidth?: number) => {
        if (contentWidth !== undefined) {
            if (record.lastContentWidth === contentWidth && !record.needsMeasurement) {
                return
            }
            record.pendingContentWidth = contentWidth
        }
        dirtyRecordsRef.current.add(record)

        if (animationFrameRef.current === null) {
            animationFrameRef.current = window.requestAnimationFrame(flushMeasurements)
        }
    }, [flushMeasurements])

    const getResizeObserver = useCallback(() => {
        if (resizeObserverRef.current || typeof ResizeObserver === 'undefined') {
            return resizeObserverRef.current
        }

        resizeObserverRef.current = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const element = entry.target as HTMLInputElement
                const id = element.dataset.autoResizeId
                const record = id ? recordsRef.current.get(id) : undefined
                if (record?.element === element) {
                    scheduleMeasurement(record, entry.contentRect.width)
                }
            }
        })
        return resizeObserverRef.current
    }, [scheduleMeasurement])

    const onMouseEnter = useCallback((event: React.MouseEvent<HTMLInputElement>) => {
        const element = event.currentTarget
        const config = configRef.current
        if (!config.enableTooltip || element.dataset.textOverflow !== 'true') return

        pointerRef.current = { x: event.clientX, y: event.clientY }
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
        tooltipTimeoutRef.current = setTimeout(() => {
            tooltipTimeoutRef.current = null
            showTooltip(
                ownerRef.current,
                element.dataset.text ?? '',
                pointerRef.current.x,
                pointerRef.current.y,
            )
        }, config.tooltipDelay)
    }, [])

    const onMouseLeave = useCallback(() => {
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current)
            tooltipTimeoutRef.current = null
        }
        hideTooltip(ownerRef.current)
    }, [])

    const onMouseMove = useCallback((event: React.MouseEvent<HTMLInputElement>) => {
        pointerRef.current = { x: event.clientX, y: event.clientY }
        moveTooltip(ownerRef.current, event.clientX, event.clientY)
    }, [])

    const getElementProps = useCallback((text: string, id: string, className?: string) => {
        let record = recordsRef.current.get(id)
        if (!record) {
            record = {
                id,
                text,
                element: null,
                needsMeasurement: true,
                ref: () => {},
            }
            record.ref = (element) => {
                const currentRecord = recordsRef.current.get(id)
                if (!currentRecord) return

                if (currentRecord.element && currentRecord.element !== element) {
                    resizeObserverRef.current?.unobserve(currentRecord.element)
                }
                currentRecord.element = element

                if (element) {
                    element.dataset.autoResizeId = id
                    getResizeObserver()?.observe(element)
                    currentRecord.needsMeasurement = true
                    scheduleMeasurement(currentRecord)
                }
            }
            recordsRef.current.set(id, record)
        }

        if (record.text !== text) {
            record.text = text
            record.needsMeasurement = true
        }

        const config = configRef.current
        const configSignature = `${config.maxFontSize}|${config.minFontSize}`
        if (record.lastConfigSignature !== configSignature) {
            record.lastConfigSignature = configSignature
            record.needsMeasurement = true
        }
        return {
            className: className ? `${className} auto-resize-font` : 'auto-resize-font',
            style: {
                fontSize: `${config.maxFontSize}px`,
            } as React.CSSProperties,
            'data-text': text,
            'data-max-font': config.maxFontSize,
            'data-min-font': config.minFontSize,
            onMouseEnter: config.enableTooltip ? onMouseEnter : undefined,
            onMouseLeave: config.enableTooltip ? onMouseLeave : undefined,
            onMouseMove: config.enableTooltip ? onMouseMove : undefined,
            ref: record.ref,
        }
    }, [getResizeObserver, onMouseEnter, onMouseLeave, onMouseMove, scheduleMeasurement])

    useEffect(() => {
        for (const record of recordsRef.current.values()) {
            if (record.needsMeasurement && record.element) {
                scheduleMeasurement(record)
            }
        }
    })

    useEffect(() => {
        const updatePrintingState = (printing: boolean) => {
            if (printingRef.current === printing) return
            printingRef.current = printing
            for (const record of recordsRef.current.values()) {
                if (record.element) {
                    record.needsMeasurement = true
                    scheduleMeasurement(record)
                }
            }
        }
        const mediaQuery = window.matchMedia?.('print')
        printingRef.current = mediaQuery?.matches ?? false
        const onMediaChange = (event: MediaQueryListEvent) => updatePrintingState(event.matches)
        const onBeforePrint = () => updatePrintingState(true)
        const onAfterPrint = () => updatePrintingState(false)

        mediaQuery?.addEventListener?.('change', onMediaChange)
        window.addEventListener('beforeprint', onBeforePrint)
        window.addEventListener('afterprint', onAfterPrint)

        return () => {
            mediaQuery?.removeEventListener?.('change', onMediaChange)
            window.removeEventListener('beforeprint', onBeforePrint)
            window.removeEventListener('afterprint', onAfterPrint)
        }
    }, [scheduleMeasurement])

    useEffect(() => {
        return () => {
            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current)
            }
            if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current)
            }
            hideTooltip(ownerRef.current)
            resizeObserverRef.current?.disconnect()
            recordsRef.current.clear()
            dirtyRecordsRef.current.clear()
        }
    }, [])

    return { getElementProps }
}

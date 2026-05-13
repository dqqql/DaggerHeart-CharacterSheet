"use client"

import { db, isIndexedDBAvailable } from "@/card/stores/image-service/database"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import {
  getActiveCharacterId,
  getAllCharacterStorageKeys,
  loadCharacterList,
} from "@/lib/multi-character-storage"
import { useDualPageStore } from "@/lib/dual-page-store"
import { usePinnedCardsStore } from "@/lib/pinned-cards-store"
import { useSheetStore } from "@/lib/sheet-store"
import { useTextModeStore } from "@/lib/text-mode-store"

declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
    measureUserAgentSpecificMemory?: () => Promise<{
      bytes: number
      breakdown?: Array<Record<string, unknown>>
    }>
  }

  interface Navigator {
    deviceMemory?: number
    connection?: {
      effectiveType?: string
      downlink?: number
      rtt?: number
      saveData?: boolean
    }
    storage?: {
      estimate?: () => Promise<{
        quota?: number
        usage?: number
        usageDetails?: Record<string, number>
      }>
      persisted?: () => Promise<boolean>
    }
  }

  interface Window {
    gc?: () => void
  }
}

type DiagnosticContextGetter = () => Record<string, unknown>

interface DiagnosticEvent {
  timestamp: string
  type: "console" | "error" | "unhandledrejection" | "lifecycle" | "custom"
  level?: "log" | "info" | "warn" | "error"
  message: string
  details?: unknown
}

interface MemorySample {
  timestamp: string
  performanceMemory: ReturnType<typeof getPerformanceMemorySnapshot>
  domSummary: ReturnType<typeof getDomSummary>
  appSummary: ReturnType<typeof getLightweightAppSummary>
}

const SAMPLE_INTERVAL_MS = 15000
const FALLBACK_SAMPLE_INTERVAL_MS = 5000
const MAX_SAMPLES = 120
const MAX_EVENTS = 400
const MAX_LOG_ARG_LENGTH = 4000
const MAX_STACK_LENGTH = 12000
const MAX_STRUCTURE_SUMMARY_NODES = 10000
let currentDiagnosticContextGetter: DiagnosticContextGetter = () => ({})

class MemoryDebugRecorder {
  private started = false
  private getContext: DiagnosticContextGetter = () => ({})
  private sampleTimer: number | null = null
  private samples: MemorySample[] = []
  private events: DiagnosticEvent[] = []
  private cleanupFns: Array<() => void> = []
  private originalConsole: Partial<
    Record<"log" | "info" | "warn" | "error", typeof console.log>
  > = {}
  private readonly sessionId = `memory-debug-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
  private readonly startedAt = new Date().toISOString()

  start() {
    if (this.started || typeof window === "undefined") {
      return
    }

    this.started = true
    this.recordEvent("lifecycle", "Memory debug monitor started")
    this.installConsoleCapture()
    this.installGlobalErrorCapture()
    this.captureSample()
    this.sampleTimer = window.setInterval(() => {
      this.captureSample()
    }, getSampleIntervalMs())
  }

  stop() {
    if (!this.started) {
      return
    }

    this.started = false

    if (this.sampleTimer !== null) {
      window.clearInterval(this.sampleTimer)
      this.sampleTimer = null
    }

    for (const cleanup of this.cleanupFns.splice(0, this.cleanupFns.length)) {
      cleanup()
    }

    this.restoreConsole()
  }

  setContextGetter(getter: DiagnosticContextGetter) {
    this.getContext = getter
    currentDiagnosticContextGetter = getter
  }

  recordCustomEvent(message: string, details?: unknown) {
    this.recordEvent("custom", message, details)
  }

  async exportReport(trigger: "manual" | "auto" = "manual") {
    this.captureSample()
    this.recordEvent("custom", "Exported memory debug report", { trigger })

    const [
      storageEstimate,
      userAgentMemory,
      indexedDbSummary,
      localStorageSnapshot,
      cardStoreSummary,
    ] = await Promise.all([
      getStorageEstimate(),
      getUserAgentSpecificMemory(),
      getIndexedDbSummary(),
      getLocalStorageSnapshot(),
      getCardStoreSummary(),
    ])

    const sheetStoreState = useSheetStore.getState()
    const dualPageState = useDualPageStore.getState()
    const textModeState = useTextModeStore.getState()
    const pinnedCardsState = usePinnedCardsStore.getState()
    const characterList = safeCall(() => loadCharacterList())

    const report = {
      meta: {
        sessionId: this.sessionId,
        startedAt: this.startedAt,
        exportedAt: new Date().toISOString(),
        trigger,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        url: typeof location !== "undefined" ? location.href : null,
      },
      environment: getEnvironmentSummary(),
      performance: {
        memory: getPerformanceMemorySnapshot(),
        userAgentSpecificMemory: userAgentMemory,
        navigation: getNavigationSummary(),
        resources: getResourceSummary(),
        memoryAnalysis: getMemoryAnalysis(this.samples),
      },
      dom: {
        summary: getDomSummary(),
        suspiciousCounts: getSuspiciousDomCounts(),
      },
      storage: {
        estimate: storageEstimate,
        localStorage: localStorageSnapshot,
        indexedDb: indexedDbSummary,
      },
      app: {
        activeCharacterId: safeCall(() => getActiveCharacterId()),
        characterList,
        sheetStore: {
          sheetData: sheetStoreState.sheetData,
          attributeUpgradeHistoryKeys: Object.keys(
            sheetStoreState.attributeUpgradeHistory || {},
          ),
          hasExperienceValuesSnapshot:
            !!sheetStoreState.experienceValuesSnapshot,
          hasEvasionSnapshot: !!sheetStoreState.evasionSnapshot,
        },
        textModeStore: {
          isTextMode: textModeState.isTextMode,
        },
        dualPageStore: {
          isDualPageMode: dualPageState.isDualPageMode,
          leftPageId: dualPageState.leftPageId,
          rightPageId: dualPageState.rightPageId,
          leftTabValue: dualPageState.leftTabValue,
          rightTabValue: dualPageState.rightTabValue,
        },
        pinnedCardsStore: {
          count: pinnedCardsState.pinnedCards.length,
          cards: pinnedCardsState.pinnedCards,
        },
        unifiedCardStore: cardStoreSummary,
        runtimeContext: this.getContext(),
      },
      history: {
        samples: this.samples,
        events: this.events,
      },
    }

    downloadJsonFile(
      report,
      `dh-memory-debug-${formatTimestampForFilename(new Date())}.json`,
    )
  }

  private installConsoleCapture() {
    const levels: Array<"log" | "info" | "warn" | "error"> = [
      "log",
      "info",
      "warn",
      "error",
    ]

    for (const level of levels) {
      if (this.originalConsole[level]) {
        continue
      }

      const original = console[level].bind(console)
      this.originalConsole[level] = original

      console[level] = ((...args: unknown[]) => {
        this.pushEvent({
          timestamp: new Date().toISOString(),
          type: "console",
          level,
          message: joinConsoleArgs(args),
          details: args.map((arg) => serializeForLog(arg)),
        })
        original(...args)
      }) as typeof console.log
    }
  }

  private restoreConsole() {
    const levels: Array<"log" | "info" | "warn" | "error"> = [
      "log",
      "info",
      "warn",
      "error",
    ]

    for (const level of levels) {
      const original = this.originalConsole[level]
      if (original) {
        console[level] = original as typeof console.log
      }
    }
  }

  private installGlobalErrorCapture() {
    const handleError = (event: ErrorEvent) => {
      this.pushEvent({
        timestamp: new Date().toISOString(),
        type: "error",
        level: "error",
        message: event.message || "Unknown global error",
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: serializeForLog(event.error),
        },
      })
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      this.pushEvent({
        timestamp: new Date().toISOString(),
        type: "unhandledrejection",
        level: "error",
        message: "Unhandled promise rejection",
        details: serializeForLog(event.reason),
      })
    }

    const handleVisibility = () => {
      this.recordEvent("lifecycle", "Page visibility changed", {
        visibilityState: document.visibilityState,
        performanceMemory: getPerformanceMemorySnapshot(),
        domSummary: getDomSummary(),
        appSummary: getLightweightAppSummary(),
      })
    }

    const handleFocus = () => {
      this.recordEvent("lifecycle", "Window focused", {
        performanceMemory: getPerformanceMemorySnapshot(),
        domSummary: getDomSummary(),
        appSummary: getLightweightAppSummary(),
      })
    }

    const handleBlur = () => {
      this.recordEvent("lifecycle", "Window blurred", {
        performanceMemory: getPerformanceMemorySnapshot(),
        domSummary: getDomSummary(),
        appSummary: getLightweightAppSummary(),
      })
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      this.recordEvent("lifecycle", "Page shown", {
        persisted: event.persisted,
        performanceMemory: getPerformanceMemorySnapshot(),
        domSummary: getDomSummary(),
        appSummary: getLightweightAppSummary(),
      })
    }

    const handlePageHide = (event: PageTransitionEvent) => {
      this.recordEvent("lifecycle", "Page hidden", {
        persisted: event.persisted,
        performanceMemory: getPerformanceMemorySnapshot(),
        domSummary: getDomSummary(),
        appSummary: getLightweightAppSummary(),
      })
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleRejection)
    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)
    window.addEventListener("pageshow", handlePageShow)
    window.addEventListener("pagehide", handlePageHide)

    this.cleanupFns.push(() =>
      window.removeEventListener("error", handleError),
    )
    this.cleanupFns.push(() =>
      window.removeEventListener("unhandledrejection", handleRejection),
    )
    this.cleanupFns.push(() =>
      document.removeEventListener("visibilitychange", handleVisibility),
    )
    this.cleanupFns.push(() => window.removeEventListener("focus", handleFocus))
    this.cleanupFns.push(() => window.removeEventListener("blur", handleBlur))
    this.cleanupFns.push(() =>
      window.removeEventListener("pageshow", handlePageShow),
    )
    this.cleanupFns.push(() =>
      window.removeEventListener("pagehide", handlePageHide),
    )
  }

  private captureSample() {
    if (typeof document === "undefined") {
      return
    }

    this.samples.push({
      timestamp: new Date().toISOString(),
      performanceMemory: getPerformanceMemorySnapshot(),
      domSummary: getDomSummary(),
      appSummary: getLightweightAppSummary(),
    })

    if (this.samples.length > MAX_SAMPLES) {
      this.samples.splice(0, this.samples.length - MAX_SAMPLES)
    }
  }

  private recordEvent(
    type: DiagnosticEvent["type"],
    message: string,
    details?: unknown,
  ) {
    this.pushEvent({
      timestamp: new Date().toISOString(),
      type,
      message,
      details,
    })
  }

  private pushEvent(event: DiagnosticEvent) {
    this.events.push(event)
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS)
    }
  }
}

const recorder = new MemoryDebugRecorder()

export function startMemoryDebugMonitor() {
  recorder.start()
}

export function stopMemoryDebugMonitor() {
  recorder.stop()
}

export function setMemoryDebugContextGetter(getter: DiagnosticContextGetter) {
  recorder.setContextGetter(getter)
}

export function recordMemoryDebugEvent(message: string, details?: unknown) {
  recorder.recordCustomEvent(message, details)
}

export async function exportMemoryDebugReport(
  trigger: "manual" | "auto" = "manual",
) {
  await recorder.exportReport(trigger)
}

function safeCall<T>(fn: () => T): T | { error: string } | null {
  try {
    return fn()
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function bytesToMB(bytes: number | undefined | null) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) {
    return null
  }

  return Number((bytes / (1024 * 1024)).toFixed(2))
}

function getSampleIntervalMs() {
  return performance.memory ? SAMPLE_INTERVAL_MS : FALLBACK_SAMPLE_INTERVAL_MS
}

function limitString(value: string, maxLength = MAX_LOG_ARG_LENGTH) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength)}... [truncated ${
    value.length - maxLength
  } chars]`
}

function serializeForLog(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === "string") {
    return limitString(value)
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value
  }

  if (typeof value === "bigint") {
    return value.toString()
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: limitString(value.stack || "", MAX_STACK_LENGTH),
    }
  }

  if (Array.isArray(value)) {
    if (depth >= 3) {
      return `[Array(${value.length})]`
    }

    return value
      .slice(0, 20)
      .map((item) => serializeForLog(item, depth + 1, seen))
  }

  if (value instanceof Map) {
    return {
      type: "Map",
      size: value.size,
      entries: Array.from(value.entries())
        .slice(0, 20)
        .map(([key, mapValue]) => [
          serializeForLog(key, depth + 1, seen),
          serializeForLog(mapValue, depth + 1, seen),
        ]),
    }
  }

  if (value instanceof Set) {
    return {
      type: "Set",
      size: value.size,
      values: Array.from(value.values())
        .slice(0, 20)
        .map((item) => serializeForLog(item, depth + 1, seen)),
    }
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]"
    }

    seen.add(value)

    if (depth >= 3) {
      return `[Object ${
        (value as Record<string, unknown>).constructor?.name || "Object"
      }]`
    }

    const output: Record<string, unknown> = {}
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      30,
    )

    for (const [key, entryValue] of entries) {
      output[key] = serializeForLog(entryValue, depth + 1, seen)
    }

    return output
  }

  return String(value)
}

function joinConsoleArgs(args: unknown[]) {
  return args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg
      }

      try {
        return JSON.stringify(serializeForLog(arg))
      } catch {
        return String(arg)
      }
    })
    .join(" ")
}

function getPerformanceMemorySnapshot() {
  const memory = performance.memory

  if (!memory) {
    return {
      supported: false,
      usedJSHeapSize: null,
      totalJSHeapSize: null,
      jsHeapSizeLimit: null,
      usedJSHeapSizeMB: null,
      totalJSHeapSizeMB: null,
      jsHeapSizeLimitMB: null,
    }
  }

  return {
    supported: true,
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usedJSHeapSizeMB: bytesToMB(memory.usedJSHeapSize),
    totalJSHeapSizeMB: bytesToMB(memory.totalJSHeapSize),
    jsHeapSizeLimitMB: bytesToMB(memory.jsHeapSizeLimit),
  }
}

async function getUserAgentSpecificMemory() {
  if (typeof performance.measureUserAgentSpecificMemory !== "function") {
    return {
      supported: false,
    }
  }

  try {
    const result = await performance.measureUserAgentSpecificMemory()
    return {
      supported: true,
      bytes: result.bytes,
      mb: bytesToMB(result.bytes),
      breakdown: Array.isArray(result.breakdown)
        ? result.breakdown.map((item) => serializeForLog(item))
        : null,
    }
  } catch (error) {
    return {
      supported: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function getEnvironmentSummary() {
  const connection = navigator.connection

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory ?? null,
    maxTouchPoints: navigator.maxTouchPoints,
    doNotTrack: navigator.doNotTrack,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
    },
    location: {
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    },
    document: {
      title: document.title,
      visibilityState: document.visibilityState,
      readyState: document.readyState,
      referrer: document.referrer,
    },
    capabilities: {
      gcExposed: typeof window.gc === "function",
      performanceMemory: !!performance.memory,
      measureUserAgentSpecificMemory:
        typeof performance.measureUserAgentSpecificMemory === "function",
      storageEstimate: typeof navigator.storage?.estimate === "function",
    },
    connection: connection
      ? {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        }
      : null,
  }
}

function getNavigationSummary() {
  const navigationEntry = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined

  return navigationEntry
    ? {
        type: navigationEntry.type,
        startTime: navigationEntry.startTime,
        duration: navigationEntry.duration,
        domContentLoaded:
          navigationEntry.domContentLoadedEventEnd -
          navigationEntry.startTime,
        loadEventEnd:
          navigationEntry.loadEventEnd - navigationEntry.startTime,
        transferSize: navigationEntry.transferSize,
        encodedBodySize: navigationEntry.encodedBodySize,
        decodedBodySize: navigationEntry.decodedBodySize,
      }
    : null
}

function getResourceSummary() {
  const resources = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[]
  const initiatorTypeCounts: Record<string, number> = {}
  let totalTransferSize = 0
  let totalEncodedBodySize = 0
  let totalDecodedBodySize = 0

  for (const resource of resources) {
    const key = resource.initiatorType || "unknown"
    initiatorTypeCounts[key] = (initiatorTypeCounts[key] || 0) + 1
    totalTransferSize += resource.transferSize || 0
    totalEncodedBodySize += resource.encodedBodySize || 0
    totalDecodedBodySize += resource.decodedBodySize || 0
  }

  return {
    totalEntries: resources.length,
    initiatorTypeCounts,
    totalTransferSize,
    totalTransferSizeMB: bytesToMB(totalTransferSize),
    totalEncodedBodySize,
    totalEncodedBodySizeMB: bytesToMB(totalEncodedBodySize),
    totalDecodedBodySize,
    totalDecodedBodySizeMB: bytesToMB(totalDecodedBodySize),
  }
}

function getTagCounts() {
  const counts: Record<string, number> = {}
  const elements = document.querySelectorAll("*")

  for (const element of elements) {
    const tag = element.tagName.toLowerCase()
    counts[tag] = (counts[tag] || 0) + 1
  }

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 30)
    .map(([tag, count]) => ({ tag, count }))
}

function getDomSummary() {
  const images = Array.from(document.images)
  const inputs = Array.from(document.querySelectorAll("input"))
  const textareas = Array.from(document.querySelectorAll("textarea"))
  const contentEditables = Array.from(
    document.querySelectorAll('[contenteditable="true"]'),
  )
  const bodyHtml = document.body?.innerHTML || ""
  const bodyText = document.body?.innerText || ""

  const inputValueLength = inputs.reduce(
    (total, input) => total + (input.value?.length || 0),
    0,
  )
  const textareaValueLength = textareas.reduce(
    (total, textarea) => total + (textarea.value?.length || 0),
    0,
  )
  const contentEditableTextLength = contentEditables.reduce(
    (total, element) => total + (element.textContent?.length || 0),
    0,
  )

  return {
    totalElements: document.querySelectorAll("*").length,
    totalNodes: document.getElementsByTagName("*").length,
    styleTagCount: document.querySelectorAll("style").length,
    stylesheetCount: document.styleSheets.length,
    scriptCount: document.scripts.length,
    imageCount: images.length,
    loadedImageCount: images.filter((img) => img.complete).length,
    inputCount: inputs.length,
    textareaCount: textareas.length,
    contentEditableCount: contentEditables.length,
    iframeCount: document.querySelectorAll("iframe").length,
    bodyHtmlLength: bodyHtml.length,
    bodyTextLength: bodyText.length,
    inputValueLength,
    textareaValueLength,
    contentEditableTextLength,
    totalFieldValueLength:
      inputValueLength + textareaValueLength + contentEditableTextLength,
    tagCounts: getTagCounts(),
  }
}

function getLightweightAppSummary() {
  const sheetStoreState = useSheetStore.getState()
  const textModeState = useTextModeStore.getState()
  const dualPageState = useDualPageStore.getState()
  const pinnedCardsState = usePinnedCardsStore.getState()
  const unifiedCardState = useUnifiedCardStore.getState()
  const runtimeContext = safeCall(() =>
    serializeForLog(currentDiagnosticContextGetter()),
  )

  const sheetDataJson = safeCall(() =>
    JSON.stringify(sheetStoreState.sheetData ?? {}),
  )
  const sheetDataJsonLength =
    typeof sheetDataJson === "string" ? sheetDataJson.length : null
  const localStorageSummary = getLocalStorageQuickSummary()
  const sheetDataStructure = summarizeStructuredData(sheetStoreState.sheetData)

  return {
    runtimeContext,
    sheetDataJsonLength,
    sheetDataJsonKB:
      typeof sheetDataJsonLength === "number"
        ? Number((sheetDataJsonLength / 1024).toFixed(2))
        : null,
    sheetDataStructure,
    pinnedCardsCount: pinnedCardsState.pinnedCards.length,
    isTextMode: textModeState.isTextMode,
    isDualPageMode: dualPageState.isDualPageMode,
    leftPageId: dualPageState.leftPageId,
    rightPageId: dualPageState.rightPageId,
    leftTabValue: dualPageState.leftTabValue,
    rightTabValue: dualPageState.rightTabValue,
    unifiedCardsSize: unifiedCardState.cards.size,
    unifiedBatchesSize: unifiedCardState.batches.size,
    imageServiceCacheSize: unifiedCardState.imageService.cache.size,
    imageServiceLoadingSize: unifiedCardState.imageService.loadingImages.size,
    imageServiceFailedSize: unifiedCardState.imageService.failedImages.size,
    localStorageKeyCount: localStorageSummary.totalKeys,
    localStorageTotalKB: localStorageSummary.totalSizeKB,
    characterStorageKeyCount: localStorageSummary.characterStorageKeyCount,
  }
}

function getMemoryAnalysis(samples: MemorySample[]) {
  if (samples.length === 0) {
    return {
      sampleCount: 0,
    }
  }

  const firstSample = samples[0]
  const lastSample = samples[samples.length - 1]

  const peakUsedHeap = pickPeakSample(
    samples,
    (sample) => sample.performanceMemory.usedJSHeapSize ?? -1,
  )
  const peakTotalHeap = pickPeakSample(
    samples,
    (sample) => sample.performanceMemory.totalJSHeapSize ?? -1,
  )
  const peakElements = pickPeakSample(
    samples,
    (sample) => sample.domSummary.totalElements,
  )
  const peakStyles = pickPeakSample(
    samples,
    (sample) => sample.domSummary.styleTagCount,
  )
  const peakBodyHtml = pickPeakSample(
    samples,
    (sample) => sample.domSummary.bodyHtmlLength,
  )
  const peakBodyText = pickPeakSample(
    samples,
    (sample) => sample.domSummary.bodyTextLength,
  )
  const peakFieldValueLength = pickPeakSample(
    samples,
    (sample) => sample.domSummary.totalFieldValueLength,
  )
  const peakSheetData = pickPeakSample(
    samples,
    (sample) => sample.appSummary.sheetDataJsonLength ?? -1,
  )
  const peakLocalStorage = pickPeakSample(
    samples,
    (sample) => sample.appSummary.localStorageTotalKB ?? -1,
  )
  const peakSheetDataStrings = pickPeakSample(
    samples,
    (sample) => sample.appSummary.sheetDataStructure.totalStringLength ?? -1,
  )

  return {
    sampleCount: samples.length,
    firstSampleAt: firstSample.timestamp,
    lastSampleAt: lastSample.timestamp,
    heapTrendMB: {
      first: firstSample.performanceMemory.usedJSHeapSizeMB,
      last: lastSample.performanceMemory.usedJSHeapSizeMB,
      delta:
        typeof firstSample.performanceMemory.usedJSHeapSizeMB === "number" &&
        typeof lastSample.performanceMemory.usedJSHeapSizeMB === "number"
          ? Number(
              (
                lastSample.performanceMemory.usedJSHeapSizeMB -
                firstSample.performanceMemory.usedJSHeapSizeMB
              ).toFixed(2),
            )
          : null,
    },
    peakUsedHeap: peakUsedHeap
      ? {
          timestamp: peakUsedHeap.timestamp,
          usedJSHeapSizeMB: peakUsedHeap.performanceMemory.usedJSHeapSizeMB,
        }
      : null,
    peakTotalHeap: peakTotalHeap
      ? {
          timestamp: peakTotalHeap.timestamp,
          totalJSHeapSizeMB: peakTotalHeap.performanceMemory.totalJSHeapSizeMB,
        }
      : null,
    peakElements: peakElements
      ? {
          timestamp: peakElements.timestamp,
          totalElements: peakElements.domSummary.totalElements,
        }
      : null,
    peakStyleTagCount: peakStyles
      ? {
          timestamp: peakStyles.timestamp,
          styleTagCount: peakStyles.domSummary.styleTagCount,
        }
      : null,
    peakBodyHtmlLength: peakBodyHtml
      ? {
          timestamp: peakBodyHtml.timestamp,
          bodyHtmlLength: peakBodyHtml.domSummary.bodyHtmlLength,
        }
      : null,
    peakBodyTextLength: peakBodyText
      ? {
          timestamp: peakBodyText.timestamp,
          bodyTextLength: peakBodyText.domSummary.bodyTextLength,
        }
      : null,
    peakFieldValueLength: peakFieldValueLength
      ? {
          timestamp: peakFieldValueLength.timestamp,
          totalFieldValueLength:
            peakFieldValueLength.domSummary.totalFieldValueLength,
        }
      : null,
    peakSheetDataJsonKB: peakSheetData
      ? {
          timestamp: peakSheetData.timestamp,
          sheetDataJsonKB: peakSheetData.appSummary.sheetDataJsonKB,
        }
      : null,
    peakLocalStorageTotalKB: peakLocalStorage
      ? {
          timestamp: peakLocalStorage.timestamp,
          localStorageTotalKB: peakLocalStorage.appSummary.localStorageTotalKB,
        }
      : null,
    peakSheetDataStringLength: peakSheetDataStrings
      ? {
          timestamp: peakSheetDataStrings.timestamp,
          totalStringLength:
            peakSheetDataStrings.appSummary.sheetDataStructure.totalStringLength,
        }
      : null,
    proxyTrends: {
      bodyHtmlLength: getTrendValue(
        firstSample.domSummary.bodyHtmlLength,
        lastSample.domSummary.bodyHtmlLength,
      ),
      bodyTextLength: getTrendValue(
        firstSample.domSummary.bodyTextLength,
        lastSample.domSummary.bodyTextLength,
      ),
      totalFieldValueLength: getTrendValue(
        firstSample.domSummary.totalFieldValueLength,
        lastSample.domSummary.totalFieldValueLength,
      ),
      sheetDataJsonKB: getTrendValue(
        firstSample.appSummary.sheetDataJsonKB,
        lastSample.appSummary.sheetDataJsonKB,
      ),
      localStorageTotalKB: getTrendValue(
        firstSample.appSummary.localStorageTotalKB,
        lastSample.appSummary.localStorageTotalKB,
      ),
      sheetDataTotalStringLength: getTrendValue(
        firstSample.appSummary.sheetDataStructure.totalStringLength,
        lastSample.appSummary.sheetDataStructure.totalStringLength,
      ),
      unifiedCardsSize: getTrendValue(
        firstSample.appSummary.unifiedCardsSize,
        lastSample.appSummary.unifiedCardsSize,
      ),
    },
  }
}

function getTrendValue(
  first: number | null | undefined,
  last: number | null | undefined,
) {
  return {
    first: typeof first === "number" ? first : null,
    last: typeof last === "number" ? last : null,
    delta:
      typeof first === "number" && typeof last === "number"
        ? Number((last - first).toFixed(2))
        : null,
  }
}

function pickPeakSample(
  samples: MemorySample[],
  getValue: (sample: MemorySample) => number,
) {
  let peakSample: MemorySample | null = null
  let peakValue = Number.NEGATIVE_INFINITY

  for (const sample of samples) {
    const value = getValue(sample)
    if (value > peakValue) {
      peakValue = value
      peakSample = sample
    }
  }

  return peakSample
}

function getSuspiciousDomCounts() {
  return {
    autoResizeTooltip: document.querySelectorAll("#auto-resize-tooltip").length,
    printContext: document.querySelectorAll("[data-print-context]").length,
    notebookTextarea: document.querySelectorAll(".notebook-textarea").length,
    markdownEditors: document.querySelectorAll(".w-md-editor").length,
    markdownRendered: document.querySelectorAll(".wmde-markdown").length,
    printPreviewContainers: document.querySelectorAll(".print-all-pages").length,
    progressModalStyles: document.querySelectorAll(
      "#unified-progress-modal-styles",
    ).length,
  }
}

async function getStorageEstimate() {
  if (typeof navigator.storage?.estimate !== "function") {
    return {
      supported: false,
    }
  }

  try {
    const estimate = await navigator.storage.estimate()
    return {
      supported: true,
      usage: estimate.usage ?? null,
      quota: estimate.quota ?? null,
      usageMB: bytesToMB(estimate.usage),
      quotaMB: bytesToMB(estimate.quota),
      usageDetails: estimate.usageDetails ?? null,
      persisted:
        typeof navigator.storage.persisted === "function"
          ? await navigator.storage.persisted()
          : null,
    }
  } catch (error) {
    return {
      supported: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function getIndexedDbSummary() {
  if (!isIndexedDBAvailable()) {
    return {
      supported: false,
    }
  }

  try {
    const [editorImageRecords, imageRecords, officialImageRecords] =
      await Promise.all([
        db.editorImages.toArray(),
        db.images.toArray(),
        db.officialImages.toArray(),
      ])

    return {
      supported: true,
      tables: {
        editorImages: summarizeDbRecords(editorImageRecords),
        images: summarizeDbRecords(imageRecords),
        officialImages: summarizeDbRecords(officialImageRecords),
      },
    }
  } catch (error) {
    return {
      supported: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function summarizeDbRecords(
  records: Array<{ key?: unknown; size?: unknown }>,
) {
  const totalSize = records.reduce((total, record) => {
    const size = typeof record.size === "number" ? record.size : 0
    return total + size
  }, 0)

  return {
    count: records.length,
    totalSize,
    totalSizeMB: bytesToMB(totalSize),
    sampleKeys: records
      .slice(0, 20)
      .map((record) =>
        typeof record.key === "string" ? record.key : String(record.key),
      ),
  }
}

async function getLocalStorageSnapshot() {
  try {
    if (typeof localStorage === "undefined") {
      return {
        supported: false,
      }
    }

    const characterKeys = getAllCharacterStorageKeys()
    const keys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key): key is string => !!key)

    const entries = keys.map((key) => {
      const value = localStorage.getItem(key) ?? ""
      return {
        key,
        size: value.length,
        sizeKB: Number((value.length / 1024).toFixed(2)),
        value,
      }
    })

    return {
      supported: true,
      totalKeys: localStorage.length,
      characterKeys,
      entries,
    }
  } catch (error) {
    return {
      supported: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function getLocalStorageQuickSummary() {
  if (typeof localStorage === "undefined") {
    return {
      totalKeys: null,
      totalSizeKB: null,
      characterStorageKeyCount: null,
    }
  }

  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key): key is string => !!key)

    const totalSize = keys.reduce((total, key) => {
      return total + (localStorage.getItem(key)?.length || 0)
    }, 0)

    return {
      totalKeys: localStorage.length,
      totalSizeKB: Number((totalSize / 1024).toFixed(2)),
      characterStorageKeyCount: getAllCharacterStorageKeys().length,
    }
  } catch {
    return {
      totalKeys: null,
      totalSizeKB: null,
      characterStorageKeyCount: null,
    }
  }
}

function summarizeStructuredData(root: unknown) {
  const summary = {
    visitedNodes: 0,
    truncated: false,
    maxDepth: 0,
    objectCount: 0,
    arrayCount: 0,
    stringCount: 0,
    totalStringLength: 0,
    numberCount: 0,
    booleanCount: 0,
    nullCount: 0,
  }

  const seen = new WeakSet<object>()

  const visit = (value: unknown, depth: number) => {
    if (summary.visitedNodes >= MAX_STRUCTURE_SUMMARY_NODES) {
      summary.truncated = true
      return
    }

    summary.visitedNodes += 1
    summary.maxDepth = Math.max(summary.maxDepth, depth)

    if (value === null || value === undefined) {
      summary.nullCount += 1
      return
    }

    if (typeof value === "string") {
      summary.stringCount += 1
      summary.totalStringLength += value.length
      return
    }

    if (typeof value === "number") {
      summary.numberCount += 1
      return
    }

    if (typeof value === "boolean") {
      summary.booleanCount += 1
      return
    }

    if (typeof value !== "object") {
      return
    }

    if (seen.has(value)) {
      return
    }

    seen.add(value)

    if (Array.isArray(value)) {
      summary.arrayCount += 1
      for (const item of value) {
        visit(item, depth + 1)
        if (summary.truncated) {
          return
        }
      }
      return
    }

    summary.objectCount += 1
    for (const entryValue of Object.values(value as Record<string, unknown>)) {
      visit(entryValue, depth + 1)
      if (summary.truncated) {
        return
      }
    }
  }

  visit(root, 0)

  return summary
}

async function getCardStoreSummary() {
  try {
    const state = useUnifiedCardStore.getState()
    const stats = state.getStats()
    const storageInfo = state.getStorageInfo()

    return {
      initialized: state.initialized,
      loading: state.loading,
      error: state.error,
      cardsSize: state.cards.size,
      batchesSize: state.batches.size,
      cardsByType: Array.from(state.cardsByType.entries()).map(
        ([type, ids]) => ({
          type,
          count: ids.length,
        }),
      ),
      batchIds: Array.from(state.batches.keys()).slice(0, 50),
      stats,
      storageInfo,
      imageService: {
        initialized: state.imageService.initialized,
        cacheSize: state.imageService.cache.size,
        cacheOrderLength: state.imageService.cacheOrder.length,
        loadingImagesSize: state.imageService.loadingImages.size,
        failedImagesSize: state.imageService.failedImages.size,
        maxCacheSize: state.imageService.maxCacheSize,
      },
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function downloadJsonFile(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatTimestampForFilename(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

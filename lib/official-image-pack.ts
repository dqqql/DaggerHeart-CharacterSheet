"use client"

import JSZip from "jszip"

import builtinCardPack from "@/data/cards/builtin-base.json"
import { CardSource, type StandardCard } from "@/card/card-types"
import { db, isIndexedDBAvailable } from "@/card/stores/image-service/database"

export const OFFICIAL_IMAGE_PACK_TYPE = "official-image-pack"
export const OFFICIAL_IMAGE_PACK_TARGET = "builtin-base"
export const OFFICIAL_IMAGE_PACK_MATCH_BY = "cardId"
export const OFFICIAL_IMAGE_PACK_ID = "builtin-official-images"

const SUPPORTED_IMAGE_EXTENSIONS = /\.(webp|png|jpe?g|gif|svg)$/i
const OFFICIAL_IMAGE_CACHE_LIMIT = 120

export interface OfficialImagePackManifest {
  type: string
  packId: string
  version: string
  target: string
  matchBy: string
  imagePattern: string
}

export interface OfficialImagePackMetadata {
  packId: string
  version: string
  importTime: string
  imageCount: number
  target: string
  manifest: OfficialImagePackManifest
  available: boolean
  warnings: string[]
}

export interface OfficialImagePackImportResult {
  metadata: OfficialImagePackMetadata
  warnings: string[]
}

export type OfficialImagePackImportPhase =
  | "loading-zip"
  | "validating"
  | "extracting-images"
  | "writing-images"
  | "finalizing"

export interface OfficialImagePackImportProgress {
  phase: OfficialImagePackImportPhase
  processed: number
  total: number
  percent: number
  currentCardId?: string
}

interface ImportOfficialImagePackOptions {
  onProgress?: (progress: OfficialImagePackImportProgress) => void
}

type OfficialImagePackZipKind =
  | "official-image-pack"
  | "offline-app-package"
  | "custom-card-package"
  | "unknown"

type BuiltinCardPackLike = {
  version?: string
  profession?: Array<{ id: string }>
  ancestry?: Array<{ id: string }>
  community?: Array<{ id: string }>
  subclass?: Array<{ id: string }>
  domain?: Array<{ id: string }>
  variant?: Array<{ id: string }>
}

const builtinCards = builtinCardPack as BuiltinCardPackLike
const builtinCardIds = new Set(
  [
    ...(builtinCards.profession ?? []),
    ...(builtinCards.ancestry ?? []),
    ...(builtinCards.community ?? []),
    ...(builtinCards.subclass ?? []),
    ...(builtinCards.domain ?? []),
    ...(builtinCards.variant ?? []),
  ]
    .map((card) => card.id)
    .filter(Boolean),
)

const officialImageCache = new Map<string, string>()
const officialImageCacheOrder: string[] = []
const failedOfficialImages = new Set<string>()

function normalizeZipPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "")
}

function getZipDirname(path: string): string {
  const normalizedPath = normalizeZipPath(path)
  const lastSlashIndex = normalizedPath.lastIndexOf("/")

  if (lastSlashIndex === -1) {
    return ""
  }

  return normalizedPath.slice(0, lastSlashIndex + 1)
}

function joinZipPath(basePath: string, relativePath: string): string {
  if (!basePath) {
    return normalizeZipPath(relativePath)
  }

  return normalizeZipPath(`${basePath}${relativePath}`)
}

function normalizeImageCardId(filePath: string): string {
  const withoutPrefix = filePath.replace(/^images\//i, "")
  return withoutPrefix.replace(SUPPORTED_IMAGE_EXTENSIONS, "")
}

function createOfficialImagePackProgressReporter(
  onProgress?: ImportOfficialImagePackOptions["onProgress"],
) {
  return (
    phase: OfficialImagePackImportPhase,
    processed: number,
    total: number,
    currentCardId?: string,
  ) => {
    if (!onProgress) {
      return
    }

    const percent =
      total > 0 ? Math.max(0, Math.min(100, Math.round((processed / total) * 100))) : 0

    onProgress({
      phase,
      processed,
      total,
      percent,
      currentCardId,
    })
  }
}

export function findOfficialImagePackManifestPath(zip: JSZip): string | null {
  const manifestCandidates = Object.keys(zip.files)
    .filter((name) => /(^|\/)manifest\.json$/i.test(name) && !zip.files[name].dir)
    .sort((left, right) => left.length - right.length)

  if (manifestCandidates.length === 0) {
    return null
  }

  const rootManifestPath = manifestCandidates.find(
    (path) => normalizeZipPath(path) === "manifest.json",
  )

  return rootManifestPath ?? manifestCandidates[0]
}

export function detectOfficialImagePackZipKind(zip: JSZip): OfficialImagePackZipKind {
  const fileNames = Object.keys(zip.files).map((name) => normalizeZipPath(name))

  const hasManifest = fileNames.some((name) => /(^|\/)manifest\.json$/i.test(name))
  if (hasManifest) {
    return "official-image-pack"
  }

  const hasOfflineAppMarkers =
    fileNames.includes("index.html") ||
    fileNames.includes("START-HERE.html") ||
    fileNames.some((name) => name.startsWith("_next/"))

  if (hasOfflineAppMarkers) {
    return "offline-app-package"
  }

  const hasCustomCardMarkers =
    fileNames.includes("cards.json") ||
    fileNames.some((name) => name.endsWith(".dhcb")) ||
    fileNames.some((name) => name.startsWith("images/"))

  if (hasCustomCardMarkers) {
    return "custom-card-package"
  }

  return "unknown"
}

export function resolveOfficialImagePackImageRoot(
  manifestPath: string,
  manifest: OfficialImagePackManifest,
): string {
  const manifestDir = getZipDirname(manifestPath)
  const normalizedPattern = normalizeZipPath(manifest.imagePattern)
  const placeholderIndex = normalizedPattern.indexOf("{cardId}")

  if (placeholderIndex === -1) {
    return joinZipPath(manifestDir, "images/")
  }

  const patternPrefix = normalizedPattern.slice(0, placeholderIndex)
  const directoryPrefix = getZipDirname(patternPrefix)

  return joinZipPath(manifestDir, directoryPrefix || "images/")
}

function updateOfficialImageCache(cardId: string, blobUrl: string) {
  officialImageCache.set(cardId, blobUrl)

  const existingIndex = officialImageCacheOrder.indexOf(cardId)
  if (existingIndex > -1) {
    officialImageCacheOrder.splice(existingIndex, 1)
  }
  officialImageCacheOrder.push(cardId)

  while (officialImageCacheOrder.length > OFFICIAL_IMAGE_CACHE_LIMIT) {
    const evictedId = officialImageCacheOrder.shift()
    if (!evictedId) {
      continue
    }

    const evictedUrl = officialImageCache.get(evictedId)
    if (evictedUrl) {
      URL.revokeObjectURL(evictedUrl)
    }
    officialImageCache.delete(evictedId)
  }
}

function touchOfficialImageCache(cardId: string): string | null {
  const blobUrl = officialImageCache.get(cardId)
  if (!blobUrl) {
    return null
  }

  const existingIndex = officialImageCacheOrder.indexOf(cardId)
  if (existingIndex > -1) {
    officialImageCacheOrder.splice(existingIndex, 1)
    officialImageCacheOrder.push(cardId)
  }

  return blobUrl
}

export function getExpectedBuiltinImagePackVersion(): string {
  return builtinCards.version ?? "unknown"
}

export function isBuiltinCard(card: StandardCard | undefined): boolean {
  if (!card) {
    return false
  }

  return (card as StandardCard & { source?: CardSource }).source === CardSource.BUILTIN
}

export function validateOfficialImagePackManifest(
  manifest: unknown,
): OfficialImagePackManifest {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("manifest.json 格式无效。")
  }

  const candidate = manifest as Partial<OfficialImagePackManifest>

  if (candidate.type !== OFFICIAL_IMAGE_PACK_TYPE) {
    throw new Error(`manifest.json.type 必须为 "${OFFICIAL_IMAGE_PACK_TYPE}"。`)
  }

  if (!candidate.packId || typeof candidate.packId !== "string") {
    throw new Error("manifest.json.packId 缺失或格式无效。")
  }

  if (!candidate.version || typeof candidate.version !== "string") {
    throw new Error("manifest.json.version 缺失或格式无效。")
  }

  if (!candidate.target || typeof candidate.target !== "string") {
    throw new Error("manifest.json.target 缺失或格式无效。")
  }

  if (candidate.matchBy !== OFFICIAL_IMAGE_PACK_MATCH_BY) {
    throw new Error(`manifest.json.matchBy 必须为 "${OFFICIAL_IMAGE_PACK_MATCH_BY}"。`)
  }

  if (!candidate.imagePattern || typeof candidate.imagePattern !== "string") {
    throw new Error("manifest.json.imagePattern 缺失或格式无效。")
  }

  return candidate as OfficialImagePackManifest
}

export async function clearOfficialImageBlobCache() {
  for (const blobUrl of officialImageCache.values()) {
    URL.revokeObjectURL(blobUrl)
  }

  officialImageCache.clear()
  officialImageCacheOrder.splice(0, officialImageCacheOrder.length)
  failedOfficialImages.clear()
}

export async function clearOfficialImagePackData() {
  if (!isIndexedDBAvailable()) {
    throw new Error("当前环境不支持 IndexedDB，无法清除本地卡图。")
  }

  await db.officialImages.clear()
  await clearOfficialImageBlobCache()
}

export async function getOfficialImageUrl(cardId: string): Promise<string | null> {
  if (!isIndexedDBAvailable()) {
    return null
  }

  const cachedUrl = touchOfficialImageCache(cardId)
  if (cachedUrl) {
    return cachedUrl
  }

  if (failedOfficialImages.has(cardId)) {
    return null
  }

  try {
    const record = await db.officialImages.get(cardId)
    if (!record) {
      failedOfficialImages.add(cardId)
      return null
    }

    const blobUrl = URL.createObjectURL(record.blob)
    updateOfficialImageCache(cardId, blobUrl)
    failedOfficialImages.delete(cardId)
    return blobUrl
  } catch (error) {
    console.error(`[OfficialImagePack] Failed to load image for ${cardId}:`, error)
    failedOfficialImages.add(cardId)
    return null
  }
}

export async function importOfficialImagePack(
  file: File,
  options: ImportOfficialImagePackOptions = {},
): Promise<OfficialImagePackImportResult> {
  if (!isIndexedDBAvailable()) {
    throw new Error("当前环境不支持 IndexedDB，无法导入卡图包。")
  }

  const reportProgress = createOfficialImagePackProgressReporter(options.onProgress)

  reportProgress("loading-zip", 0, 0)
  const zip = await JSZip.loadAsync(file)
  reportProgress("validating", 0, 0)
  const manifestPath = findOfficialImagePackManifestPath(zip)

  if (!manifestPath) {
    const zipKind = detectOfficialImagePackZipKind(zip)

    if (zipKind === "offline-app-package") {
      throw new Error(
        "你导入的是离线程序包，不是官方卡图包。请导入单独的卡图包 zip，而不是包含 index.html、_next、OPEN.bat 的应用发布包。",
      )
    }

    if (zipKind === "custom-card-package") {
      throw new Error(
        "你导入的更像是自定义卡包，不是官方卡图包。官方卡图包需要包含 manifest.json 和 images/ 目录。",
      )
    }

    throw new Error("压缩包中缺少 manifest.json。")
  }

  const manifestFile = zip.file(manifestPath)
  if (!manifestFile) {
    throw new Error("压缩包中的 manifest.json 无法读取。")
  }

  const manifestText = await manifestFile.async("text")
  const manifest = validateOfficialImagePackManifest(JSON.parse(manifestText))
  const warnings: string[] = []
  const imageRoot = resolveOfficialImagePackImageRoot(manifestPath, manifest)

  if (manifest.target !== OFFICIAL_IMAGE_PACK_TARGET) {
    warnings.push(
      `卡图包目标为 ${manifest.target}，当前内置卡包目标为 ${OFFICIAL_IMAGE_PACK_TARGET}。`,
    )
  }

  const expectedVersion = getExpectedBuiltinImagePackVersion()
  if (manifest.version !== expectedVersion) {
    warnings.push(
      `卡图包版本为 ${manifest.version}，当前内置卡包版本为 ${expectedVersion}。`,
    )
  }

  const imageFiles = Object.keys(zip.files).filter(
    (name) => normalizeZipPath(name).startsWith(imageRoot) && !zip.files[name].dir,
  )

  if (imageFiles.length === 0) {
    throw new Error("压缩包中没有找到 images/ 目录下的图片。")
  }

  const candidateImageFiles = imageFiles.filter((name) =>
    SUPPORTED_IMAGE_EXTENSIONS.test(name),
  )
  const validImages = new Map<string, Blob>()
  const unknownImageIds: string[] = []
  let extractedCount = 0

  for (const filePath of candidateImageFiles) {

    const cardId = normalizeImageCardId(
      normalizeZipPath(filePath).replace(imageRoot, "images/"),
    )
    if (!builtinCardIds.has(cardId)) {
      unknownImageIds.push(cardId)
      extractedCount++
      reportProgress(
        "extracting-images",
        extractedCount,
        candidateImageFiles.length,
        cardId,
      )
      continue
    }

    const zipFile = zip.file(filePath)
    if (!zipFile) {
      extractedCount++
      reportProgress(
        "extracting-images",
        extractedCount,
        candidateImageFiles.length,
        cardId,
      )
      continue
    }

    const blob = await zipFile.async("blob")
    validImages.set(cardId, blob)
    extractedCount++
    reportProgress(
      "extracting-images",
      extractedCount,
      candidateImageFiles.length,
      cardId,
    )
  }

  if (unknownImageIds.length > 0) {
    const preview = unknownImageIds.slice(0, 10).join("、")
    const suffix = unknownImageIds.length > 10 ? ` 等 ${unknownImageIds.length} 张` : ""
    warnings.push(`发现无法匹配内置卡牌的图片 ID：${preview}${suffix}`)
  }

  if (validImages.size === 0) {
    throw new Error("没有找到可匹配当前内置卡牌的图片。")
  }

  await db.transaction("rw", db.officialImages, async () => {
    await db.officialImages.clear()

    let writtenCount = 0
    for (const [cardId, blob] of validImages.entries()) {
      await db.officialImages.put({
        key: cardId,
        blob,
        mimeType: blob.type,
        size: blob.size,
        createdAt: Date.now(),
      })
      writtenCount++
      reportProgress("writing-images", writtenCount, validImages.size, cardId)
    }
  })

  reportProgress("finalizing", 1, 1)
  await clearOfficialImageBlobCache()

  const metadata: OfficialImagePackMetadata = {
    packId: manifest.packId,
    version: manifest.version,
    importTime: new Date().toISOString(),
    imageCount: validImages.size,
    target: manifest.target,
    manifest,
    available: true,
    warnings,
  }

  return {
    metadata,
    warnings,
  }
}

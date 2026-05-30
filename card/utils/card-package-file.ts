export const CARD_PACKAGE_ARCHIVE_EXTENSIONS = [".zip", ".dhcb"] as const

export const CARD_PACKAGE_IMPORT_ACCEPT = ".json,.dhcb,.zip"

export function isCardPackageArchiveFileName(fileName: string): boolean {
  const normalizedFileName = fileName.trim().toLowerCase()
  return CARD_PACKAGE_ARCHIVE_EXTENSIONS.some((extension) =>
    normalizedFileName.endsWith(extension),
  )
}

export function getCardPackageDownloadName(
  fileName: string,
  preferredExtension: (typeof CARD_PACKAGE_ARCHIVE_EXTENSIONS)[number] = ".zip",
): string {
  const trimmedFileName = fileName.trim()

  if (!trimmedFileName) {
    return `card-package${preferredExtension}`
  }

  if (isCardPackageArchiveFileName(trimmedFileName)) {
    return trimmedFileName
  }

  return `${trimmedFileName}${preferredExtension}`
}

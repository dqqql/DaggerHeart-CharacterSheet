import announcementIndex from "@/docs/announcements/index.json"

interface AnnouncementIndexEntry {
  id: string
  title: string
  file: string
  publishedAt: string
  priority: number
}

export function compareAnnouncementRecency(
  left: Pick<AnnouncementIndexEntry, "publishedAt" | "id">,
  right: Pick<AnnouncementIndexEntry, "publishedAt" | "id">,
): number {
  const publishedAtDiff = left.publishedAt.localeCompare(right.publishedAt)
  if (publishedAtDiff !== 0) {
    return publishedAtDiff
  }

  return left.id.localeCompare(right.id)
}

export function getLatestAnnouncementId(): string | null {
  const entries = announcementIndex as AnnouncementIndexEntry[]
  if (entries.length === 0) {
    return null
  }

  return entries.reduce((latest, current) =>
    compareAnnouncementRecency(current, latest) > 0 ? current : latest
  ).id
}

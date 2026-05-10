import announcementIndex from "@/docs/announcements/index.json"

interface AnnouncementIndexEntry {
  id: string
  title: string
  file: string
  publishedAt: string
  priority: number
}

export interface Announcement extends AnnouncementIndexEntry {
  content: string
}

type MarkdownModule = string | { default?: string }
type WebpackRequireContext = {
  (id: string): MarkdownModule
}

declare const require: {
  context: (
    path: string,
    useSubdirectories?: boolean,
    regExp?: RegExp,
  ) => WebpackRequireContext
}

const markdownContext = require.context("../docs/announcements", false, /\.md$/)

function getMarkdownContent(fileName: string): string {
  const markdownModule = markdownContext(`./${fileName}`)
  if (typeof markdownModule === "string") {
    return markdownModule
  }

  return markdownModule.default ?? ""
}

export function getAnnouncements(): Announcement[] {
  return [...(announcementIndex as AnnouncementIndexEntry[])]
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority
      }

      return right.publishedAt.localeCompare(left.publishedAt)
    })
    .map((entry) => ({
      ...entry,
      content: getMarkdownContent(entry.file),
    }))
}

const BREAK_AFTER_CHARACTERS = new Set([
  " ",
  "\t",
  "，",
  "。",
  "！",
  "？",
  "；",
  "：",
  ",",
  ".",
  "!",
  "?",
  ";",
  ":",
])

/**
 * Split text without inserting a line break in the middle of a phrase.
 * The preferred boundary is the closest punctuation/space before the target width.
 */
export function splitTextAtBoundary(text: string, maxChars: number): [string, string] {
  if (!text || text.length <= maxChars) return [text, ""]

  const lastPreferredIndex = Math.min(maxChars - 1, text.length - 1)
  const firstPreferredIndex = Math.max(0, lastPreferredIndex - 8)

  for (let index = lastPreferredIndex; index >= firstPreferredIndex; index -= 1) {
    if (BREAK_AFTER_CHARACTERS.has(text[index])) {
      return [text.slice(0, index + 1).trim(), text.slice(index + 1).trim()]
    }
  }

  // If there is no nearby punctuation, retain the old fixed-width fallback so
  // long text is still fully represented in the two print lines.
  return [text.slice(0, maxChars).trim(), text.slice(maxChars).trim()]
}

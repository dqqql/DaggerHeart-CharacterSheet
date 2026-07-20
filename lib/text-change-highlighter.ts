export interface TextChangeSegment {
  text: string
  changed: boolean
}

/**
 * Returns the updated text split into unchanged and inserted/replaced segments.
 * Deleted source text is intentionally omitted because the UI displays the new value.
 */
export function highlightTextChanges(source: string, updated: string): TextChangeSegment[] {
  if (!updated) return []
  if (!source || source === updated) return [{ text: updated, changed: source !== updated }]

  const rows = Array.from(
    { length: source.length + 1 },
    () => new Uint16Array(updated.length + 1),
  )

  for (let sourceIndex = source.length - 1; sourceIndex >= 0; sourceIndex -= 1) {
    for (let updatedIndex = updated.length - 1; updatedIndex >= 0; updatedIndex -= 1) {
      rows[sourceIndex][updatedIndex] = source[sourceIndex] === updated[updatedIndex]
        ? rows[sourceIndex + 1][updatedIndex + 1] + 1
        : Math.max(rows[sourceIndex + 1][updatedIndex], rows[sourceIndex][updatedIndex + 1])
    }
  }

  const characters: Array<{ text: string; changed: boolean }> = []
  let sourceIndex = 0
  let updatedIndex = 0

  while (updatedIndex < updated.length) {
    if (sourceIndex < source.length && source[sourceIndex] === updated[updatedIndex]) {
      characters.push({ text: updated[updatedIndex], changed: false })
      sourceIndex += 1
      updatedIndex += 1
    } else if (
      sourceIndex >= source.length
      || rows[sourceIndex][updatedIndex + 1] >= rows[sourceIndex + 1][updatedIndex]
    ) {
      characters.push({ text: updated[updatedIndex], changed: true })
      updatedIndex += 1
    } else {
      sourceIndex += 1
    }
  }

  return characters.reduce<TextChangeSegment[]>((segments, character) => {
    const previous = segments[segments.length - 1]
    if (previous?.changed === character.changed) {
      previous.text += character.text
    } else {
      segments.push({ ...character })
    }
    return segments
  }, [])
}

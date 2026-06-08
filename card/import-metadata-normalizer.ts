import type { ImportData, VariantTypeDefinition } from './card-types'

export interface NormalizedImportMetadata {
  customFieldDefinitions: {
    professions: string[]
    ancestries: string[]
    communities: string[]
    domains: string[]
    variants: string[]
  }
  variantTypes: Record<string, VariantTypeDefinition>
  warnings: string[]
}

type DefinitionAlias =
  | 'profession'
  | 'professions'
  | 'ancestry'
  | 'ancestries'
  | 'community'
  | 'communities'
  | 'domain'
  | 'domains'
  | 'variant'
  | 'variants'

type VariantAccumulator = {
  subclasses: Set<string>
  levels: number[]
}

function pushUnique(target: string[], value: unknown) {
  if (typeof value !== 'string') {
    return
  }

  const normalized = value.trim()
  if (!normalized || target.includes(normalized)) {
    return
  }

  target.push(normalized)
}

function readDefinitionValues(definitions: ImportData['customFieldDefinitions'], aliases: DefinitionAlias[]) {
  const values: string[] = []

  aliases.forEach((alias) => {
    const current = definitions?.[alias]
    if (!Array.isArray(current)) {
      return
    }

    current.forEach((value) => pushUnique(values, value))
  })

  return values
}

function collectVariantTypes(importData: ImportData) {
  const collected = new Map<string, VariantAccumulator>()

  ;(importData.variant ?? []).forEach((card) => {
    if (typeof card.类型 !== 'string' || card.类型.trim() === '') {
      return
    }

    const type = card.类型.trim()
    if (!collected.has(type)) {
      collected.set(type, {
        subclasses: new Set<string>(),
        levels: [],
      })
    }

    const bucket = collected.get(type)!
    if (typeof card.子类别 === 'string' && card.子类别.trim() !== '') {
      bucket.subclasses.add(card.子类别.trim())
    }
    if (typeof card.等级 === 'number' && Number.isFinite(card.等级)) {
      bucket.levels.push(card.等级)
    }
  })

  return collected
}

function toVariantTypeDefinition(accumulator: VariantAccumulator, existing?: VariantTypeDefinition): VariantTypeDefinition {
  const subclasses = [...(existing?.subclasses ?? []), ...accumulator.subclasses]
  const uniqueSubclasses = [...new Set(subclasses)]
  const derivedLevelRange =
    accumulator.levels.length > 0
      ? ([Math.min(...accumulator.levels), Math.max(...accumulator.levels)] as [number, number])
      : undefined

  const mergedLevelRange =
    existing?.levelRange && derivedLevelRange
      ? ([Math.min(existing.levelRange[0], derivedLevelRange[0]), Math.max(existing.levelRange[1], derivedLevelRange[1])] as [number, number])
      : existing?.levelRange ?? derivedLevelRange

  return {
    ...existing,
    subclasses: uniqueSubclasses,
    levelRange: mergedLevelRange,
  }
}

export function normalizeImportMetadata(importData: ImportData): NormalizedImportMetadata {
  const definitions = importData.customFieldDefinitions

  const professions = readDefinitionValues(definitions, ['professions', 'profession'])
  const ancestries = readDefinitionValues(definitions, ['ancestries', 'ancestry'])
  const communities = readDefinitionValues(definitions, ['communities', 'community'])
  const domains = readDefinitionValues(definitions, ['domains', 'domain'])
  const variants = readDefinitionValues(definitions, ['variants', 'variant'])

  ;(importData.profession ?? []).forEach((card) => {
    pushUnique(professions, card.名称)
    pushUnique(domains, card.领域1)
    pushUnique(domains, card.领域2)
  })

  ;(importData.subclass ?? []).forEach((card) => {
    pushUnique(professions, card.主职)
  })

  ;(importData.ancestry ?? []).forEach((card) => {
    pushUnique(ancestries, card.种族)
  })

  ;(importData.community ?? []).forEach((card) => {
    pushUnique(communities, card.名称)
  })

  ;(importData.domain ?? []).forEach((card) => {
    pushUnique(domains, card.领域)
  })

  const collectedVariantTypes = collectVariantTypes(importData)
  collectedVariantTypes.forEach((_, type) => pushUnique(variants, type))

  const variantTypes: Record<string, VariantTypeDefinition> = {}
  const existingVariantTypes = definitions?.variantTypes ?? {}

  Object.entries(existingVariantTypes).forEach(([type, definition]) => {
    variantTypes[type] = toVariantTypeDefinition(
      collectedVariantTypes.get(type) ?? { subclasses: new Set<string>(), levels: [] },
      definition
    )
    collectedVariantTypes.delete(type)
  })

  collectedVariantTypes.forEach((accumulator, type) => {
    variantTypes[type] = toVariantTypeDefinition(accumulator)
  })

  return {
    customFieldDefinitions: {
      professions,
      ancestries,
      communities,
      domains,
      variants,
    },
    variantTypes,
    warnings: [],
  }
}

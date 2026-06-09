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

type NormalizedDefinitionCategory =
  | 'professions'
  | 'ancestries'
  | 'communities'
  | 'domains'
  | 'variants'

export interface ImportMetadataNormalizationContext {
  existingCustomFieldDefinitions?: Partial<Record<NormalizedDefinitionCategory, string[]>>
  existingVariantTypes?: Record<string, VariantTypeDefinition>
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

function collectMissingValues(derived: string[], declared: string[]) {
  return derived.filter((value) => !declared.includes(value))
}

function collectUnknownValues(derived: string[], declared: string[], known: string[]) {
  return derived.filter((value) => !declared.includes(value) && !known.includes(value))
}

function joinValues(values: string[]) {
  return values.join('、')
}

function createAutoFilledDefinitionWarning(parts: string[]) {
  if (parts.length === 0) {
    return null
  }

  return `以下定义未在导入文件中预先声明，系统已根据卡牌内容自动补齐：${parts.join('；')}。`
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

export function normalizeImportMetadata(
  importData: ImportData,
  context: ImportMetadataNormalizationContext = {}
): NormalizedImportMetadata {
  const definitions = importData.customFieldDefinitions

  const declaredDefinitions: Record<NormalizedDefinitionCategory, string[]> = {
    professions: readDefinitionValues(definitions, ['professions', 'profession']),
    ancestries: readDefinitionValues(definitions, ['ancestries', 'ancestry']),
    communities: readDefinitionValues(definitions, ['communities', 'community']),
    domains: readDefinitionValues(definitions, ['domains', 'domain']),
    variants: readDefinitionValues(definitions, ['variants', 'variant']),
  }
  const knownDefinitions: Record<NormalizedDefinitionCategory, string[]> = {
    professions: context.existingCustomFieldDefinitions?.professions ?? [],
    ancestries: context.existingCustomFieldDefinitions?.ancestries ?? [],
    communities: context.existingCustomFieldDefinitions?.communities ?? [],
    domains: context.existingCustomFieldDefinitions?.domains ?? [],
    variants: context.existingCustomFieldDefinitions?.variants ?? [],
  }

  const professions = [...declaredDefinitions.professions]
  const ancestries = [...declaredDefinitions.ancestries]
  const communities = [...declaredDefinitions.communities]
  const domains = [...declaredDefinitions.domains]
  const variants = [...declaredDefinitions.variants]
  const professionNamesFromCards: string[] = []
  const subclassMainProfessions: string[] = []
  const ancestryNamesFromCards: string[] = []
  const communityNamesFromCards: string[] = []
  const domainNamesFromCards: string[] = []

  ;(importData.profession ?? []).forEach((card) => {
    pushUnique(professionNamesFromCards, card.名称)
    pushUnique(professions, card.名称)
    pushUnique(domainNamesFromCards, card.领域1)
    pushUnique(domainNamesFromCards, card.领域2)
    pushUnique(domains, card.领域1)
    pushUnique(domains, card.领域2)
  })

  ;(importData.subclass ?? []).forEach((card) => {
    pushUnique(subclassMainProfessions, card.主职)
    pushUnique(professions, card.主职)
  })

  ;(importData.ancestry ?? []).forEach((card) => {
    pushUnique(ancestryNamesFromCards, card.种族)
    pushUnique(ancestries, card.种族)
  })

  ;(importData.community ?? []).forEach((card) => {
    pushUnique(communityNamesFromCards, card.名称)
    pushUnique(communities, card.名称)
  })

  ;(importData.domain ?? []).forEach((card) => {
    pushUnique(domainNamesFromCards, card.领域)
    pushUnique(domains, card.领域)
  })

  const collectedVariantTypes = collectVariantTypes(importData)
  const declaredVariantTypes = definitions?.variantTypes ?? {}
  const knownVariantTypeNames = new Set([
    ...declaredDefinitions.variants,
    ...Object.keys(declaredVariantTypes),
    ...Object.keys(context.existingVariantTypes ?? {}),
    ...knownDefinitions.variants,
  ])
  const autoCreatedVariantTypes = [...collectedVariantTypes.keys()].filter(
    (type) => !knownVariantTypeNames.has(type)
  )
  collectedVariantTypes.forEach((_, type) => pushUnique(variants, type))

  const variantTypes: Record<string, VariantTypeDefinition> = {}

  Object.entries(declaredVariantTypes).forEach(([type, definition]) => {
    variantTypes[type] = toVariantTypeDefinition(
      collectedVariantTypes.get(type) ?? { subclasses: new Set<string>(), levels: [] },
      definition
    )
    collectedVariantTypes.delete(type)
  })

  collectedVariantTypes.forEach((accumulator, type) => {
    variantTypes[type] = toVariantTypeDefinition(accumulator)
  })

  const missingSubclassMainProfessions = collectUnknownValues(
    subclassMainProfessions,
    declaredDefinitions.professions,
    knownDefinitions.professions
  )
  const autoFilledProfessions = collectUnknownValues(
    professionNamesFromCards,
    declaredDefinitions.professions,
    knownDefinitions.professions
  ).filter((value) => !missingSubclassMainProfessions.includes(value))
  const autoFilledAncestries = collectUnknownValues(
    ancestryNamesFromCards,
    declaredDefinitions.ancestries,
    knownDefinitions.ancestries
  )
  const autoFilledCommunities = collectUnknownValues(
    communityNamesFromCards,
    declaredDefinitions.communities,
    knownDefinitions.communities
  )
  const autoFilledDomains = collectUnknownValues(
    domainNamesFromCards,
    declaredDefinitions.domains,
    knownDefinitions.domains
  )

  const warnings: string[] = []

  if (missingSubclassMainProfessions.length > 0) {
    warnings.push(
      `有子职业引用了未预先声明的主职：${joinValues(missingSubclassMainProfessions)}。系统已按卡牌内容继续导入，并补齐这些主职定义。`
    )
  }

  if (autoCreatedVariantTypes.length > 0) {
    warnings.push(
      `发现未预先定义的变体类型：${joinValues(autoCreatedVariantTypes)}。系统已根据对应卡牌内容自动建立这些类型。`
    )
  }

  const autoFilledDefinitionWarning = createAutoFilledDefinitionWarning(
    [
      autoFilledProfessions.length > 0 ? `职业：${joinValues(autoFilledProfessions)}` : null,
      autoFilledDomains.length > 0 ? `领域：${joinValues(autoFilledDomains)}` : null,
      autoFilledAncestries.length > 0 ? `种族：${joinValues(autoFilledAncestries)}` : null,
      autoFilledCommunities.length > 0 ? `社群：${joinValues(autoFilledCommunities)}` : null,
    ].filter((value): value is string => value !== null)
  )

  if (autoFilledDefinitionWarning) {
    warnings.push(autoFilledDefinitionWarning)
  }

  return {
    customFieldDefinitions: {
      professions,
      ancestries,
      communities,
      domains,
      variants,
    },
    variantTypes,
    warnings,
  }
}

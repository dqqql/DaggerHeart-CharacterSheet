import catalogJson from "./catalog.json"
import cardsJson from "./cards.json"
import manifestJson from "./manifest.json"

export const RHODES_ISLAND_RULESET = "rhodes-island" as const
export const RHODES_ISLAND_PLACEHOLDER_IMAGE = "/assets/rhodes-island/rhodes-terminal-card-placeholder.webp" as const

export type RhodesIslandWeapon = {
  name: string
  range: string
  burden: "单手" | "双手"
  damageType: "物理" | "法术"
  damage: string
}

export type RhodesIslandBranchStage = {
  tier: 1 | 2 | 3 | 4
  level: 1 | 2 | 5 | 8
  rank: "预备干员" | "正式干员" | "资深干员" | "精英干员"
  weapon: RhodesIslandWeapon
  branchFeature: string
  professionFeature: string
}

export type RhodesIslandModule = { id: string; name: "X模组" | "Y模组"; description: string }

export type RhodesIslandBranch = {
  id: string
  ruleset: typeof RHODES_ISLAND_RULESET
  professionId: string
  profession: string
  name: string
  recommendedDomains: string[]
  stages: RhodesIslandBranchStage[]
  modules: { x: RhodesIslandModule; y: RhodesIslandModule }
  imageUrl: string
}

export type RhodesIslandCatalog = {
  schemaVersion: number
  ruleset: typeof RHODES_ISLAND_RULESET
  placeholderImage: string
  professions: Array<Record<string, unknown> & { id: string; name: string; ruleset: typeof RHODES_ISLAND_RULESET }>
  branches: RhodesIslandBranch[]
  ancestries: Array<Record<string, unknown> & { id: string; name: string; imageUrl: string; recommendedExperiences: Array<{ name: string; value: 2 }> }>
  communities: Array<Record<string, unknown> & { id: string; name: string }>
  domains: Array<Record<string, unknown> & { id: string; name: string }>
  domainCards: Array<Record<string, unknown> & { id: string; name: string; domainId: string; domain: string; level: number; imageUrl: string }>
  unpublishedSourceEntries: Array<Record<string, unknown>>
}

export const rhodesIslandCatalog = catalogJson as unknown as RhodesIslandCatalog
export const rhodesIslandCards = cardsJson
export const rhodesIslandManifest = manifestJson

export const rhodesIslandProfessionById = new Map(rhodesIslandCatalog.professions.map((item) => [item.id, item]))
export const rhodesIslandBranchById = new Map(rhodesIslandCatalog.branches.map((item) => [item.id, item]))
export const rhodesIslandDomainById = new Map(rhodesIslandCatalog.domains.map((item) => [item.id, item]))

export function getRhodesIslandBranchesForProfession(professionId: string): RhodesIslandBranch[] {
  return rhodesIslandCatalog.branches.filter((branch) => branch.professionId === professionId)
}

export function getRhodesIslandBranchStage(branchId: string, level: number): RhodesIslandBranchStage | undefined {
  const branch = rhodesIslandBranchById.get(branchId)
  if (!branch) return undefined
  const tier = level >= 8 ? 4 : level >= 5 ? 3 : level >= 2 ? 2 : 1
  return branch.stages.find((stage) => stage.tier === tier)
}


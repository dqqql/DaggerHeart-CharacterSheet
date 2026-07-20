import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  RHODES_ISLAND_PLACEHOLDER_IMAGE,
  getRhodesIslandBranchesForProfession,
  getRhodesIslandBranchStage,
  rhodesIslandCards,
  rhodesIslandCatalog,
  rhodesIslandManifest,
} from "@/data/rhodes-island"

describe("Rhodes Island static rules data", () => {
  it("matches the normalized release inventory", () => {
    expect(rhodesIslandManifest.counts).toEqual({
      professions: 7,
      branches: 28,
      ancestries: 31,
      communities: 15,
      domains: 11,
      domainCards: 262,
    })
    expect(rhodesIslandCatalog.professions).toHaveLength(7)
    expect(rhodesIslandCatalog.branches).toHaveLength(28)
    expect(rhodesIslandCatalog.ancestries).toHaveLength(31)
    expect(rhodesIslandCatalog.communities).toHaveLength(15)
    expect(rhodesIslandCatalog.domains).toHaveLength(11)
    expect(rhodesIslandCatalog.domainCards).toHaveLength(262)
  })

  it("uses stable unique IDs and valid profession/branch/domain relations", () => {
    const entities = [
      ...rhodesIslandCatalog.professions,
      ...rhodesIslandCatalog.branches,
      ...rhodesIslandCatalog.ancestries,
      ...rhodesIslandCatalog.communities,
      ...rhodesIslandCatalog.domains,
      ...rhodesIslandCatalog.domainCards,
    ]
    expect(new Set(entities.map((item) => item.id)).size).toBe(entities.length)
    const professionIds = new Set(rhodesIslandCatalog.professions.map((item) => item.id))
    const domainIds = new Set(rhodesIslandCatalog.domains.map((item) => item.id))
    for (const branch of rhodesIslandCatalog.branches) expect(professionIds.has(branch.professionId)).toBe(true)
    for (const card of rhodesIslandCatalog.domainCards) expect(domainIds.has(card.domainId)).toBe(true)
    for (const profession of rhodesIslandCatalog.professions) expect(getRhodesIslandBranchesForProfession(profession.id)).toHaveLength(4)
  })

  it("contains four complete branch stages, bound weapons, and exclusive X/Y modules", () => {
    for (const branch of rhodesIslandCatalog.branches) {
      expect(branch.stages.map((stage) => stage.level)).toEqual([1, 2, 5, 8])
      expect(branch.stages.every((stage) => Boolean(stage.weapon.name && stage.weapon.damage && stage.weapon.range && stage.weapon.burden))).toBe(true)
      expect(branch.stages.slice(0, 3).every((stage) => stage.branchFeature.length > 0)).toBe(true)
      expect(branch.modules.x.id).not.toBe(branch.modules.y.id)
      expect(branch.modules.x.description.length).toBeGreaterThan(0)
      expect(branch.modules.y.description.length).toBeGreaterThan(0)
      expect(getRhodesIslandBranchStage(branch.id, 1)?.tier).toBe(1)
      expect(getRhodesIslandBranchStage(branch.id, 2)?.tier).toBe(2)
      expect(getRhodesIslandBranchStage(branch.id, 5)?.tier).toBe(3)
      expect(getRhodesIslandBranchStage(branch.id, 8)?.tier).toBe(4)
    }
  })

  it("has editable ancestry recommendations and only local image or placeholder paths", () => {
    const projectRoot = process.cwd()
    const imageUrls = [
      ...rhodesIslandCatalog.professions.map((item) => String(item.imageUrl)),
      ...rhodesIslandCatalog.branches.map((item) => item.imageUrl),
      ...rhodesIslandCatalog.ancestries.map((item) => item.imageUrl),
      ...rhodesIslandCatalog.communities.map((item) => String(item.imageUrl)),
      ...rhodesIslandCatalog.domainCards.map((item) => item.imageUrl),
    ]
    expect(rhodesIslandCatalog.ancestries.every((item) => item.recommendedExperiences.length > 0)).toBe(true)
    for (const url of imageUrls) {
      expect(url.startsWith("/")).toBe(true)
      expect(url).not.toContain("feishu")
      expect(existsSync(join(projectRoot, "public", ...url.split("/").filter(Boolean)))).toBe(true)
    }
    expect(existsSync(join(projectRoot, "public", ...RHODES_ISLAND_PLACEHOLDER_IMAGE.split("/").filter(Boolean)))).toBe(true)
  })

  it("marks every runtime card for this ruleset and contains no remote dependency", () => {
    expect(rhodesIslandCards).toHaveLength(343)
    expect(rhodesIslandCards.every((card) => card.ruleset === "rhodes-island")).toBe(true)
    const serialized = readFileSync(join(process.cwd(), "data", "rhodes-island", "cards.json"), "utf8")
    expect(serialized).not.toMatch(/https?:\/\//)
    expect(serialized).not.toContain("feishu")
  })

  it("keeps every community feature complete and synchronized with its runtime card", () => {
    const communityCards = rhodesIslandCards.filter((card) => card.type === "community")
    expect(communityCards).toHaveLength(rhodesIslandCatalog.communities.length)

    for (const community of rhodesIslandCatalog.communities) {
      const feature = community.feature as { name: string; description: string }
      const introduction = community.introduction as string
      const origins = community.referenceOrigins as string[]
      const card = communityCards.find((item) => item.id === community.id)
      expect(introduction, `${community.name} introduction`).not.toBe("")
      expect(feature.name, `${community.name} feature name`).not.toBe("")
      expect(feature.description, `${community.name} feature description`).not.toBe("")
      expect(origins.length, `${community.name} reference origins`).toBeGreaterThan(0)
      expect(card?.hint).toBe(introduction)
      expect(card?.description).toBe(feature.description)
      expect(card?.cardSelectDisplay.item1).toBe(feature.name)
    }

    const reborne = rhodesIslandCatalog.communities.find((community) => community.name === "失乡之民")
    const reborneFeature = reborne?.feature as { description: string } | undefined
    expect(reborneFeature?.description).toContain("你可以永久使用那张社群卡替换这张社群卡")
  })

  it("labels branch recommendations and ancestry recommendations explicitly", () => {
    const branchCards = rhodesIslandCards.filter((card) => card.type === "subclass")
    const ancestryCards = rhodesIslandCards.filter((card) => card.type === "ancestry")

    expect(branchCards.every((card) => card.cardSelectDisplay.item3?.startsWith("第二领域推荐："))).toBe(true)
    expect(branchCards.every((card) => !card.cardSelectDisplay.item3?.endsWith("施法"))).toBe(true)
    expect(ancestryCards.every((card) => card.hint?.startsWith("推荐种族特性："))).toBe(true)
  })
})

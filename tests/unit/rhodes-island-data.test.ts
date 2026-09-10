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
      branches: 56,
      ancestries: 35,
      communities: 15,
      domains: 11,
      domainCards: 236,
    })
    expect(rhodesIslandCatalog.professions).toHaveLength(7)
    expect(rhodesIslandCatalog.branches).toHaveLength(56)
    expect(rhodesIslandCatalog.ancestries).toHaveLength(35)
    expect(rhodesIslandCatalog.communities).toHaveLength(15)
    expect(rhodesIslandCatalog.domains).toHaveLength(11)
    expect(rhodesIslandCatalog.domainCards).toHaveLength(236)
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
    const expectedBranchCounts: Record<string, number> = {
      先锋: 8,
      近卫: 8,
      狙击: 8,
      术师: 8,
      特种: 8,
      重装: 8,
      辅助: 8,
    }
    for (const profession of rhodesIslandCatalog.professions) {
      expect(getRhodesIslandBranchesForProfession(profession.id)).toHaveLength(expectedBranchCounts[profession.name])
    }
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
    expect(rhodesIslandCards).toHaveLength(349)
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
    expect(reborneFeature?.description).toContain("你可以永久地用那张社群卡替换这张社群卡")
  })

  it("labels branch recommendations and ancestry recommendations explicitly", () => {
    const branchCards = rhodesIslandCards.filter((card) => card.type === "subclass")
    const ancestryCards = rhodesIslandCards.filter((card) => card.type === "ancestry")

    expect(branchCards.every((card) => card.cardSelectDisplay.item3?.startsWith("第二领域推荐："))).toBe(true)
    expect(branchCards.every((card) => !card.cardSelectDisplay.item3?.endsWith("施法"))).toBe(true)
    expect(ancestryCards.every((card) => card.hint?.startsWith("推荐种族特性："))).toBe(true)
  })

  it("keeps formerly merged ancestries independent with exact recommendations", () => {
    const expectedRecommendations = {
      菲林: ["敏锐感官", "利爪出击"],
      阿斯兰: ["王族威名", "敏锐感官"],
      埃拉菲亚: ["感知自然", "优雅浪漫"],
      麒麟: ["御雷之术", "感知自然"],
      鬼: ["怒火业果", "苦难摇篮"],
      阿纳萨: ["漂泊浪行", "苦难摇篮"],
      萨卡兹: ["苦难摇篮", "“邪恶”象征"],
    }

    for (const [name, recommendations] of Object.entries(expectedRecommendations)) {
      const ancestry = rhodesIslandCatalog.ancestries.find((item) => item.name === name)
      expect(ancestry, name).toBeDefined()
      expect(ancestry?.recommendedExperiences).toEqual(
        recommendations.map((recommendation) => ({ name: recommendation, value: 2 })),
      )
    }

    expect(rhodesIslandCatalog.ancestries.some((item) => item.name.includes("&"))).toBe(false)
  })

  it("models final-release supplemental cards with valid same-domain parents", () => {
    const supplementalCards = rhodesIslandCatalog.domainCards.filter(card => card.isSupplemental)
    const regularCards = rhodesIslandCatalog.domainCards.filter(card => !card.isSupplemental)

    expect(regularCards).toHaveLength(231)
    expect(supplementalCards).toHaveLength(5)
    expect(supplementalCards.map(card => card.name).sort()).toEqual([
      "召唤：巨兵",
      "召唤：炮台",
      "大地的慈悲·昭示",
      "归乡邀约·洗礼",
      "摇篮曲·终",
    ].sort())

    for (const supplemental of supplementalCards) {
      const parent = rhodesIslandCatalog.domainCards.find(card => card.id === supplemental.parentCardId)
      const runtime = rhodesIslandCards.find(card => card.id === supplemental.id)
      expect(parent, supplemental.name).toBeDefined()
      expect(parent?.domain).toBe(supplemental.domain)
      expect(parent?.level).toBe(supplemental.level)
      expect(supplemental.recallCost).toBe(0)
      expect(supplemental.category).toBe("说明卡牌")
      expect(runtime?.isSupplemental).toBe(true)
      expect(runtime?.parentCardId).toBe(parent?.id)
    }
  })

  it("exposes every final-release addition through the standard domain-card interface", () => {
    const addedNames = [
      "涤净流程",
      "前方施工",
      "\"已完成的告别\"",
      "归乡邀约·洗礼",
      "摇篮曲·终",
      "大地的慈悲·昭示",
      "召唤：炮台",
      "召唤：巨兵",
    ]

    for (const name of addedNames) {
      const card = rhodesIslandCards.find(item => item.name === name)
      expect(card, name).toBeDefined()
      expect(card?.type).toBe("domain")
      expect(card?.description).not.toBe("")
      expect(card?.imageUrl).toMatch(/^\/rhodes-island\/domains\/.+\.webp$/)
      expect(card?.cardSelectDisplay.item1).not.toBe("")
      expect(card?.cardSelectDisplay.item2).not.toBe("")
      expect(card?.cardSelectDisplay.item3).toMatch(/^RC\.\d+$/)
      expect(card?.cardSelectDisplay.item4).toMatch(/^LV\.\d+$/)
    }
  })

  it("keeps final proofread branch fields intact", () => {
    const heavyBlade = rhodesIslandCatalog.branches.find(branch => branch.name === "重剑手")
    const curseHealer = rhodesIslandCatalog.branches.find(branch => branch.name === "咒愈师")

    expect(heavyBlade?.stages[0].weapon.damage).toBe("d20-3")
    expect(curseHealer?.stages[1].branchFeature).toContain("治疗伤害：不会迫使友方角色标记生命点")
    expect(curseHealer?.stages[2].branchFeature).toContain("治疗伤害：不会迫使友方角色标记生命点")
  })

  it("contains the September branch additions and August text preview updates", () => {
    const addedBranches = [
      ["先锋", "排陷手"],
      ["先锋", "破术者"],
      ["近卫", "收割者"],
      ["重装", "卫盟者"],
      ["狙击", "回环射手"],
      ["术师", "塑灵术师"],
      ["辅助", "游击手"],
      ["特种", "行商"],
    ] as const

    for (const [profession, name] of addedBranches) {
      const branch = rhodesIslandCatalog.branches.find((item) => item.profession === profession && item.name === name)
      expect(branch, `${profession}/${name}`).toBeDefined()
      expect(branch?.stages[2].professionFeature).not.toBe("")
      expect(branch?.modules.x.description).toContain("希望特性提升")
      expect(branch?.modules.y.description).toContain("追加第二职业特性")
    }

    expect(rhodesIslandCatalog.professions.find((item) => item.name === "近卫")?.classFeature)
      .toContain("狭路相逢：每次休息一次")
    expect(rhodesIslandCatalog.branches.find((item) => item.name === "速射手")?.stages[2].branchFeature)
      .toContain("花费 1 希望点或标记 1 压力点")
    expect(rhodesIslandCatalog.branches.find((item) => item.name === "召唤师")?.stages[2].branchFeature)
      .toContain("至多同时有5张领域卡")
  })
})

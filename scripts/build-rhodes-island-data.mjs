import { createHash } from "node:crypto"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import sharp from "sharp"

const projectRoot = resolve(import.meta.dirname, "..")
const sourceRoot = process.env.RHODES_SOURCE_ROOT || "D:\\Dql\\Desktop\\tttri"
const outputRoot = join(projectRoot, "data", "rhodes-island")
const imageOutputRoot = join(projectRoot, "public", "rhodes-island", "ancestries")
const bundledAncestryImageRoot = join(projectRoot, "assets", "rhodes-island", "ancestries")
const placeholderImage = "/assets/rhodes-island/rhodes-terminal-card-placeholder.webp"
const sourceFiles = {
  professions: join(sourceRoot, "已写子职一览"),
  ancestries: join(sourceRoot, "明日方舟种族", "明日方舟种族.md"),
  ancestryImages: join(sourceRoot, "明日方舟种族", "图片和附件"),
  communities: join(sourceRoot, "明日方舟社群（众生行记）.md"),
  domains: [join(sourceRoot, "主领域"), join(sourceRoot, "次领域")],
}

const professionFiles = ["先锋", "近卫", "狙击", "术师", "特种", "重装", "辅助"]
const domainNames = ["奥术", "攻坚", "坚阵", "精准", "秘行", "迅攻", "支柱", "工业", "奇迹", "心界", "远见"]
const mainDomains = new Set(["奥术", "攻坚", "坚阵", "精准", "秘行", "迅攻", "支柱"])
const communityFeatureAppendices = new Map([
  ["失乡之民", "在任何时候，当你发现自己曾经所属的社群，或者加入了一个新的社群时，你可以永久使用那张社群卡替换这张社群卡。"],
])
const mergedAncestrySplits = new Map([
  ["菲林&阿斯兰", [
    { name: "菲林", sourceHeading: "菲林 Feline", experiences: ["敏锐感官", "利爪出击"] },
    { name: "阿斯兰", sourceHeading: "阿斯兰 Aslan", experiences: ["王族威名", "敏锐感官"], bundledImage: "阿斯兰.png" },
  ]],
  ["埃拉菲亚", [
    { name: "埃拉菲亚", sourceHeading: "埃拉菲亚 Elafia", experiences: ["感知自然", "优雅浪漫"] },
    { name: "麒麟", sourceHeading: "麒麟 Kylin", experiences: ["御雷之术", "感知自然"], bundledImage: "麒麟.png" },
  ]],
  ["萨卡兹", [
    { name: "萨卡兹", sourceHeading: "萨卡兹 Sarkaz", experiences: ["苦难摇篮", "“邪恶”象征"] },
    { name: "鬼", sourceHeading: "鬼 Oni", experiences: ["怒火业果", "苦难摇篮"], bundledImage: "鬼.png" },
    { name: "阿纳萨", sourceHeading: "阿纳萨 Anasa", experiences: ["漂泊浪行", "苦难摇篮"], bundledImage: "阿纳萨.png" },
  ]],
])

function stableId(kind, value) {
  const digest = createHash("sha256").update(`${kind}:${value}`, "utf8").digest("hex").slice(0, 12)
  return `ri-${kind}-${digest}`
}

function cleanMarkdown(value = "") {
  return value
    // Grid containers can hold prose as well as images. The generic tag and image
    // cleanup below removes their markup without silently dropping their text.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/https?:\/\/[^\s)>]+/g, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\\([+&])/g, "$1")
    .replace(/\*+/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function cleanHtml(value = "") {
  return cleanMarkdown(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<hr\s*\/?>/gi, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
  )
}

function addThreeToDamage(damage) {
  const match = String(damage).match(/^(d\d+)(?:\+(\d+))?$/i)
  if (!match) return damage
  return `${match[1]}+${Number(match[2] || 0) + 3}`
}

function parseWeapon(stageText, previousWeapon) {
  const prototype = stageText.match(/武器原型：\s*([^\n<]+?)\s+(近距离|中距离|远距离|极远距离|极远)\s*\/\s*(单手|双手)\s*\/\s*(物理|法术)/)
  const damage = stageText.match(/武器伤害(?:骰|骰调整值|调整值)：?\s*([dD]\d+(?:\+\d+)?|\+\d+)/)
  if (!prototype && !previousWeapon) return null
  const weapon = prototype
    ? { name: prototype[1].trim(), range: prototype[2], burden: prototype[3], damageType: prototype[4], damage: damage?.[1] || "" }
    : { ...previousWeapon }
  if (damage?.[1]?.startsWith("+")) weapon.damage = addThreeToDamage(previousWeapon?.damage || "")
  else if (damage?.[1]) weapon.damage = damage[1].toLowerCase()
  return weapon
}

function contentAfterHeading(html, headingPattern, stopPatterns = []) {
  const start = html.search(headingPattern)
  if (start < 0) return ""
  const afterHeading = html.slice(start).replace(headingPattern, "")
  let end = afterHeading.length
  for (const stop of stopPatterns) {
    const index = afterHeading.search(stop)
    if (index >= 0) end = Math.min(end, index)
  }
  return cleanHtml(afterHeading.slice(0, end))
}

async function parseProfessions() {
  const professions = []
  const branches = []
  for (const professionName of professionFiles) {
    const markdown = await readFile(join(sourceFiles.professions, `${professionName}.md`), "utf8")
    const header = markdown.slice(0, markdown.search(/^# 〖/m))
    const stats = header.match(/初始生命点】\s*<br\/>\s*(\d+)[\s\S]*?初始闪避值】\s*<br\/>\s*(\d+)[\s\S]*?初始主选领域】\s*<br\/>\s*([^|\r\n]+)/)
    const hopeFeature = header.match(/【希望特性】\*\*\s*\n+([\s\S]*?)\n+###/)
    const classFeature = header.match(/【职业特性】\*\*\s*\n+([\s\S]*?)(?:\n+---|$)/)
    const professionId = stableId("profession", professionName)
    professions.push({
      id: professionId,
      ruleset: "rhodes-island",
      name: professionName,
      hitPoints: Number(stats?.[1]),
      evasion: Number(stats?.[2]),
      primaryDomain: stats?.[3]?.trim() || "",
      domains: [stats?.[3]?.trim() || ""],
      startingItems: [],
      hopeFeature: cleanMarkdown(hopeFeature?.[1]),
      classFeature: cleanMarkdown(classFeature?.[1]),
      imageUrl: placeholderImage,
    })

    const branchPattern = /^# 〖([^〗]+)〗\s*$([\s\S]*?)(?=^# 〖|(?![\s\S]))/gm
    for (const match of markdown.matchAll(branchPattern)) {
      const branchName = match[1].trim()
      const section = match[2]
      const domains = [...section.matchAll(/【([^】]+)】/g)].slice(0, 2).map((item) => item[1])
      const table = section.match(/<table>[\s\S]*?<\/table>/)?.[0] || ""
      const rankMatches = [...table.matchAll(/<h2>(预备干员|正式干员|资深干员|精英干员)<\/h2>([\s\S]*?)(?=<h2>|<\/td>|<hr\/?>)/g)]
      const rankText = new Map(rankMatches.map((item) => [item[1], item[2]]))
      const stageNames = ["预备干员", "正式干员", "资深干员", "精英干员"]
      let previousWeapon = null
      const stages = stageNames.map((rank, index) => {
        const raw = rankText.get(rank) || (rank === "精英干员" ? table.slice(table.indexOf("<h2>精英干员</h2>")) : "")
        const weapon = parseWeapon(cleanHtml(raw), previousWeapon)
        previousWeapon = weapon || previousWeapon
        const branchFeature = contentAfterHeading(raw, /<h3><b>【?子职特性[^<】]*】?<\/b><\/h3>/i, [/<h3>/i, /<hr/i])
          || contentAfterHeading(raw, /<h3><b>子职特性[^<]*<\/b><\/h3>/i, [/<h3>/i, /<hr/i])
        const professionFeature = contentAfterHeading(raw, /<h3><b>职业特性提升\s*<\/b><\/h3>/i, [/<h3>/i, /<hr/i])
        return { tier: index + 1, level: [1, 2, 5, 8][index], rank, weapon, branchFeature, professionFeature }
      })
      const eliteRaw = table.slice(table.indexOf("<h2>精英干员</h2>"))
      const xRaw = eliteRaw.match(/【X模组】[\s\S]*?(?=<hr\/?>)/)?.[0] || ""
      const yRaw = eliteRaw.match(/【Y模组】[\s\S]*?(?=<\/td>|<\/table>)/)?.[0] || ""
      const modules = {
        x: { id: stableId("module", `${professionName}/${branchName}/x`), name: "X模组", description: cleanHtml(xRaw.replace(/^.*?【X模组】/, "")) },
        y: { id: stableId("module", `${professionName}/${branchName}/y`), name: "Y模组", description: cleanHtml(yRaw.replace(/^.*?【Y模组】/, "")) },
      }
      branches.push({
        id: stableId("branch", `${professionName}/${branchName}`),
        ruleset: "rhodes-island",
        professionId,
        profession: professionName,
        name: branchName,
        recommendedDomains: domains,
        stages,
        modules,
        imageUrl: placeholderImage,
      })
    }
  }
  return { professions, branches }
}

function ancestrySections(markdown) {
  return [...markdown.matchAll(/^# (?!明日方舟种族\s*$)(.+?)\s*$\n([\s\S]*?)(?=^# |(?![\s\S]))/gm)]
}

async function makeAncestryEntry(heading, body, index, nameOverride, imageOverride, bodyOverride) {
  const plainHeading = cleanMarkdown(heading).replace(/\\&/g, "&")
  const chineseName = nameOverride || plainHeading.match(/^[\u3400-\u9fff]+/)?.[0] || plainHeading
  const imageMatches = [...body.matchAll(/图片和附件\/image%20(\d+)\.png/g)]
  const sourceImageNumber = imageOverride || imageMatches[0]?.[1]
  const fileName = `${String(index + 1).padStart(2, "0")}-${stableId("ancestry", chineseName).slice(-12)}.webp`
  const imageUrl = sourceImageNumber ? `/rhodes-island/ancestries/${fileName}` : placeholderImage
  if (sourceImageNumber) {
    const sourceImage = join(sourceFiles.ancestryImages, `image ${sourceImageNumber}.png`)
    await sharp(sourceImage).resize({ width: 960, height: 1280, fit: "inside", withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(join(imageOutputRoot, fileName))
  }
  const experiencesText = cleanMarkdown((bodyOverride || body).match(/推荐经历\s*：([^\n]+)/)?.[1] || "")
  const recommendedExperiences = [...experiencesText.matchAll(/([^，、]+?)\\?\+2(?:（[^）]+）)?(?=，|、|$)/g)].map((item) => ({ name: cleanMarkdown(item[1]).trim(), value: 2 }))
  const description = cleanMarkdown((bodyOverride || body).replace(/\*\*推荐经历\s*：[\s\S]*$/, ""))
  return {
    id: stableId("ancestry", chineseName), ruleset: "rhodes-island", name: chineseName,
    sourceHeading: plainHeading, description, recommendedExperiences, imageUrl,
  }
}

async function parseAncestries() {
  const markdown = await readFile(sourceFiles.ancestries, "utf8")
  const entries = []
  const sections = ancestrySections(markdown)
  for (const [sourceIndex, [, heading, body]] of sections.entries()) {
    const mergedEntry = await makeAncestryEntry(heading, body, sourceIndex)
    const splitDefinitions = mergedAncestrySplits.get(mergedEntry.name)
      || (mergedEntry.sourceHeading.includes("菲林") && mergedEntry.sourceHeading.includes("阿斯兰")
        ? mergedAncestrySplits.get("菲林&阿斯兰")
        : undefined)
    if (!splitDefinitions) {
      entries.push(mergedEntry)
      continue
    }

    const descriptions = mergedEntry.description.split(/\n+---\n+/)
    for (const [splitIndex, definition] of splitDefinitions.entries()) {
      const id = stableId("ancestry", definition.name)
      let imageUrl = mergedEntry.imageUrl
      if (definition.bundledImage) {
        const fileName = `${id.slice(-12)}.webp`
        await sharp(join(bundledAncestryImageRoot, definition.bundledImage))
          .resize({ width: 960, height: 1280, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82, effort: 5 })
          .toFile(join(imageOutputRoot, fileName))
        imageUrl = `/rhodes-island/ancestries/${fileName}`
      }
      entries.push({
        ...mergedEntry,
        id,
        name: definition.name,
        sourceHeading: definition.sourceHeading,
        description: descriptions[splitIndex]?.trim() || mergedEntry.description,
        recommendedExperiences: definition.experiences.map((name) => ({ name, value: 2 })),
        imageUrl,
      })
    }
  }
  return entries
}

async function parseCommunities() {
  const markdown = await readFile(sourceFiles.communities, "utf8")
  return [...markdown.matchAll(/^# (?!明日方舟社群)(.+?)\s*$\n([\s\S]*?)(?=^# |(?![\s\S]))/gm)].map((match) => {
    const name = cleanMarkdown(match[1])
    const body = cleanMarkdown(match[2])
    const featureMatch = body.match(/^([^\n]+?)[：:]\s*([\s\S]*?)(?=\n参考出身|$)/m)
    const intro = body.split("\n")[0] || ""
    const origins = body.split("参考出身")[1]?.split("\n").map((line) => line.replace(/^·/, "").trim()).filter(Boolean) || []
    const feature = featureMatch ? { name: featureMatch[1].trim(), description: featureMatch[2].trim() } : { name: "", description: body }
    const appendix = communityFeatureAppendices.get(name)
    if (appendix && !feature.description.includes(appendix)) feature.description = `${feature.description}\n\n${appendix}`
    return {
      id: stableId("community", name), ruleset: "rhodes-island", name, introduction: intro,
      feature,
      referenceOrigins: origins, imageUrl: placeholderImage,
    }
  })
}

function validateCommunityContent(communities) {
  for (const community of communities) {
    if (!community.introduction || !community.feature.name || !community.feature.description) {
      throw new Error(`community ${community.name}: introduction and feature fields must not be empty`)
    }
    if (community.referenceOrigins.length === 0) throw new Error(`community ${community.name}: reference origins must not be empty`)
    const appendix = communityFeatureAppendices.get(community.name)
    if (appendix && !community.feature.description.includes(appendix)) {
      throw new Error(`community ${community.name}: required feature appendix is missing`)
    }
  }
}

async function parseDomains() {
  const cards = []
  const domains = []
  const unpublishedSourceEntries = []
  for (const domainName of domainNames) {
    const directory = mainDomains.has(domainName) ? sourceFiles.domains[0] : sourceFiles.domains[1]
    const markdown = await readFile(join(directory, `【${domainName}】领域[1级-10级].md`), "utf8")
    const markerPattern = /^等级(\d+)\s+回想(?:费用|等级)(\d+)\s*$\n+([^\n]+)\s*\n+【([^】]+)】\s*$\n?/gm
    const markers = [...markdown.matchAll(markerPattern)]
    domains.push({ id: stableId("domain", domainName), ruleset: "rhodes-island", name: domainName, category: mainDomains.has(domainName) ? "primary" : "secondary" })
    const occurrenceCounts = new Map()
    markers.forEach((marker, index) => {
      const descriptionStart = marker.index + marker[0].length
      const descriptionEnd = markers[index + 1]?.index ?? markdown.length
      const occurrenceKey = `${marker[1]}/${marker[4]}`
      const occurrence = (occurrenceCounts.get(occurrenceKey) || 0) + 1
      occurrenceCounts.set(occurrenceKey, occurrence)
      const card = {
        id: stableId("domain-card", `${domainName}/${occurrenceKey}/${occurrence}`), ruleset: "rhodes-island",
        name: marker[4].trim(), domainId: stableId("domain", domainName), domain: domainName,
        level: Number(marker[1]), recallCost: Number(marker[2]), category: marker[3].trim(),
        description: cleanMarkdown(markdown.slice(descriptionStart, descriptionEnd)), imageUrl: placeholderImage,
      }
      // The source contains three Industrial entries labelled “回想等级” rather than
      // “回想费用”. The supplied release inventory is explicitly 262 cards, so the
      // first is normalized and the remaining two are retained as unpublished source
      // entries instead of silently disappearing or entering the runtime card pool.
      if (domainName === "工业" && /^等级1\s+回想等级1/m.test(marker[0]) && cards.some((item) => item.domain === "工业" && item.level === 1)) {
        unpublishedSourceEntries.push({ ...card, sourceStatus: "unpublished-malformed-header" })
      } else {
        cards.push(card)
      }
    })
  }
  return { domains, cards, unpublishedSourceEntries }
}

function makeStandardCards(catalog) {
  const shared = { standarized: true, source: "builtin", ruleset: "rhodes-island" }
  return [
    ...catalog.professions.map((item) => ({ ...shared, id: item.id, name: item.name, type: "profession", class: item.name, description: item.classFeature, hint: item.hopeFeature, imageUrl: item.imageUrl, headerDisplay: item.name, cardSelectDisplay: { item1: item.primaryDomain }, professionSpecial: { 起始生命: item.hitPoints, 起始闪避: item.evasion, 起始物品: "", 希望特性: item.hopeFeature }, rhodesIsland: item })),
    ...catalog.branches.map((item) => ({ ...shared, id: item.id, name: item.name, type: "subclass", class: item.profession, level: 1, description: item.stages[0].branchFeature, imageUrl: item.imageUrl, headerDisplay: item.name, cardSelectDisplay: { item1: item.profession, item2: "预备干员", item3: `第二领域推荐：${item.recommendedDomains.join("/")}` }, rhodesIsland: item })),
    ...catalog.ancestries.map((item) => ({ ...shared, id: item.id, name: item.name, type: "ancestry", class: item.name, level: 1, description: item.description, hint: `推荐种族特性：${item.recommendedExperiences.map((experience) => `${experience.name}+${experience.value}`).join("，")}`, imageUrl: item.imageUrl, headerDisplay: item.name, cardSelectDisplay: { item1: item.name }, rhodesIsland: item })),
    ...catalog.communities.map((item) => ({ ...shared, id: item.id, name: item.name, type: "community", class: item.name, description: item.feature.description, hint: item.introduction, imageUrl: item.imageUrl, headerDisplay: item.name, cardSelectDisplay: { item1: item.feature.name }, rhodesIsland: item })),
    ...catalog.domainCards.map((item) => ({ ...shared, id: item.id, name: item.name, type: "domain", class: item.domain, level: item.level, description: item.description, imageUrl: item.imageUrl, cardSelectDisplay: { item1: item.domain, item2: item.category, item3: `RC.${item.recallCost}`, item4: `LV.${item.level}` }, rhodesIsland: item })),
  ]
}

async function main() {
  await mkdir(outputRoot, { recursive: true })
  await rm(imageOutputRoot, { recursive: true, force: true })
  await mkdir(imageOutputRoot, { recursive: true })
  const [{ professions, branches }, ancestries, communities, { domains, cards: domainCards, unpublishedSourceEntries }] = await Promise.all([
    parseProfessions(), parseAncestries(), parseCommunities(), parseDomains(),
  ])
  const catalog = { schemaVersion: 1, ruleset: "rhodes-island", source: "共赴明日：罗德岛旅记", placeholderImage, professions, branches, ancestries, communities, domains, domainCards, unpublishedSourceEntries }
  validateCommunityContent(communities)
  const counts = { professions: professions.length, branches: branches.length, ancestries: ancestries.length, communities: communities.length, domains: domains.length, domainCards: domainCards.length }
  const expected = { professions: 7, branches: 28, ancestries: 35, communities: 15, domains: 11, domainCards: 262 }
  for (const [key, value] of Object.entries(expected)) if (counts[key] !== value) throw new Error(`${key}: expected ${value}, got ${counts[key]}`)
  await writeFile(join(outputRoot, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8")
  await writeFile(join(outputRoot, "cards.json"), `${JSON.stringify(makeStandardCards(catalog), null, 2)}\n`, "utf8")
  await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify({ schemaVersion: 1, ruleset: "rhodes-island", generatedFrom: "tttri", counts, normalizationNotes: ["工业领域源文件有三张卡将‘回想费用1’误写为‘回想等级1’；按发布清单262张保留首张，另两张保存在 catalog.unpublishedSourceEntries 中。", "失乡之民的社群能力补全了旧导入结果遗漏的永久替换社群卡规则。", "将来源中合并描述的菲林/阿斯兰、埃拉菲亚/麒麟、萨卡兹/鬼/阿纳萨拆分为独立种族，并分别配置推荐经历。"], files: { catalog: "./catalog.json", cards: "./cards.json" }, placeholderImage }, null, 2)}\n`, "utf8")
  console.log(`Rhodes Island data generated: ${JSON.stringify(counts)}`)
}

await main()

import { createHash } from "node:crypto"
import { access, readFile, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import sharp from "sharp"

const projectRoot = resolve(import.meta.dirname, "..")
const sourceRoot = resolve(
  process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length)
    || process.env.RHODES_FINAL_SOURCE_ROOT
    || "D:\\Dql\\Desktop\\《共赴明日：罗德岛旅记》TTTRI全资源",
)
const dataRoot = join(projectRoot, "data", "rhodes-island")
const sourceImageRoot = join(sourceRoot, "图片和附件")
const markdownPath = join(sourceRoot, "《共赴明日：罗德岛旅记》TTTRI全资源.md")
const expectedDomainCounts = {
  攻坚: 21,
  坚阵: 21,
  秘行: 21,
  迅攻: 21,
  精准: 22,
  奥术: 22,
  支柱: 22,
  远见: 21,
  奇迹: 21,
  心界: 21,
  工业: 23,
}

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

function parseMarkdownImages(markdown) {
  const allImages = []
  const domainImages = new Map()
  let domain = null
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+\**([^*]+?)领域\**\s*$/)
    if (heading && Object.hasOwn(expectedDomainCounts, heading[1].trim())) {
      domain = heading[1].trim()
      domainImages.set(domain, [])
      continue
    }
    if (/^#\s+/.test(line)) domain = null
    const image = line.match(/^!\[[^\]]*]\((?:图片和附件\/)?([^)]+)\)$/)
    if (!image) continue
    const sourceFile = decodeURIComponent(image[1]).replace(/\\/g, "")
    allImages.push(sourceFile)
    if (domain) domainImages.get(domain).push(sourceFile)
  }
  return { allImages, domainImages }
}

async function listFilesRecursive(root) {
  const entries = await readdir(root, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) files.push(...await listFilesRecursive(path))
    else files.push(path)
  }
  return files
}

async function main() {
  const [markdown, catalogRaw, cardsRaw, manifestRaw, sourceMapRaw] = await Promise.all([
    readFile(markdownPath, "utf8"),
    readFile(join(dataRoot, "catalog.json"), "utf8"),
    readFile(join(dataRoot, "cards.json"), "utf8"),
    readFile(join(dataRoot, "manifest.json"), "utf8"),
    readFile(join(dataRoot, "domain-source-map.json"), "utf8"),
  ])
  const catalog = JSON.parse(catalogRaw)
  const cards = JSON.parse(cardsRaw)
  const manifest = JSON.parse(manifestRaw)
  const sourceMap = JSON.parse(sourceMapRaw)
  const { allImages, domainImages } = parseMarkdownImages(markdown)

  invariant(allImages.length === 297, `markdown: expected 297 images, got ${allImages.length}`)
  invariant(new Set(allImages).size === 297, "markdown: duplicate image reference")
  const diskPngs = (await readdir(sourceImageRoot)).filter((name) => name.toLowerCase().endsWith(".png"))
  invariant(diskPngs.length === 297, `source: expected 297 PNG files, got ${diskPngs.length}`)
  invariant(new Set(diskPngs).size === 297, "source: duplicate PNG filename")
  invariant(diskPngs.every((name) => allImages.includes(name)), "source: unreferenced PNG file")

  const sourceHashes = new Set()
  for (const sourceFile of allImages) {
    const sourcePath = join(sourceImageRoot, sourceFile)
    await access(sourcePath)
    const buffer = await readFile(sourcePath)
    sourceHashes.add(createHash("sha256").update(buffer).digest("hex"))
  }
  invariant(sourceHashes.size === 297, "source: duplicate image content")

  for (const [domain, expectedCount] of Object.entries(expectedDomainCounts)) {
    const sourceCount = domainImages.get(domain)?.length || 0
    const catalogCount = catalog.domainCards.filter((card) => card.domain === domain).length
    invariant(sourceCount === expectedCount, `${domain}: expected ${expectedCount} source images, got ${sourceCount}`)
    invariant(catalogCount === expectedCount, `${domain}: expected ${expectedCount} catalog entries, got ${catalogCount}`)
  }

  invariant(catalog.professions.length === 7, "catalog: expected 7 professions")
  invariant(catalog.branches.length === 48, "catalog: expected 48 branches")
  invariant(catalog.ancestries.length === 35, "catalog: expected 35 ancestries")
  invariant(catalog.communities.length === 15, "catalog: expected 15 communities")
  invariant(catalog.domains.length === 11, "catalog: expected 11 domains")
  invariant(catalog.domainCards.length === 236, "catalog: expected 236 domain entries")
  invariant(catalog.domainCards.filter((card) => !card.isSupplemental).length === 231, "catalog: expected 231 regular domain cards")
  invariant(catalog.domainCards.filter((card) => card.isSupplemental).length === 5, "catalog: expected 5 supplemental cards")
  invariant(sourceMap.mappings.length === 236, "source map: expected 236 mappings")
  invariant(sourceMap.unmatchedSources.length === 0, "source map: contains unmatched sources")

  const allEntities = [
    ...catalog.professions,
    ...catalog.branches,
    ...catalog.ancestries,
    ...catalog.communities,
    ...catalog.domains,
    ...catalog.domainCards,
  ]
  invariant(new Set(allEntities.map((item) => item.id)).size === allEntities.length, "catalog: duplicate entity id")
  const domainById = new Map(catalog.domains.map((domain) => [domain.id, domain]))
  const domainCardById = new Map(catalog.domainCards.map((card) => [card.id, card]))
  const sourceMappingById = new Map(sourceMap.mappings.map((mapping) => [mapping.id, mapping]))
  invariant(domainCardById.size === 236, "catalog: duplicate domain card id")
  invariant(sourceMappingById.size === 236, "source map: duplicate mapped card id")
  for (const [domain, sourceFiles] of domainImages) {
    const mappedFiles = sourceMap.mappings
      .filter((mapping) => mapping.domain === domain)
      .sort((left, right) => left.sourceOrder - right.sourceOrder)
      .map((mapping) => mapping.sourceFile)
    invariant(JSON.stringify(mappedFiles) === JSON.stringify(sourceFiles), `${domain}: source map order differs from Markdown`)
    const displayOrders = sourceMap.mappings
      .filter((mapping) => mapping.domain === domain)
      .map((mapping) => mapping.displayOrder)
    invariant(
      JSON.stringify(displayOrders) === JSON.stringify(displayOrders.map((_, index) => index)),
      `${domain}: display order is not contiguous`,
    )
  }
  invariant(
    JSON.stringify(catalog.domainCards.map((card) => card.id))
      === JSON.stringify(sourceMap.mappings.map((mapping) => mapping.id)),
    "catalog: domain card order differs from final Markdown",
  )

  for (const card of catalog.domainCards) {
    invariant(domainById.get(card.domainId)?.name === card.domain, `${card.name}: invalid domain relation`)
    invariant(card.name && card.description && card.category, `${card.domain}/${card.name}: missing required text`)
    invariant(Number.isInteger(card.level) && card.level >= 1 && card.level <= 10, `${card.domain}/${card.name}: invalid level`)
    invariant(Number.isInteger(card.recallCost) && card.recallCost >= 0, `${card.domain}/${card.name}: invalid recall cost`)
    const mapping = sourceMappingById.get(card.id)
    invariant(mapping?.domain === card.domain && mapping?.name === card.name, `${card.domain}/${card.name}: invalid source mapping`)
    invariant(mapping.imageUrl === card.imageUrl, `${card.domain}/${card.name}: mapped image URL mismatch`)
    invariant(mapping.matchDistance <= 15, `${card.domain}/${card.name}: image match exceeds confidence threshold`)
    invariant(
      mapping.matchMargin >= 5 || mapping.matchMethod === "perceptual-image+visual-confirmation",
      `${card.domain}/${card.name}: ambiguous image match lacks visual confirmation`,
    )
    const actualHash = createHash("sha256")
      .update(await readFile(join(sourceImageRoot, mapping.sourceFile)))
      .digest("hex")
    invariant(actualHash === mapping.sourceSha256, `${card.domain}/${card.name}: source hash mismatch`)
    const outputPath = join(projectRoot, "public", ...card.imageUrl.split("/").filter(Boolean))
    await access(outputPath)
    await sharp(outputPath).metadata()
    if (card.isSupplemental) {
      const parent = domainCardById.get(card.parentCardId)
      invariant(parent && !parent.isSupplemental, `${card.name}: missing regular parent`)
      invariant(parent.domain === card.domain, `${card.name}: parent belongs to another domain`)
      invariant(parent.level === card.level, `${card.name}: supplemental level does not match parent`)
      invariant(card.recallCost === 0 && card.category === "说明卡牌", `${card.name}: invalid supplemental metadata`)
    }
  }

  const runtimeDomainCards = cards.filter((card) => card.ruleset === "rhodes-island" && card.type === "domain")
  invariant(cards.length === 341, `runtime: expected 341 cards, got ${cards.length}`)
  invariant(runtimeDomainCards.length === 236, `runtime: expected 236 domain entries, got ${runtimeDomainCards.length}`)
  invariant(
    JSON.stringify(runtimeDomainCards.map((card) => card.id))
      === JSON.stringify(sourceMap.mappings.map((mapping) => mapping.id)),
    "runtime: domain card order differs from final Markdown",
  )
  for (const runtimeCard of runtimeDomainCards) {
    const catalogCard = domainCardById.get(runtimeCard.id)
    invariant(catalogCard, `${runtimeCard.name}: runtime card is absent from catalog`)
    for (const key of ["name", "level", "description", "imageUrl"]) {
      invariant(runtimeCard[key] === catalogCard[key], `${runtimeCard.name}: runtime ${key} differs from catalog`)
    }
    invariant(JSON.stringify(runtimeCard.rhodesIsland) === JSON.stringify(catalogCard), `${runtimeCard.name}: embedded data differs from catalog`)
  }

  const outputWebps = await listFilesRecursive(join(projectRoot, "public", "rhodes-island", "domains"))
  invariant(outputWebps.length === 236, `output: expected 236 WebP files, got ${outputWebps.length}`)
  invariant(manifest.counts.domainCards === 236, "manifest: wrong domain count")
  invariant(manifest.bundledDomainImages.assets === 236, "manifest: wrong asset count")
  invariant(manifest.bundledDomainImages.linkedCards === 236, "manifest: wrong linked count")
  invariant(manifest.bundledDomainImages.missingCards.length === 0, "manifest: contains missing cards")

  console.log(JSON.stringify({
    sourceImages: allImages.length,
    uniqueSourceHashes: sourceHashes.size,
    domainEntries: catalog.domainCards.length,
    regularDomainCards: catalog.domainCards.filter((card) => !card.isSupplemental).length,
    supplementalCards: catalog.domainCards.filter((card) => card.isSupplemental).length,
    runtimeCards: cards.length,
    outputWebps: outputWebps.length,
    domainCounts: Object.fromEntries(
      Object.keys(expectedDomainCounts).map((domain) => [
        domain,
        catalog.domainCards.filter((card) => card.domain === domain).length,
      ]),
    ),
  }, null, 2))
}

await main()

import { createHash } from "node:crypto"
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import sharp from "sharp"

const projectRoot = resolve(import.meta.dirname, "..")
const argumentsList = process.argv.slice(2)
const sourceArgument = argumentsList.find((argument) => argument.startsWith("--source="))?.slice("--source=".length)
  || argumentsList.find((argument) => argument !== "--" && !argument.startsWith("--"))
const sourceRoot = resolve(
  sourceArgument
    || process.env.RHODES_FINAL_SOURCE_ROOT
    || "D:\\Dql\\Desktop\\《共赴明日：罗德岛旅记》TTTRI全资源",
)
const sourceImageRoot = join(sourceRoot, "图片和附件")
const outputRoot = join(projectRoot, "public", "rhodes-island", "domains")
const stagingRoot = `${outputRoot}.staging`
const backupRoot = `${outputRoot}.backup`
const dataRoot = join(projectRoot, "data", "rhodes-island")
const sourceMapPath = join(dataRoot, "domain-source-map.json")
const placeholderImage = "/assets/rhodes-island/rhodes-terminal-card-placeholder.webp"

async function readJson(name) {
  return JSON.parse(await readFile(join(dataRoot, name), "utf8"))
}

async function writeJson(name, value) {
  await writeFile(join(dataRoot, name), `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex")
}

async function main() {
  const [catalog, cards, manifest, sourceMap] = await Promise.all([
    readJson("catalog.json"),
    readJson("cards.json"),
    readJson("manifest.json"),
    readJson("domain-source-map.json"),
  ])
  if (sourceMap.mappings.length !== 236) {
    throw new Error(`domain source map: expected 236 entries, got ${sourceMap.mappings.length}`)
  }
  const catalogById = new Map(catalog.domainCards.map((card) => [card.id, card]))
  const mappingIds = new Set()
  const mappingSources = new Set()
  const mappingUrls = new Set()

  for (const mapping of sourceMap.mappings) {
    const card = catalogById.get(mapping.id)
    if (!card || card.domain !== mapping.domain || card.name !== mapping.name) {
      throw new Error(`${mapping.domain}/${mapping.name}: source map does not match catalog`)
    }
    if (mappingIds.has(mapping.id)) throw new Error(`duplicate mapped card id: ${mapping.id}`)
    if (mappingSources.has(`${mapping.domain}\0${mapping.sourceFile}`)) {
      throw new Error(`duplicate mapped source: ${mapping.domain}/${mapping.sourceFile}`)
    }
    if (mappingUrls.has(mapping.imageUrl)) throw new Error(`duplicate mapped output: ${mapping.imageUrl}`)
    mappingIds.add(mapping.id)
    mappingSources.add(`${mapping.domain}\0${mapping.sourceFile}`)
    mappingUrls.add(mapping.imageUrl)
    const sourcePath = join(sourceImageRoot, mapping.sourceFile)
    await access(sourcePath)
    const actualHash = await sha256(sourcePath)
    if (actualHash !== mapping.sourceSha256) {
      throw new Error(`${mapping.domain}/${mapping.sourceFile}: source hash changed`)
    }
  }
  if (mappingIds.size !== catalog.domainCards.length) {
    throw new Error(`catalog/source map mismatch: ${catalog.domainCards.length} cards, ${mappingIds.size} mappings`)
  }

  // The final Markdown defines the user-facing card order through its domain
  // sections and image references. Keep both runtime collections in that exact
  // order so newly added and supplemental cards appear beside their source peers.
  const orderedDomainCards = sourceMap.mappings.map((mapping) => catalogById.get(mapping.id))
  catalog.domainCards = orderedDomainCards
  const runtimeDomainById = new Map(
    cards
      .filter((card) => card.type === "domain" && card.ruleset === "rhodes-island")
      .map((card) => [card.id, card]),
  )
  const nonDomainCards = cards.filter(
    (card) => card.type !== "domain" || card.ruleset !== "rhodes-island",
  )
  const orderedRuntimeDomainCards = sourceMap.mappings.map((mapping) => {
    const card = runtimeDomainById.get(mapping.id)
    if (!card) throw new Error(`${mapping.domain}/${mapping.name}: missing runtime card`)
    return card
  })
  cards.splice(0, cards.length, ...nonDomainCards, ...orderedRuntimeDomainCards)

  await rm(stagingRoot, { recursive: true, force: true })
  await mkdir(stagingRoot, { recursive: true })
  try {
    for (const mapping of sourceMap.mappings) {
      const relativeOutput = mapping.imageUrl.replace(/^\/rhodes-island\/domains\//, "")
      if (relativeOutput === mapping.imageUrl || relativeOutput.includes("..")) {
        throw new Error(`invalid mapped image URL: ${mapping.imageUrl}`)
      }
      const outputPath = join(stagingRoot, ...relativeOutput.split("/"))
      await mkdir(dirname(outputPath), { recursive: true })
      await sharp(join(sourceImageRoot, mapping.sourceFile))
        .webp({ quality: 86, effort: 6, smartSubsample: true })
        .toFile(outputPath)
    }

    await rm(backupRoot, { recursive: true, force: true })
    await rename(outputRoot, backupRoot)
    try {
      await rename(stagingRoot, outputRoot)
    } catch (error) {
      await rename(backupRoot, outputRoot)
      throw error
    }
    await rm(backupRoot, { recursive: true, force: true })
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true })
    throw error
  }

  const imageUrlById = new Map(sourceMap.mappings.map((mapping) => [mapping.id, mapping.imageUrl]))
  for (const card of catalog.domainCards) {
    card.imageUrl = imageUrlById.get(card.id) || placeholderImage
  }
  for (const card of cards) {
    if (card.type !== "domain" || card.ruleset !== "rhodes-island") continue
    card.imageUrl = imageUrlById.get(card.id) || placeholderImage
    if (card.rhodesIsland) card.rhodesIsland.imageUrl = card.imageUrl
  }
  const missingCards = catalog.domainCards
    .filter((card) => card.imageUrl === placeholderImage)
    .map((card) => ({ id: card.id, domain: card.domain, name: card.name }))
  manifest.bundledDomainImages = {
    source: sourceMap.source,
    assets: sourceMap.mappings.length,
    linkedCards: sourceMap.mappings.length - missingCards.length,
    regularDomainCards: catalog.domainCards.filter((card) => !card.isSupplemental).length,
    supplementalCards: catalog.domainCards.filter((card) => card.isSupplemental).length,
    missingCards,
  }
  await Promise.all([
    writeJson("catalog.json", catalog),
    writeJson("cards.json", cards),
    writeJson("manifest.json", manifest),
  ])
  console.log(JSON.stringify({
    sourceRoot,
    assets: sourceMap.mappings.length,
    missingCards,
  }, null, 2))
}

await main()

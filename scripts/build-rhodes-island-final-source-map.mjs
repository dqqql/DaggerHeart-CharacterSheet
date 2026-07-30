import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { basename, join, resolve } from "node:path"
import sharp from "sharp"

const projectRoot = resolve(import.meta.dirname, "..")
const sourceRoot = resolve(
  process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length)
    || process.env.RHODES_FINAL_SOURCE_ROOT
    || "D:\\Dql\\Desktop\\《共赴明日：罗德岛旅记》TTTRI全资源",
)
const shouldWrite = process.argv.includes("--write")
const allowVisualConfirmed = process.argv.includes("--allow-visual-confirmed")
const markdownPath = join(sourceRoot, "《共赴明日：罗德岛旅记》TTTRI全资源.md")
const sourceImageRoot = join(sourceRoot, "图片和附件")
const catalogPath = join(projectRoot, "data", "rhodes-island", "catalog.json")
const outputPath = join(projectRoot, "data", "rhodes-island", "domain-source-map.json")
const domainImageRoot = join(projectRoot, "public", "rhodes-island", "domains")
const domainNames = new Set(["攻坚", "坚阵", "秘行", "迅攻", "精准", "奥术", "支柱", "远见", "奇迹", "心界", "工业"])
const displayOrderOverrides = new Map([
  ["工业", [
    "精准投放",
    "涤净流程",
    "前方施工",
    "钢铁拟心",
    "奇思妙想",
    "运载助手",
    "牵引绳索",
    "神工意匠",
    "全线警报",
    "加速航道",
    "定向崩毁",
    "筑固有方",
    "不息熔炉",
    "工业誓约",
    "天堂坠落",
    "巧筑八方",
    "团结一心",
    "反击炮火",
    "一墟作烬",
    "号令巨兵",
    "辉煌裂片",
    "召唤：炮台",
    "召唤：巨兵",
  ]],
])

function parseDomainImages(markdown) {
  const result = new Map()
  let domain = null
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+\**([^*]+?)领域\**\s*$/)
    if (heading && domainNames.has(heading[1].trim())) {
      domain = heading[1].trim()
      result.set(domain, [])
      continue
    }
    if (/^#\s+/.test(line)) domain = null
    if (!domain) continue
    const image = line.match(/^!\[[^\]]*]\((?:图片和附件\/)?([^)]+)\)$/)
    if (image) result.get(domain).push(decodeURIComponent(image[1]).replace(/\\/g, ""))
  }
  return result
}

async function fingerprint(path) {
  const buffer = await readFile(path)
  const pixels = await sharp(buffer)
    .resize(32, 32, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer()
  return {
    sha256: createHash("sha256").update(buffer).digest("hex"),
    pixels,
  }
}

function distance(left, right) {
  let total = 0
  for (let index = 0; index < left.length; index += 1) {
    total += Math.abs(left[index] - right[index])
  }
  return total / left.length
}

async function main() {
  const [markdown, catalogRaw] = await Promise.all([
    readFile(markdownPath, "utf8"),
    readFile(catalogPath, "utf8"),
  ])
  const catalog = JSON.parse(catalogRaw)
  const sourceByDomain = parseDomainImages(markdown)
  const mappings = []
  const unmatchedSources = []

  for (const domain of domainNames) {
    const sourceFiles = sourceByDomain.get(domain) || []
    const cards = catalog.domainCards.filter((card) => card.domain === domain)
    const sourceFingerprints = await Promise.all(sourceFiles.map(async (sourceFile) => ({
      sourceFile,
      ...(await fingerprint(join(sourceImageRoot, sourceFile))),
    })))
    const cardFingerprints = await Promise.all(cards.map(async (card) => ({
      card,
      ...(await fingerprint(join(projectRoot, "public", ...card.imageUrl.split("/").filter(Boolean)))),
    })))

    const candidates = []
    for (const source of sourceFingerprints) {
      for (const target of cardFingerprints) {
        candidates.push({
          source,
          target,
          distance: distance(source.pixels, target.pixels),
        })
      }
    }
    candidates.sort((left, right) => left.distance - right.distance)

    const usedSources = new Set()
    const usedCards = new Set()
    for (const candidate of candidates) {
      if (usedSources.has(candidate.source.sourceFile) || usedCards.has(candidate.target.card.id)) continue
      const alternatives = candidates
        .filter((item) =>
          item.source.sourceFile === candidate.source.sourceFile
          && item.target.card.id !== candidate.target.card.id,
        )
        .sort((left, right) => left.distance - right.distance)
      const matchMargin = (alternatives[0]?.distance ?? Number.POSITIVE_INFINITY) - candidate.distance
      if (candidate.distance > 15 || (matchMargin < 5 && !allowVisualConfirmed)) {
        throw new Error(
          `${domain}/${candidate.source.sourceFile}: ambiguous image match `
          + `(distance ${candidate.distance.toFixed(4)}, margin ${matchMargin.toFixed(4)})`,
        )
      }
      usedSources.add(candidate.source.sourceFile)
      usedCards.add(candidate.target.card.id)
      const sourceOrder = sourceFiles.indexOf(candidate.source.sourceFile)
      const displayOrder = displayOrderOverrides.has(domain)
        ? displayOrderOverrides.get(domain).indexOf(candidate.target.card.name)
        : sourceOrder
      if (displayOrder < 0) {
        throw new Error(`${domain}/${candidate.target.card.name}: missing from display order override`)
      }
      mappings.push({
        domain,
        sourceOrder,
        displayOrder,
        sourceFile: candidate.source.sourceFile,
        sourceSha256: candidate.source.sha256,
        id: candidate.target.card.id,
        name: candidate.target.card.name,
        imageUrl: candidate.target.card.imageUrl,
        matchMethod: matchMargin < 5
          ? "perceptual-image+visual-confirmation"
          : "perceptual-image",
        matchDistance: Number(candidate.distance.toFixed(4)),
        matchMargin: Number(matchMargin.toFixed(4)),
      })
    }

    for (const source of sourceFingerprints) {
      if (!usedSources.has(source.sourceFile)) {
        unmatchedSources.push({
          domain,
          sourceFile: source.sourceFile,
          sourceSha256: source.sha256,
        })
      }
    }
  }

  mappings.sort((left, right) =>
    [...domainNames].indexOf(left.domain) - [...domainNames].indexOf(right.domain)
    || left.displayOrder - right.displayOrder,
  )
  const result = {
    schemaVersion: 1,
    source: basename(sourceRoot),
    markdown: basename(markdownPath),
    mappings,
    unmatchedSources,
    counts: {
      domainEntries: mappings.length + unmatchedSources.length,
      regularDomainCards: catalog.domainCards.filter((card) => !card.isSupplemental).length,
      supplementalCards: catalog.domainCards.filter((card) => card.isSupplemental).length,
    },
  }
  if (shouldWrite) await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8")
  console.log(JSON.stringify({
    sourceRoot,
    mapped: mappings.length,
    unmatchedSources,
    worstMatches: [...mappings].sort((left, right) => right.matchDistance - left.matchDistance).slice(0, 12),
    outputPath: shouldWrite ? outputPath : null,
  }, null, 2))
}

await main()

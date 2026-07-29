import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import sharp from "sharp"

const projectRoot = resolve(import.meta.dirname, "..")
const sourceRoot = resolve(
  process.argv.find((argument) => argument.startsWith("--source="))?.slice("--source=".length)
    || process.env.RHODES_FINAL_SOURCE_ROOT
    || "D:\\Dql\\Desktop\\《共赴明日：罗德岛旅记》TTTRI全资源",
)
const outputRoot = resolve(
  process.argv.find((argument) => argument.startsWith("--output="))?.slice("--output=".length)
    || join(projectRoot, "output", "rhodes-island-final-proofread-sample"),
)
const seed = "rhodes-island-final-proofread-2026-07-30"
const addedNames = new Set([
  "涤净流程",
  "前方施工",
  "\"已完成的告别\"",
  "归乡邀约·洗礼",
  "摇篮曲·终",
  "大地的慈悲·昭示",
  "召唤：炮台",
  "召唤：巨兵",
])
const correctedIds = new Set([
  "ri-domain-card-3cd07cac4f5c",
  "ri-domain-card-d4f5689b9b16",
  "ri-domain-card-44c8fbb096b4",
  "ri-domain-card-ac0dab29a594",
  "ri-domain-card-7ac9f2d272d8",
  "ri-domain-card-b20b73ebf00e",
  "ri-domain-card-dc194bc3150d",
  "ri-domain-card-09d917099b82",
  "ri-domain-card-8ceaaed205e5",
  "ri-domain-card-fafd33393c0c",
  "ri-domain-card-51880cfa791d",
  "ri-domain-card-4b28de45166f",
])

function rank(id) {
  return createHash("sha256").update(`${seed}\0${id}`).digest("hex")
}

async function main() {
  const [catalog, sourceMap] = await Promise.all([
    readFile(join(projectRoot, "data", "rhodes-island", "catalog.json"), "utf8").then(JSON.parse),
    readFile(join(projectRoot, "data", "rhodes-island", "domain-source-map.json"), "utf8").then(JSON.parse),
  ])
  const mappingById = new Map(sourceMap.mappings.map((mapping) => [mapping.id, mapping]))
  const additions = catalog.domainCards.filter((card) => addedNames.has(card.name))
  const randomExisting = []
  for (const domain of catalog.domains.map((item) => item.name)) {
    const candidates = catalog.domainCards
      .filter((card) =>
        card.domain === domain
        && !card.isSupplemental
        && !addedNames.has(card.name)
        && !correctedIds.has(card.id),
      )
      .sort((left, right) => rank(left.id).localeCompare(rank(right.id)))
    randomExisting.push(...candidates.slice(0, 2))
  }
  const samples = [...additions, ...randomExisting].map((card) => ({
    id: card.id,
    name: card.name,
    domain: card.domain,
    level: card.level,
    recallCost: card.recallCost,
    category: card.category,
    reason: addedNames.has(card.name) ? "新增条目全检" : "固定种子领域分层抽样",
    sourceFile: mappingById.get(card.id).sourceFile,
    imageUrl: card.imageUrl,
  }))
  const choose = (items, count) => [...items]
    .sort((left, right) => rank(left.id).localeCompare(rank(right.id)))
    .slice(0, count)
    .map((item) => ({ id: item.id, name: item.name }))
  const requiredAncestryNames = new Set(["菲林", "阿斯兰", "埃拉菲亚", "麒麟", "萨卡兹", "鬼", "阿纳萨"])
  const changedBranchIds = new Set(["ri-branch-f4162da267f0", "ri-branch-f43aee7cb474"])
  const nonDomainSamples = {
    professions: choose(catalog.professions, 2),
    branches: [
      ...catalog.branches.filter((branch) => changedBranchIds.has(branch.id)).map((item) => ({ id: item.id, name: item.name })),
      ...choose(catalog.branches.filter((branch) => !changedBranchIds.has(branch.id)), 8),
    ],
    ancestries: catalog.ancestries
      .filter((ancestry) => requiredAncestryNames.has(ancestry.name))
      .map((item) => ({ id: item.id, name: item.name })),
    communities: [
      ...catalog.communities.filter((community) => community.name === "失乡之民").map((item) => ({ id: item.id, name: item.name })),
      ...choose(catalog.communities.filter((community) => community.name !== "失乡之民"), 2),
    ],
  }
  await mkdir(outputRoot, { recursive: true })
  await writeFile(join(outputRoot, "samples.json"), `${JSON.stringify({ seed, samples, nonDomainSamples }, null, 2)}\n`, "utf8")

  const pageSize = 6
  for (let offset = 0; offset < samples.length; offset += pageSize) {
    const page = samples.slice(offset, offset + pageSize)
    const composites = await Promise.all(page.map(async (sample, index) => ({
      input: await sharp(join(sourceRoot, "图片和附件", sample.sourceFile))
        .resize(375, 525, { fit: "fill" })
        .png()
        .toBuffer(),
      left: (index % 2) * 375,
      top: Math.floor(index / 2) * 525,
    })))
    await sharp({
      create: {
        width: 750,
        height: 1575,
        channels: 3,
        background: "#ffffff",
      },
    }).composite(composites).png().toFile(join(outputRoot, `contact-${String(offset / pageSize + 1).padStart(2, "0")}.png`))
  }
  console.log(JSON.stringify({ seed, sampleCount: samples.length, outputRoot, samples, nonDomainSamples }, null, 2))
}

await main()

import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import sharp from "sharp"

const projectRoot = resolve(import.meta.dirname, "..")
const sourceArgument = process.argv.slice(2).find(argument => argument !== "--")
const sourceRoot = resolve(
  sourceArgument
    || process.env.RHODES_DOMAIN_IMAGE_ROOT
    || "D:\\Dql\\Desktop\\TTTRI 0.9.4卡图包",
)
const outputRoot = join(projectRoot, "public", "rhodes-island", "domains")
const dataRoot = join(projectRoot, "data", "rhodes-island")
const placeholderImage = "/assets/rhodes-island/rhodes-terminal-card-placeholder.webp"

const domainImages = {
  奥术: {
    slug: "arcane",
    files: [
      ["Group 21.png", "战术咏唱"],
      ["Group 21-1.png", "一心双响"],
      ["Group 21-2.png", "破坏轰击"],
      ["Group 21-3.png", "咒术阵线"],
      ["Group 21-4.png", "流沙阻滞"],
      ["Group 21-5.png", "法术蓄能"],
      ["Group 21-6.png", "正霆摄威"],
      ["Group 21-7.png", "震爆调谐"],
      ["Group 21-8.png", "薪火燎原"],
      ["Group 21-9.png", "噩愿折朽"],
      ["Group 21-10.png", "自负此轭"],
      ["Group 21-11.png", "荒芜回响"],
      ["Group 21-12.png", "困缚镣锁"],
      ["Group 21-13.png", "奥术誓约"],
      ["Group 21-14.png", "触类旁通"],
      ["Group 21-15.png", "殁亡言域"],
      ["Group 21-16.png", "主观缓时"],
      ["Group 21-17.png", "终焉传承"],
      ["Group 21-18.png", "霜白摇篮曲"],
      ["Group 21-19.png", "痴愚混沌"],
      ["Group 21-20.png", "延异视阈"],
    ],
  },
  工业: {
    slug: "industry",
    files: [
      ["Group 21.png", "精准投放"],
      ["Group 21-3.png", "钢铁拟心"],
      ["Group 21-4.png", "奇思妙想"],
      ["Group 21-5.png", "运载助手"],
      ["Group 21-6.png", "牵引绳索"],
      ["Group 21-7.png", "神工意匠"],
      ["Group 21-8.png", "全线警报"],
      ["Group 21-9.png", "加速航道"],
      ["Group 21-10.png", "定向崩毁"],
      ["Group 21-11.png", "筑固有方"],
      ["Group 21-12.png", "不息熔炉"],
      ["Group 21-13.png", "工业誓约"],
      ["Group 21-14.png", "天堂坠落"],
      ["Group 21-15.png", "巧筑八方"],
      ["Group 21-16.png", "团结一心"],
      ["Group 21-17.png", "反击炮火"],
      ["Group 21-18.png", "一墟作烬"],
      ["Group 21-19.png", "号令巨兵"],
      ["Group 21-20.png", "辉煌裂片"],
    ],
  },
  攻坚: {
    slug: "assault",
    files: [
      ["Group 0.png", "及锋而试"],
      ["Group 1.png", "强力一击"],
      ["Group 1-1.png", "汹涌怒火"],
      ["Group 1-2.png", "藏锋伺敌"],
      ["Group 1-3.png", "刀刃所栖"],
      ["Group 1-4.png", "掎角之锋"],
      ["Group 1-5.png", "剑走偏锋"],
      ["Group 1-6.png", "横扫架势"],
      ["Group 1-7.png", "未声张的怒火"],
      ["Group 1-8.png", "“推去来兮”"],
      ["Group 1-9.png", "全力相搏"],
      ["Group 1-10.png", "极致锋度"],
      ["Group 1-11.png", "破围之斩"],
      ["Group 1-12.png", "攻坚誓约"],
      ["Group 1-13.png", "武装应变"],
      ["Group 1-14.png", "永志奔流"],
      ["Group 1-15.png", "沸腾爆裂"],
      ["Group 1-16.png", "绯红收割"],
      ["Group 1-17.png", "死境硝烟"],
      ["Group 1-18.png", "止戈为武"],
      ["Group 1-19.png", "焰烬曙明"],
    ],
  },
  坚阵: {
    slug: "bulwark",
    files: [
      ["00.png", "列阵以待"],
      ["01.png", "防御备件"],
      ["02.png", "舍身掩护"],
      ["Group 1.png", "明日之盾"],
      ["Group 2.png", "体能强化"],
      ["Group 3.png", "起盾回击"],
      ["Group 4.png", "武力模式"],
      ["Group 5.png", "坚守模式"],
      ["Group 6.png", "坚城守望"],
      ["Group 7.png", "交叉掩护"],
      ["Group 8.png", "绝境抵抗"],
      ["Group 9.png", "掩蔽护卫"],
      ["Group 10.png", "淬火尘霾"],
      ["Group 11.png", "过命交情"],
      ["Group 12.png", "坚阵誓约"],
      ["Group 13.png", "震慑宣言"],
      ["Group 14.png", "立于风暴"],
      ["Group 15.png", "裂地猛击"],
      ["Group 16.png", "最终防线"],
      ["Group 17.png", "披荆斩棘"],
      ["Group 18.png", "饱和迸射"],
    ],
  },
  精准: {
    slug: "precision",
    files: [
      ["Group 20.png", "“你须直面”"],
      ["Group 20-1.png", "目光如炬"],
      ["Group 20-2.png", "信号射击"],
      ["Group 20-3.png", "目标锁定"],
      ["Group 20-4.png", "顺风飞羽"],
      ["Group 20-5.png", "滑射技巧"],
      ["Group 20-6.png", "终结改装"],
      ["Group 20-7.png", "开火成瘾症"],
      ["Group 20-8.png", "火力支援"],
      ["Group 20-9.png", "靶向阻断"],
      ["Group 20-10.png", "碎甲散射"],
      ["Group 20-11.png", "饱和脉冲"],
      ["Group 20-12.png", "“得见光明”"],
      ["Group 20-13.png", "精准誓约"],
      ["Group 20-14.png", "屏息凝神"],
      ["Group 20-15.png", "暮眼锐瞳"],
      ["Group 20-16.png", "恶魇吞日"],
      ["Group 20-17.png", "归乡邀约"],
      ["Group 20-18.png", "永恒追猎"],
      ["Group 20-19.png", "爆裂黎明"],
      ["Group 20-20.png", "“如你所愿”"],
    ],
  },
  秘行: {
    slug: "shadow",
    files: [
      ["00.png", "独自远走"],
      ["01.png", "暗行匿变"],
      ["02.png", "镜中虚影"],
      ["Group 20.png", "隐秘牵制"],
      ["Group 21.png", "疑点追踪"],
      ["Group 22.png", "蔽影遮目"],
      ["Group 23.png", "硝烟震爆"],
      ["Group 24.png", "坠刃拷问"],
      ["Group 25.png", "秘踪魅影"],
      ["Group 26.png", "缠身命缕"],
      ["Group 27.png", "知难而退"],
      ["Group 28.png", "双影相杀"],
      ["Group 29.png", "离群独狩"],
      ["Group 30.png", "秘行誓约"],
      ["Group 31.png", "恶兆湍流"],
      ["Group 32.png", "匿于影中"],
      ["Group 33.png", "专线联络"],
      ["Group 34.png", "镜花水月"],
      ["Group 35.png", "烽烟行刑场"],
      ["Group 36.png", "降临"],
      ["Group 37.png", "热寂墓碑"],
    ],
  },
  奇迹: {
    slug: "miracle",
    files: [
      ["Group 21.png", "治愈水波"],
      ["Group 21-1.png", "公证所教习"],
      ["Group 21-2.png", "铳弹共感"],
      ["Group 21-3.png", "渐进性润化"],
      ["Group 21-4.png", "绿野幻梦"],
      ["Group 21-5.png", "雪与冰的一瞥"],
      ["Group 21-6.png", "心随意动"],
      ["Group 21-7.png", "恐惧国度"],
      ["Group 21-8.png", "永恒烈焰"],
      ["Group 21-9.png", "神祇垂爱"],
      ["Group 21-10.png", "破碎愿景"],
      ["Group 21-11.png", "生态耦合"],
      ["Group 21-12.png", "雪境守望"],
      ["Group 21-13.png", "奇迹誓约"],
      ["Group 21-14.png", "圣约决裁"],
      ["Group 21-15.png", "遗尘守望"],
      ["Group 21-16.png", "连锁愿迹"],
      ["Group 21-17.png", "盛大终末"],
      ["Group 21-18.png", "破桎而出"],
      ["Group 21-19.png", "不赦不息"],
      ["Group 21-20.png", "逍遥自如"],
    ],
  },
  心界: {
    slug: "mindscape",
    files: [
      ["Group 21.png", "无词哀歌"],
      ["Group 21-1.png", "情绪吸收"],
      ["Group 21-2.png", "视觉陷阱"],
      ["Group 21-3.png", "夜魇魔影"],
      ["Group 21-4.png", "临界升变"],
      ["Group 21-5.png", "英雄诗篇"],
      ["Group 21-6.png", "述其心事"],
      ["Group 21-7.png", "共鸣溃缩"],
      ["Group 21-8.png", "呓语偏离"],
      ["Group 21-9.png", "美好憧憬"],
      ["Group 21-10.png", "“我的海疆”"],
      ["Group 21-11.png", "人间相逢"],
      ["Group 21-12.png", "共望天穹"],
      ["Group 21-13.png", "错愕回忆"],
      ["Group 21-14.png", "心界誓约"],
      ["Group 21-15.png", "美梦成真"],
      ["Group 21-16.png", "无终奇语"],
      ["Group 21-18.png", "遁入阇那"],
      ["Group 21-19.png", "慈悲愿景"],
      ["Group 21-20.png", "心相终曲"],
    ],
  },
  迅攻: {
    slug: "blitz",
    files: [
      ["00.png", "穿刺阵线"],
      ["01.png", "破溃突袭"],
      ["02.png", "冲锋号令"],
      ["Group 20.png", "历战先锋"],
      ["Group 21.png", "贯敌之刺"],
      ["Group 22.png", "紧急机动"],
      ["Group 23.png", "趁势追袭"],
      ["Group 24.png", "见机行事"],
      ["Group 25.png", "逐夜烁光"],
      ["Group 26.png", "剑雨滂沱"],
      ["Group 27.png", "一致向前"],
      ["Group 28.png", "迅敏直觉"],
      ["Group 29.png", "高效冲击"],
      ["Group 30.png", "迅攻誓约"],
      ["Group 31.png", "血色刀锋"],
      ["Group 32.png", "锋芒对决"],
      ["Group 33.png", "惊霆怒途"],
      ["Group 34.png", "先讨之振"],
      ["Group 35.png", "长夜临光"],
      ["Group 36.png", "开辟前路"],
      ["Group 37.png", "锋刃荣光"],
    ],
  },
  远见: {
    slug: "foresight",
    files: [
      ["Group 21.png", "开放性开局"],
      ["Group 21-1.png", "循理归因"],
      ["Group 21-2.png", "周旋的谋略"],
      ["Group 21-3.png", "全局洞悉"],
      ["Group 21-4.png", "料敌机先"],
      ["Group 21-5.png", "同心同行"],
      ["Group 21-6.png", "高速思考"],
      ["Group 21-7.png", "洞破方圆"],
      ["Group 21-8.png", "递归策略"],
      ["Group 21-9.png", "卓识智魄"],
      ["Group 21-10.png", "思衡托之核"],
      ["Group 21-11.png", "“如我所见”"],
      ["Group 21-12.png", "俯瞰视界"],
      ["Group 21-13.png", "远见誓约"],
      ["Group 21-14.png", "罪与罚的先声"],
      ["Group 21-15.png", "至圣作愚"],
      ["Group 21-16.png", "天下一白"],
      ["Group 21-17.png", "变革已至"],
      ["Group 21-18.png", "“未完结的故事”"],
      ["Group 21-19.png", "竞天一子"],
      ["Group 21-20.png", "Q.E.D."],
    ],
  },
  支柱: {
    slug: "pillar",
    files: [
      ["Group 21.png", "战地支柱"],
      ["Group 21-1.png", "无声润物"],
      ["Group 21-2.png", "伸出援手"],
      ["Group 21-3.png", "药物扳机"],
      ["Group 21-4.png", "凡人之愿"],
      ["Group 21-5.png", "宁神之香"],
      ["Group 21-6.png", "心理疏导"],
      ["Group 21-7.png", "强心注射"],
      ["Group 21-8.png", "大地的慈悲"],
      ["Group 21-9.png", "封护"],
      ["Group 21-10.png", "枯荣与共"],
      ["Group 21-11.png", "灯火长存"],
      ["Group 21-12.png", "无畏者协议"],
      ["Group 21-13.png", "支柱誓约"],
      ["Group 21-14.png", "信条圣域"],
      ["Group 21-15.png", "“治愈苦痛”"],
      ["Group 21-16.png", "超压链接"],
      ["Group 21-17.png", "氤氲疗愈"],
      ["Group 21-18.png", "生命火种"],
      ["Group 21-19.png", "先贤化身"],
      ["Group 21-20.png", "同归殊途之吟"],
    ],
  },
}

async function readJson(name) {
  return JSON.parse(await readFile(join(dataRoot, name), "utf8"))
}

async function writeJson(name, value) {
  await writeFile(join(dataRoot, name), `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

async function main() {
  const [catalog, cards, manifest] = await Promise.all([
    readJson("catalog.json"),
    readJson("cards.json"),
    readJson("manifest.json"),
  ])

  // Validate every source and runtime mapping before replacing the generated
  // directory, so a typo or incomplete source pack cannot erase a good import.
  for (const [domain, config] of Object.entries(domainImages)) {
    for (const [sourceFile, cardName] of config.files) {
      const matchingCards = catalog.domainCards.filter(
        card => card.domain === domain && card.name === cardName,
      )
      if (matchingCards.length === 0) {
        throw new Error(`${domain}/${cardName}: no matching runtime card`)
      }
      await access(join(sourceRoot, domain, "成图", sourceFile))
    }
  }

  await rm(outputRoot, { recursive: true, force: true })
  await mkdir(outputRoot, { recursive: true })

  const imageUrlByDomainAndName = new Map()
  let assetCount = 0

  for (const [domain, config] of Object.entries(domainImages)) {
    const domainOutput = join(outputRoot, config.slug)
    await mkdir(domainOutput, { recursive: true })

    for (const [sourceFile, cardName] of config.files) {
      const matchingCards = catalog.domainCards.filter(
        card => card.domain === domain && card.name === cardName,
      )

      const imageId = matchingCards[0].id.replace(/^ri-domain-card-/, "")
      const imageUrl = `/rhodes-island/domains/${config.slug}/${imageId}.webp`
      const sourcePath = join(sourceRoot, domain, "成图", sourceFile)
      const outputPath = join(domainOutput, `${imageId}.webp`)

      await sharp(sourcePath)
        .webp({ quality: 86, effort: 6, smartSubsample: true })
        .toFile(outputPath)

      imageUrlByDomainAndName.set(`${domain}\0${cardName}`, imageUrl)
      assetCount += 1
    }
  }

  let linkedCardCount = 0
  for (const card of catalog.domainCards) {
    const imageUrl = imageUrlByDomainAndName.get(`${card.domain}\0${card.name}`)
    card.imageUrl = imageUrl || placeholderImage
    if (imageUrl) linkedCardCount += 1
  }

  for (const card of cards) {
    if (card.type !== "domain" || card.ruleset !== "rhodes-island") continue
    const imageUrl = imageUrlByDomainAndName.get(`${card.class}\0${card.name}`)
    card.imageUrl = imageUrl || placeholderImage
    if (card.rhodesIsland) card.rhodesIsland.imageUrl = card.imageUrl
  }

  const missingCards = catalog.domainCards
    .filter(card => card.imageUrl === placeholderImage)
    .map(card => ({ id: card.id, domain: card.domain, name: card.name }))

  manifest.bundledDomainImages = {
    source: "TTTRI 0.9.4卡图包",
    assets: assetCount,
    linkedCards: linkedCardCount,
    missingCards,
  }

  await Promise.all([
    writeJson("catalog.json", catalog),
    writeJson("cards.json", cards),
    writeJson("manifest.json", manifest),
  ])

  console.log(JSON.stringify({
    sourceRoot,
    assetCount,
    linkedCardCount,
    missingCards,
  }, null, 2))
}

await main()

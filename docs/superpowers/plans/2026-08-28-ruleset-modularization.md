# 双规则模块化与技术债清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有存档格式、规则结果和页面外观的前提下，为“匕首之心 SRD”和“罗德岛模式”建立清晰的规则模块边界，降低共享层对罗德岛实现的直接依赖，清理高风险技术债，并对已确认的热路径做适度优化。

**Architecture:** 保留单个 Next.js 应用、单个 Zustand 角色卡 store、单个 `SheetData` 持久化结构和统一卡牌 store；新增一个很薄的 ruleset registry，集中提供规则元数据、能力开关、角色数据归一化、导出前处理和派生数值扩展。共享层只依赖 registry 接口，具体规则实现放在各自目录；本轮不做插件化框架、状态库替换、存档 schema 大改或两套应用拆分。

**Tech Stack:** Next.js 15、React 19、TypeScript strict、Zustand 5、Vitest 3、Testing Library、pnpm、静态导出。

---

## 0. 探索结论与约束

### 当前基线（2026-08-28）

- `pnpm exec tsc --noEmit`：通过。
- `pnpm test:run -- --reporter=dot`：68 个测试文件、357 个测试全部通过；总耗时约 149 秒。
- 当前分支：`feature/preset-equipment-auto-calc`；开始实施前必须重新执行 `git status --short`，不要覆盖用户后续产生的改动。
- 没有 `tests/integration/` 测试，现有保护主要来自 `tests/unit/`。
- `lib/sheet-store.ts`、`app/page.tsx`、`components/character-sheet.tsx` 和 `components/character-sheet-page-two.tsx` 分别约 1254、1210、827、613 行，是本轮最需要减压、但不应整体重写的文件。

### 已确认的耦合与技术债

1. `lib/sheet-store.ts:167-175` 的 `finalizeSheetData` 同时负责共享派生统计与 `applyRhodesIslandAutomation`，共享 store 直接依赖具体规则。
2. `lib/domain-card-derived-stats.ts` 直接导入 `lib/rhodes-island-derived-stats.ts`，共享计算层知道具体规则名称。
3. `app/page.tsx`、底栏、页面注册、卡牌筛选与多个表单区块各自比较字符串 `"rhodes-island"`，同一能力被多处重复判断。
4. `lib/default-sheet-data.ts` 导出单一对象；`lib/multi-character-storage.ts:417-429` 只做浅拷贝，新角色会复用默认数据里的嵌套数组和对象引用。
5. `components/character-sheet-page-two.tsx:164-223` 和 `components/character-sheet-page-two-sections/upgrade-section.tsx:54-81` 通过中文标签 `includes(...)` 识别升级行为，文案改动可能破坏逻辑。
6. `hooks/use-card-filtering.ts` 已有类型索引，却仍在每次规则/类型变化时对类型卡牌再次做规则过滤；统一卡牌 store 没有“规则 + 类型”索引。
7. `components/ui/page-visibility-dropdown.tsx` 使用 `useSheetStore()` 订阅整个 store；部分本轮会触碰的组件也使用过宽订阅。
8. 罗德岛实现散落在 `lib/rhodes-island-*.ts`，其职责虽已有测试，但目录边界不清晰。

### 本轮明确不做

- 不把 `SheetData` 改成判别联合，不改变 JSON/HTML/角色码持久化字段名。
- 不更换 Zustand，不重写 `sheet-store` 的全部 action，不拆成两个 Next.js 应用。
- 不改变卡牌 ID、`ruleSetId` 值、localStorage key、页面尺寸、打印 CSS 或现有视觉设计。
- 不在本轮做按规则懒加载全部卡牌；两套内置卡仍可在初始化阶段进入统一 store。
- 不顺手清理与双规则边界无关的卡牌导入、GM 面板或编辑器技术债。
- 不以“抽象未来可能出现的第三套规则”为理由引入 DI 容器、事件总线或动态插件加载。

## 1. 目标依赖方向

实施完成后，依赖方向必须是：

```text
React 页面/组件
      │
      ├── ruleset registry（标签、能力、页面/卡牌策略）
      │          │
      │          ├── daggerheart definition
      │          └── rhodes-island definition
      │                         ├── automation
      │                         ├── derived-stats
      │                         ├── experience
      │                         └── card-display/domain-filter
      │
      ├── sheet finalization（共享同步 + 当前规则 hook + 派生统计）
      └── Zustand stores / persistence
```

禁止出现新的 `lib/sheet-store.ts -> lib/rulesets/rhodes-island/*` 直接依赖；具体规则必须经 registry 进入共享层。

## 2. 文件结构锁定

### 新建

- `lib/rulesets/types.ts`：`RuleSetModule`、能力、UI 文案、派生来源等稳定接口。
- `lib/rulesets/registry.ts`：唯一的规则模块映射与查询函数。
- `lib/rulesets/daggerheart/definition.ts`：SRD 规则元数据与 identity hooks。
- `lib/rulesets/rhodes-island/definition.ts`：罗德岛元数据，组合其已有规则函数。
- `lib/rulesets/rhodes-island/automation.ts`：由现有 `lib/rhodes-island-automation.ts` 移入。
- `lib/rulesets/rhodes-island/derived-stats.ts`：由现有 `lib/rhodes-island-derived-stats.ts` 移入。
- `lib/rulesets/rhodes-island/experience.ts`：由现有 `lib/rhodes-island-experience.ts` 移入。
- `lib/rulesets/rhodes-island/card-display.ts`：由现有 `lib/rhodes-island-card-display.ts` 移入。
- `lib/rulesets/rhodes-island/domain-filter.ts`：由现有 `lib/rhodes-domain-filter.ts` 移入。
- `lib/sheet-finalization.ts`：从 `sheet-store` 提取纯函数 finalization pipeline。
- `components/rulesets/rhodes-island-module-upgrade.tsx`：罗德岛模组选择 UI，避免共享升级组件直接读取罗德岛 catalog。
- `components/layout/character-sheet-pages.ts`：集中定义页面清单及其规则可见性。
- `docs/architecture/rulesets.md`：维护者文档。
- 对应单元测试：`tests/unit/ruleset-registry.test.ts`、`tests/unit/default-sheet-data-factory.test.ts`、`tests/unit/sheet-finalization.test.ts`、`tests/unit/upgrade-option-actions.test.ts`、`tests/unit/ruleset-card-index.test.ts`、`tests/unit/page-registry-rulesets.test.ts`。

### 修改

- `lib/default-sheet-data.ts`、`lib/sheet-data.ts`、`lib/sheet-data-migration.ts`
- `lib/sheet-store.ts`、`lib/multi-character-storage.ts`
- `lib/ruleset.ts`、`lib/ruleset-card-batches.ts`、`lib/domain-card-derived-stats.ts`、`lib/preset-equipment.ts`
- `hooks/use-export-handlers.ts`、`hooks/use-card-filtering.ts`
- `card/stores/store-types.ts`、`card/stores/store-actions.ts`、`card/stores/unified-card-store.ts`
- `data/list/upgrade.ts`
- `app/page.tsx`
- `components/character-sheet.tsx`、`components/character-sheet-page-two.tsx`
- `components/character-sheet-page-two-sections/upgrade-section.tsx`
- `components/layout/bottom-dock.tsx`、`components/layout/page-display.tsx`
- `components/modals/card-selection/CardTypeSidebar.tsx`
- `components/ui/page-visibility-dropdown.tsx`
- 受移动 import 影响的组件与测试。

### 删除（仅在所有 import 更新且测试通过后）

- `lib/rhodes-island-automation.ts`
- `lib/rhodes-island-derived-stats.ts`
- `lib/rhodes-island-experience.ts`
- `lib/rhodes-island-card-display.ts`
- `lib/rhodes-domain-filter.ts`

不要移动 `data/rhodes-island/` 和 `public/rhodes-island/`；它们已经形成稳定的数据/资源边界，移动只会制造无价值 diff。

---

### Task 1: 用默认数据工厂消除嵌套引用共享

**Files:**
- Modify: `lib/default-sheet-data.ts`
- Modify: `lib/multi-character-storage.ts:417-429`
- Modify: `lib/sheet-data-migration.ts:454-494`
- Modify: `lib/sheet-store.ts:245-247`
- Create: `tests/unit/default-sheet-data-factory.test.ts`

- [x] **Step 1: 写失败测试，证明两份默认角色不能共享引用**

```ts
import { describe, expect, it } from "vitest"
import { createDefaultSheetData } from "@/lib/default-sheet-data"

describe("default sheet data factory", () => {
  it("creates independent nested state for each character and ruleset", () => {
    const first = createDefaultSheetData("daggerheart")
    const second = createDefaultSheetData("rhodes-island")

    expect(first.ruleSetId).toBe("daggerheart")
    expect(second.ruleSetId).toBe("rhodes-island")
    expect(first.cards).not.toBe(second.cards)
    expect(first.cards[0]).not.toBe(second.cards[0])
    expect(first.inventory).not.toBe(second.inventory)
    expect(first.checkedUpgrades).not.toBe(second.checkedUpgrades)
    expect(first.pageVisibility).not.toBe(second.pageVisibility)
    expect(first.notebook).not.toBe(second.notebook)
    expect(first.rulesetAutomationVersions).not.toBe(second.rulesetAutomationVersions)

    first.inventory[0] = "changed"
    expect(second.inventory[0]).toBe("")
  })
})
```

- [x] **Step 2: 运行测试并确认因导出不存在而失败**

Run: `pnpm exec vitest run tests/unit/default-sheet-data-factory.test.ts`

Expected: FAIL，错误包含 `createDefaultSheetData` 未导出。

- [x] **Step 3: 将当前对象字面量改为每次创建全新嵌套值的工厂**

在 `lib/default-sheet-data.ts` 中保留当前所有字段和值，只把对象创建包进函数；不能用 `structuredClone(defaultSheetData)` 作为主实现。

这是机械包裹，不重写对象内容：把当前声明行 `export const defaultSheetData: SheetData = {` 替换为下面的函数头和 `return` 开头：

```ts
import type { RuleSetId, SheetData } from "./sheet-data"

export function createDefaultSheetData(
  ruleSetId: RuleSetId = "daggerheart",
): SheetData {
  return {
```

把当前对象的第一项 `ruleSetId: "daggerheart",` 改为 `ruleSetId,`，其余字段逐行原样保留。把文件末尾关闭对象的 `};` 替换为：

```ts
  }
}

// 兼容尚未迁移的只读调用方；新增角色和 migration 不得再浅拷贝此常量。
export const defaultSheetData: SheetData = createDefaultSheetData()
```

所有现有 `Array(...)`、对象字面量和 `createEmptyCard()` 调用必须留在函数体内，确保每次调用都生成新引用。

- [x] **Step 4: 切换创建、迁移和 store 初始化入口**

`createNewCharacter()` 直接使用工厂：

```ts
export function createNewCharacter(
  name: string,
  ruleSetId: RuleSetId = "daggerheart",
): SheetData {
  return {
    ...createDefaultSheetData(ruleSetId),
    name: name || "新角色",
  }
}
```

`migrateSheetData()` 必须先归一化规则，再选择默认值：

```ts
const ruleSetId = normalizeRuleSetId(sourceData.ruleSetId)
let migrated: SheetData = {
  ...createDefaultSheetData(ruleSetId),
  ...sourceData,
  ruleSetId,
}
```

`sheet-store` 初始值改成 `createDefaultSheetData()`。不要改变 load/import 时序。

- [x] **Step 5: 运行关联测试与类型检查**

Run:

```powershell
pnpm exec vitest run tests/unit/default-sheet-data-factory.test.ts tests/unit/multi-character-storage.test.ts tests/unit/preset-equipment.test.ts
pnpm exec tsc --noEmit
```

Expected: 全部 PASS，TypeScript 无输出且退出码为 0。

- [x] **Step 6: 提交**

```powershell
git add lib/default-sheet-data.ts lib/multi-character-storage.ts lib/sheet-data-migration.ts lib/sheet-store.ts tests/unit/default-sheet-data-factory.test.ts
git commit -m "refactor: create isolated ruleset sheet defaults"
```

---

### Task 2: 建立最小 ruleset contract 与 registry

**Files:**
- Create: `lib/rulesets/types.ts`
- Create: `lib/rulesets/registry.ts`
- Create: `lib/rulesets/daggerheart/definition.ts`
- Create: `lib/rulesets/rhodes-island/definition.ts`
- Modify: `lib/ruleset.ts`
- Create: `tests/unit/ruleset-registry.test.ts`

- [x] **Step 1: 写 registry 合同测试**

测试必须覆盖：两个 ID 均有定义；label 保持现有中文；能力开关互补；未知值仍由现有 `normalizeRuleSetId` 回落到 SRD；返回定义对象引用稳定。

```ts
expect(getRuleSetModule("daggerheart").capabilities.officialImagePack).toBe(true)
expect(getRuleSetModule("rhodes-island").capabilities.officialImagePack).toBe(false)
expect(getRuleSetModule("daggerheart").labels.subclass).toBe("子职业")
expect(getRuleSetModule("rhodes-island").labels.subclass).toBe("分支")
expect(getRuleSetModule("daggerheart")).toBe(getRuleSetModule("daggerheart"))
```

- [x] **Step 2: 运行测试并确认失败**

Run: `pnpm exec vitest run tests/unit/ruleset-registry.test.ts`

Expected: FAIL，registry 模块不存在。

- [x] **Step 3: 定义窄接口，禁止把组件或 store 塞进规则模块**

`lib/rulesets/types.ts` 的首版接口固定为：

```ts
import type { SheetData, RuleSetId } from "@/lib/sheet-data"
import type { DerivedStatSourceLine } from "@/lib/preset-equipment"

export interface RuleSetCapabilities {
  mixedAncestry: boolean
  ancestryExperience: boolean
  secondaryWeapon: boolean
  inventoryWeapons: boolean
  managedPrimaryWeapon: boolean
  extendedCardTypes: boolean
  guide: boolean
  gmPanel: boolean
  characterCode: boolean
  officialImagePack: boolean
  printPreview: boolean
  keyboardPageNavigation: boolean
}

export interface RuleSetLabels {
  subclass: string
  cardLibrary: string
  exportPreview: string
}

export interface RuleSetLayout {
  inventoryRows: 4 | 5
  professionFeaturePlacement: "left" | "right"
  hiddenFocusedCardSlots: readonly number[]
}

export interface RuleSetDerivedSources {
  evasion: DerivedStatSourceLine[]
  armorValue: DerivedStatSourceLine[]
  minorThreshold: DerivedStatSourceLine[]
  majorThreshold: DerivedStatSourceLine[]
  hpMax: DerivedStatSourceLine[]
  stressMax: DerivedStatSourceLine[]
}

export interface RuleSetModule {
  id: RuleSetId
  label: string
  capabilities: Readonly<RuleSetCapabilities>
  labels: Readonly<RuleSetLabels>
  layout: Readonly<RuleSetLayout>
  normalizeSheetData: (data: SheetData) => SheetData
  prepareForExport: (data: SheetData) => SheetData
  getDerivedStatSources: (data: SheetData) => RuleSetDerivedSources
  getProfessionHopeFeature: (professionId: string | undefined) => string
}
```

- [x] **Step 4: 添加两个静态 definition 与穷尽映射**

`daggerheart/definition.ts` 的 hooks 都是 identity/empty；`rhodes-island/definition.ts` 暂时也先用 identity/empty，Task 3 再接现有函数。`registry.ts` 必须使用：

两个 definition 的配置值必须严格按下表填写，不能从 UI 反向推断：

| 字段 | daggerheart | rhodes-island |
|---|---:|---:|
| `mixedAncestry` | `true` | `false` |
| `ancestryExperience` | `false` | `true` |
| `secondaryWeapon` | `true` | `false` |
| `inventoryWeapons` | `true` | `false` |
| `managedPrimaryWeapon` | `false` | `true` |
| `extendedCardTypes` | `true` | `false` |
| `guide` / `gmPanel` / `characterCode` / `officialImagePack` / `printPreview` | 全部 `true` | 全部 `false` |
| `keyboardPageNavigation` | `false` | `true` |
| `layout.inventoryRows` | `5` | `4` |
| `layout.professionFeaturePlacement` | `"left"` | `"right"` |
| `layout.hiddenFocusedCardSlots` | `[]` | `[3]` |
| `labels.subclass` | `"子职业"` | `"分支"` |
| `labels.cardLibrary` | `"匕首之心卡库"` | `"罗德岛离线卡库"` |
| `labels.exportPreview` | `"DAGGERHEART · 导出预览"` | `"罗德岛终端 · 导出预览"` |

SRD 的 `normalizeSheetData`、`prepareForExport` 为 identity，`getDerivedStatSources` 返回六个全新空数组，`getProfessionHopeFeature` 返回空字符串。罗德岛在 Task 2 也先使用相同 hooks，Task 3 再接真实实现。

```ts
const RULE_SET_MODULES = {
  daggerheart: daggerheartRuleSet,
  "rhodes-island": rhodesIslandRuleSet,
} satisfies Record<RuleSetId, RuleSetModule>

export function getRuleSetModule(id: RuleSetId): RuleSetModule {
  return RULE_SET_MODULES[id]
}

export const RULE_SET_LABELS: Record<RuleSetId, string> = Object.fromEntries(
  Object.values(RULE_SET_MODULES).map(module => [module.id, module.label]),
) as Record<RuleSetId, string>
```

`lib/ruleset.ts` 暂作兼容 barrel：重导出 registry 的 label/query，并保留 `getCardRuleSetId`、`cardBelongsToRuleSet`。不要一次修改所有调用方。

- [x] **Step 5: 测试与提交**

Run: `pnpm exec vitest run tests/unit/ruleset-registry.test.ts tests/unit/ruleset-card-batches.test.ts && pnpm exec tsc --noEmit`

Expected: PASS。

```powershell
git add lib/rulesets lib/ruleset.ts tests/unit/ruleset-registry.test.ts
git commit -m "refactor: add ruleset registry contract"
```

---

### Task 3: 把罗德岛纯规则文件归入模块目录

**Files:**
- Move: `lib/rhodes-island-automation.ts` → `lib/rulesets/rhodes-island/automation.ts`
- Move: `lib/rhodes-island-derived-stats.ts` → `lib/rulesets/rhodes-island/derived-stats.ts`
- Move: `lib/rhodes-island-experience.ts` → `lib/rulesets/rhodes-island/experience.ts`
- Move: `lib/rhodes-island-card-display.ts` → `lib/rulesets/rhodes-island/card-display.ts`
- Move: `lib/rhodes-domain-filter.ts` → `lib/rulesets/rhodes-island/domain-filter.ts`
- Modify imports: `components/card-drawer.tsx`
- Modify imports: `components/character-sheet-page-two-sections/card-deck-section.tsx`
- Modify imports: `components/character-sheet-page-two-sections/upgrade-section.tsx`
- Modify imports: `components/character-sheet-sections/experience-section.tsx`
- Modify imports: `components/character-sheet-sections/header-section.tsx`
- Modify imports: `components/character-sheet-sections/hope-section.tsx`
- Modify imports: `components/modals/armor-selection-modal.tsx`
- Modify imports: `components/ui/card-content.tsx`
- Modify imports: `components/ui/card-hover-preview.tsx`
- Modify imports: `components/ui/image-card.tsx`
- Modify imports: `components/ui/print-image-card.tsx`
- Modify imports: `components/ui/selectable-card.tsx`
- Modify imports: `components/ui/simple-image-card.tsx`
- Modify imports: `hooks/use-card-filtering.ts`
- Modify imports: `hooks/use-export-handlers.ts`
- Modify imports: `lib/domain-card-derived-stats.ts`
- Modify imports: `lib/preset-equipment.ts`
- Modify imports: `lib/sheet-store.ts`
- Modify imports: `tests/unit/rhodes-domain-filter.test.ts`
- Modify imports: `tests/unit/rhodes-island-armor.test.ts`
- Modify imports: `tests/unit/rhodes-island-automation.test.ts`
- Modify imports: `tests/unit/rhodes-island-card-display.test.ts`
- Modify imports: `tests/unit/rhodes-island-derived-stats.test.ts`
- Modify imports: `tests/unit/rhodes-island-experience.test.ts`
- Modify imports: `tests/unit/rhodes-island-home-fields.test.tsx`
- Modify: `lib/rulesets/rhodes-island/definition.ts`

- [x] **Step 1: 记录旧 import 清单**

Run:

```powershell
rg -n "@/lib/rhodes-island-|@/lib/rhodes-domain-filter|./rhodes-island-" app card components hooks lib tests
```

Expected: 输出当前所有待迁移 import；把它作为本任务核对清单。

- [x] **Step 2: 使用 `git mv` 保留历史后更新 import**

```powershell
New-Item -ItemType Directory -Force lib\rulesets\rhodes-island | Out-Null
git mv lib\rhodes-island-automation.ts lib\rulesets\rhodes-island\automation.ts
git mv lib\rhodes-island-derived-stats.ts lib\rulesets\rhodes-island\derived-stats.ts
git mv lib\rhodes-island-experience.ts lib\rulesets\rhodes-island\experience.ts
git mv lib\rhodes-island-card-display.ts lib\rulesets\rhodes-island\card-display.ts
git mv lib\rhodes-domain-filter.ts lib\rulesets\rhodes-island\domain-filter.ts
```

用 `apply_patch` 更新所有 import。不得通过临时 re-export 文件掩盖漏改。

- [x] **Step 3: 将现有实现接入罗德岛 definition**

```ts
export const rhodesIslandRuleSet: RuleSetModule = {
  id: "rhodes-island",
  label: "共赴明日：罗德岛旅记",
  capabilities: {
    mixedAncestry: false,
    ancestryExperience: true,
    secondaryWeapon: false,
    inventoryWeapons: false,
    managedPrimaryWeapon: true,
    extendedCardTypes: false,
    guide: false,
    gmPanel: false,
    characterCode: false,
    officialImagePack: false,
    printPreview: false,
    keyboardPageNavigation: true,
  },
  labels: {
    subclass: "分支",
    cardLibrary: "罗德岛离线卡库",
    exportPreview: "罗德岛终端 · 导出预览",
  },
  layout: {
    inventoryRows: 4,
    professionFeaturePlacement: "right",
    hiddenFocusedCardSlots: [3],
  },
  normalizeSheetData: applyRhodesIslandAutomation,
  prepareForExport: withRhodesIslandDefaultAncestryExperience,
  getDerivedStatSources: getRhodesDerivedStatSources,
  getProfessionHopeFeature: getRhodesProfessionHopeFeature,
}
```

SRD definition 保持 identity hooks。不要把 React 组件导入 definition。

- [x] **Step 4: 确认不存在旧路径并运行罗德岛测试组**

Run:

```powershell
$oldImports = rg -n "@/lib/rhodes-island-|@/lib/rhodes-domain-filter|./rhodes-island-" app card components hooks lib tests
if ($LASTEXITCODE -eq 0) { $oldImports; throw "旧 ruleset import 尚未清完" }
pnpm exec vitest run tests/unit/rhodes-island-automation.test.ts tests/unit/rhodes-island-derived-stats.test.ts tests/unit/rhodes-island-experience.test.ts tests/unit/rhodes-island-card-display.test.ts tests/unit/rhodes-domain-filter.test.ts
pnpm exec tsc --noEmit
```

Expected: `rg` 无匹配，所有测试 PASS。

- [x] **Step 5: 提交**

```powershell
git add -u -- lib components hooks tests
git add lib/rulesets
git commit -m "refactor: group rhodes island rules module"
```

---

### Task 4: 从 Zustand store 提取纯 finalization pipeline

**Files:**
- Create: `lib/sheet-finalization.ts`
- Modify: `lib/sheet-store.ts:23-176` 及所有 `finalizeSheetData` 调用
- Modify: `lib/domain-card-derived-stats.ts`
- Create: `tests/unit/sheet-finalization.test.ts`
- Modify: `tests/unit/sheet-store-derived-stats.test.ts`

- [x] **Step 1: 写双规则 finalization 合同测试**

至少覆盖：

- SRD 的子职业施法属性同步与领域卡派生统计不变。
- 罗德岛分支选择后，在同一次 `finalizeSheetData` 中完成规则 automation 和派生来源应用。
- 传入 SRD 数据时不会调用罗德岛实现（可 spy `daggerheartRuleSet.normalizeSheetData`，不要 mock 私有函数）。
- 显式清空 `evasion`/阈值的现有语义不变。

- [x] **Step 2: 运行测试并确认缺少新模块**

Run: `pnpm exec vitest run tests/unit/sheet-finalization.test.ts`

Expected: FAIL，`sheet-finalization` 不存在。

- [x] **Step 3: 搬移纯函数并固定执行顺序**

从 `sheet-store.ts` 搬出 `SPELLCASTING_ATTRIBUTE_MAP`、`syncSubclassSpellcasting`、`getExplicitlyClearedDerivedFields`、`syncDerivedCombatStats`、`finalizeSheetData`。新 pipeline 必须明确按以下顺序执行：

```ts
export function finalizeSheetData(
  newData: SheetData,
  oldData: SheetData,
  explicitlyClearedFields = new Set<DerivedCombatField>(),
): SheetData {
  const withSubclass = syncSubclassSpellcasting(newData, oldData)
  const withRuleSet = getRuleSetModule(withSubclass.ruleSetId)
    .normalizeSheetData(withSubclass)
  return syncDerivedCombatStats(withRuleSet, explicitlyClearedFields)
}
```

规则 automation 必须先于派生统计，因为它可能修改卡牌、武器或其他派生输入。所有函数保持纯函数，不得在 `sheet-finalization.ts` 中调用 Zustand、通知组件或 localStorage。

- [x] **Step 4: 让共享派生统计通过 registry 获取规则来源**

在 `lib/domain-card-derived-stats.ts` 删除具体罗德岛 import，改为：

```ts
const ruleSources = getRuleSetModule(data.ruleSetId).getDerivedStatSources(data as SheetData)
```

将当前每处 `rhodesSources` 替换为对应 `ruleSources` 字段。保留 SRD 领域卡计算主体，本轮不重写这 600 余行成熟逻辑。

- [x] **Step 5: `sheet-store` 只 import pipeline**

删除 store 中被搬出的实现，保留所有 action 及其调用方式；从 `@/lib/sheet-finalization` 导入 `finalizeSheetData` 与 `getExplicitlyClearedDerivedFields`。这是减文件职责，不是改 action API。

- [x] **Step 6: 运行核心回归测试**

```powershell
pnpm exec vitest run tests/unit/sheet-finalization.test.ts tests/unit/sheet-store-derived-stats.test.ts tests/unit/domain-card-derived-stats.test.ts tests/unit/rhodes-island-derived-stats.test.ts tests/unit/rhodes-island-automation.test.ts tests/unit/preset-equipment.test.ts
pnpm exec tsc --noEmit
```

Expected: PASS；`lib/sheet-store.ts` 不再直接出现 `rhodes-island` import。

- [x] **Step 7: 提交**

```powershell
git add lib/sheet-finalization.ts lib/sheet-store.ts lib/domain-card-derived-stats.ts tests/unit/sheet-finalization.test.ts tests/unit/sheet-store-derived-stats.test.ts
git commit -m "refactor: isolate sheet finalization pipeline"
```

---

### Task 5: 统一导出、装备和卡包策略入口

**Files:**
- Modify: `hooks/use-export-handlers.ts`
- Modify: `hooks/use-card-filtering.ts`
- Modify: `lib/preset-equipment.ts`
- Modify: `lib/ruleset-card-batches.ts`
- Modify: `lib/rulesets/types.ts`
- Modify: both `definition.ts` files
- Modify: `tests/unit/preset-equipment.test.ts`
- Modify: `tests/unit/ruleset-card-batches.test.ts`
- Modify: `tests/unit/rhodes-island-experience.test.ts`

- [x] **Step 1: 扩充定义，但只加入当前确有两个实现差异的策略**

向 `RuleSetModule` 加入：

```ts
getArmorCatalog: () => readonly ArmorItem[]
getBatchOptions: (
  batches: CardBatchOption[],
  cards: BatchCard[],
) => CardBatchOption[]
formatDomainFilterOptions: (
  values: Iterable<string>,
) => Array<{ value: string; label: string; separatorBefore?: string }>
```

`ArmorItem` 以 type-only import 从 `data/list/armor.ts` 引入；`CardBatchOption` 和 `BatchCard` 直接定义并导出在 `lib/rulesets/types.ts`。`lib/ruleset-card-batches.ts` 和两个 definition 都从这里 import，禁止让 `types.ts` 反向 import `ruleset-card-batches.ts`。

- [x] **Step 2: 写/更新失败测试**

确认：SRD 使用 `data/list/armor.ts`；罗德岛使用 `data/list/rhodes-island-armor.ts`；罗德岛只显示内置卡包；导出前只有罗德岛补齐默认种族经历。

- [x] **Step 3: 移除共享文件中的规则字符串分支**

`use-export-handlers.ts`：

```ts
const module = getRuleSetModule(formData.ruleSetId)
const exportData = module.prepareForExport(formData)
```

JSON 与 HTML 共用同一个 `exportData` 创建方式；角色码保持现状，因为 UI 能力会禁止罗德岛入口。

`resolvePresetArmor()` 从当前规则模块取得 catalog，再按名称 Map 查找。Map 在模块加载时建立，不要每次调用重新构建。

`getRuleSetBatchOptions()` 保留兼容函数名，但实现只委托 `getRuleSetModule(ruleSetId).getBatchOptions(...)`。

`use-card-filtering.ts` 删除 `ruleSetId === "rhodes-island"` 与 `getRhodesDomainFilterOptions` 的直接 import，统一调用当前 module 的 `formatDomainFilterOptions(classes)`；SRD definition 返回字母/中文自然排序后的普通选项，罗德岛 definition 委托现有 domain formatter。

- [x] **Step 4: 测试与提交**

```powershell
pnpm exec vitest run tests/unit/preset-equipment.test.ts tests/unit/rhodes-island-armor.test.ts tests/unit/ruleset-card-batches.test.ts tests/unit/rhodes-island-experience.test.ts tests/unit/rhodes-domain-filter.test.ts
pnpm exec tsc --noEmit
git add hooks/use-export-handlers.ts hooks/use-card-filtering.ts lib/preset-equipment.ts lib/ruleset-card-batches.ts lib/rulesets tests/unit
git commit -m "refactor: route ruleset policies through registry"
```

Expected: PASS，且 `hooks/use-export-handlers.ts` 不再 import 罗德岛文件。

---

### Task 6: 用稳定 action ID 替代中文文案驱动的升级逻辑

**Files:**
- Modify: `data/list/upgrade.ts`
- Modify: `components/character-sheet-page-two.tsx:164-223`
- Modify: `components/character-sheet-page-two-sections/upgrade-section.tsx`
- Create: `components/rulesets/rhodes-island-module-upgrade.tsx`
- Create: `tests/unit/upgrade-option-actions.test.ts`
- Modify: `tests/unit/upgrade-section-layout.test.tsx`

- [ ] **Step 1: 写升级配置合同测试**

测试每个 option 都有唯一 `id` 和明确 `action`；所有 `stateIndex` 在同一 tier 内唯一；罗德岛三次“提升武器原型”都使用 `action: "branch-upgrade"`；模组使用 `action: "select-module"`。测试不得断言中文文案来推导行为。

- [ ] **Step 2: 定义稳定配置类型并补齐所有现有项**

```ts
export type UpgradeAction =
  | "attribute"
  | "hp"
  | "stress"
  | "experience"
  | "domain-card"
  | "evasion"
  | "proficiency"
  | "subclass-upgrade"
  | "multiclass"
  | "branch-upgrade"
  | "select-module"

export interface UpgradeOption {
  id: string
  action: UpgradeAction
  label: string
  doubleBox: boolean
  boxCount: number
  stateIndex?: number
  domainLevelCap?: number
}
```

`id` 只用于 React key/测试/行为识别，`checkedUpgrades` 的持久化 key 继续使用现有 `tier/stateIndex/boxIndex`，从而不迁移旧存档。

- [ ] **Step 3: 将 handler 改成 `switch (option.action)`**

`handleUpgradeCheck`、`needsEditButton`、`shouldDirectlyOpenModal`、`renderEditor` 和 domain level cap 都读取结构化字段。删除以下行为判断：`label.includes("提升武器原型")`、`label.includes("所选模组")`、`label.includes("角色属性+1")` 等。

文案只用于显示和 aria-label，不再控制行为。

- [ ] **Step 4: 提取罗德岛模组选择块**

`RhodesIslandModuleUpgrade` 接收以下明确 props：

```ts
interface RhodesIslandModuleUpgradeProps {
  branchId: string | undefined
  option: UpgradeOption
  checked: boolean
  selectedModule: "x" | "y" | undefined
  onToggle: () => void
  onSelect: (module: "x" | "y") => void
}
```

组件内部可以 import 罗德岛 `getRhodesBranch`；共享 `UpgradeSection` 不再 import 罗德岛 automation/catalog。

- [ ] **Step 5: 运行升级与罗德岛 UI 回归**

```powershell
pnpm exec vitest run tests/unit/upgrade-option-actions.test.ts tests/unit/upgrade-section-layout.test.tsx tests/unit/rhodes-multiclass-modal.test.tsx tests/unit/rhodes-island-automation.test.ts
pnpm exec tsc --noEmit
```

Expected: PASS；`rg -n "label\.includes" components/character-sheet-page-two.tsx components/character-sheet-page-two-sections/upgrade-section.tsx` 不再返回规则行为判断。

- [ ] **Step 6: 提交**

```powershell
git add data/list/upgrade.ts components/character-sheet-page-two.tsx components/character-sheet-page-two-sections/upgrade-section.tsx components/rulesets/rhodes-island-module-upgrade.tsx tests/unit
git commit -m "refactor: use stable upgrade action identifiers"
```

---

### Task 7: 让页面与主 UI 使用能力/文案配置，而非散落规则判断

**Files:**
- Create: `components/layout/character-sheet-pages.ts`
- Modify: `lib/page-registry.ts`
- Modify: `app/page.tsx`
- Modify: `components/layout/bottom-dock.tsx`
- Modify: `components/layout/page-display.tsx`
- Modify: `components/ui/page-visibility-dropdown.tsx`
- Modify: `components/modals/card-selection/CardTypeSidebar.tsx`
- Modify: `components/character-sheet.tsx`
- Modify: `components/character-sheet-selection-modals.tsx`
- Modify: `components/character-sheet-page-two.tsx`
- Modify: `components/character-sheet-sections/experience-section.tsx`
- Modify: `components/character-sheet-sections/header-section.tsx`
- Modify: `components/character-sheet-sections/hope-section.tsx`
- Modify: `components/character-sheet-sections/inventory-section.tsx`
- Modify: `components/character-sheet-sections/weapon-section.tsx`
- Modify: `components/character-sheet-page-two-sections/card-deck-section.tsx`
- Modify: `components/character-sheet-page-two-sections/upgrade-section.tsx`
- Create: `tests/unit/page-registry-rulesets.test.ts`
- Modify: `tests/unit/rhodes-island-export-menu.test.tsx`
- Modify: `tests/unit/rhodes-island-home-fields.test.tsx`
- Modify: `tests/unit/rhodes-island-relationship-questions.test.tsx`
- Modify: `tests/unit/export-preview-shell.test.tsx`
- Modify: `tests/unit/character-creation-guide.test.tsx`

- [ ] **Step 1: 扩展页面定义并写失败测试**

`PageDefinition` 加入可选字段：

```ts
ruleSetIds?: readonly RuleSetId[]
```

`isPageVisible` 先检查 `ruleSetIds`，再检查现有 `always/config/data`。测试必须证明：第一页/第二页两套规则都可见；关系页只对罗德岛可见；游侠伙伴、武装表、冒险笔记只对 SRD 可见；切换规则后 tab 不保留不可见页。

- [ ] **Step 2: 搬出 `app/page.tsx:246` 的模块级页面注册数组**

`components/layout/character-sheet-pages.ts` 导出完整 `CHARACTER_SHEET_PAGES`；`app/page.tsx` 只执行一次 `registerPages(CHARACTER_SHEET_PAGES)`。关系页使用：

```ts
ruleSetIds: ["rhodes-island"],
visibility: { type: "config", configKey: "relationshipQuestions" },
```

同步把 `PageDefinition.visibility.configKey` 联合类型补上 `relationshipQuestions`，删除 `page-registry.ts` 中“罗德岛一律隐藏 config 页”的特判。

- [ ] **Step 3: 用 definition 的 capabilities/labels 替换 UI 字符串判断**

在每个顶层组件只取一次：

```ts
const ruleSet = getRuleSetModule(ruleSetId)
```

然后使用 `ruleSet.capabilities.guide`、`gmPanel`、`characterCode`、`officialImagePack`、`mixedAncestry`、`ancestryExperience`、`secondaryWeapon`、`inventoryWeapons`、`managedPrimaryWeapon`、`extendedCardTypes`、`printPreview`、`keyboardPageNavigation`，以及 `ruleSet.labels.*` 和 `ruleSet.layout.*`。其中库存行数、职业特性左右位置和隐藏的聚焦卡槽必须读取 layout；希望特性通过 `ruleSet.getProfessionHopeFeature()` 取得规则补充值，再回退到卡牌自身字段。`CharacterSheetSelectionModals` 的 `isRhodesIsland` prop 改为 `ruleSetId`，由需要规则策略的子组件查询 registry。不再由共享组件比较规则 ID。允许为 CSS 保留 `data-ruleset={ruleSet.id}`；不要为了抽象 CSS class 建立第二套主题系统。

`PageVisibilityDropdown` 改为窄 selector：

```ts
const sheetData = useSheetStore(state => state.sheetData)
const setSheetData = useSheetStore(state => state.setSheetData)
```

不要再调用无 selector 的 `useSheetStore()`。

- [ ] **Step 4: 保留合理的 per-card 判断**

`image-card.tsx`、`print-image-card.tsx`、`selectable-card.tsx` 等根据卡牌自身规则决定布局，继续使用 `getCardRuleSetId(card)` 是合理边界；不要强行让这些纯卡片组件读取当前角色规则。

- [ ] **Step 5: 运行 UI 回归与静态扫描**

```powershell
pnpm exec vitest run tests/unit/page-registry-rulesets.test.ts tests/unit/rhodes-island-export-menu.test.tsx tests/unit/rhodes-island-home-fields.test.tsx tests/unit/rhodes-island-relationship-questions.test.tsx tests/unit/export-preview-shell.test.tsx tests/unit/character-creation-guide.test.tsx
pnpm exec tsc --noEmit
rg -n "ruleSetId\s*[!=]==?\s*[\"']rhodes-island[\"']|activeRuleSetId\s*[!=]==?\s*[\"']rhodes-island[\"']" app components hooks
```

Expected: 测试 PASS；最后的 `rg` 只允许命中 per-card 布局或尚未纳入本任务的纯展示细节，不应再命中 `app/page.tsx`、底栏、页面 registry、页面设置和卡牌侧栏的功能开关。

- [ ] **Step 6: 提交**

```powershell
git add app/page.tsx components/layout components/ui/page-visibility-dropdown.tsx components/modals/card-selection/CardTypeSidebar.tsx components/character-sheet.tsx components/character-sheet-selection-modals.tsx components/character-sheet-page-two.tsx components/character-sheet-sections components/character-sheet-page-two-sections lib/page-registry.ts tests/unit
git commit -m "refactor: centralize ruleset ui capabilities"
```

---

### Task 8: 为卡牌筛选增加“规则 + 类型”内存索引

**Files:**
- Modify: `card/stores/store-types.ts:230-277,332-335`
- Modify: `card/stores/store-actions.ts` 中初始化、重建、增删卡牌逻辑
- Modify: `card/stores/unified-card-store.ts`
- Modify: `hooks/use-card-filtering.ts:121-139`
- Create: `tests/unit/ruleset-card-index.test.ts`
- Modify: `tests/unit/unified-card-store-initialization.test.ts`

- [ ] **Step 1: 写索引合同测试**

构造 SRD、罗德岛和无 ruleset 标签（按现状归 SRD）的卡牌，断言 `loadCardsByRuleSetAndType(ruleSetId, type)`：

- 不返回另一规则的卡；
- 保持原 `cardsByType` 内的顺序；
- 尊重 disabled batch 的既有行为；
- import/remove/reload 后索引同步；
- 不修改 `loadCardsByType` 的现有结果。

- [ ] **Step 2: 在 store state 增加内存索引与查询 action**

```ts
cardsByRuleSetAndType: Map<string, string[]>
loadCardsByRuleSetAndType: (
  ruleSetId: RuleSetId,
  type: CardType,
) => ExtendedStandardCard[]
```

索引 key 统一由一个 helper 生成：

```ts
export function createRuleSetTypeKey(ruleSetId: RuleSetId, type: CardType): string {
  return `${ruleSetId}:${type}`
}
```

不要把该 Map 持久化到 localStorage；它与 `cardsByType` 一样属于可重建缓存。

- [ ] **Step 3: 在统一重建入口同时生成两个索引**

遍历卡牌一次，同时写入 `cardsByType` 和 `cardsByRuleSetAndType`；ruleset 通过 `getCardRuleSetId(card)` 取得。所有增删/import 路径最终必须调用同一个重建入口，避免维护两套增量逻辑。如果当前 `_addCardToTypeMap`/`_removeCardFromTypeMap` 被外部路径使用，则让它们也同步两个 Map，并由测试覆盖。

- [ ] **Step 4: 简化 hook 热路径并收窄订阅**

`use-card-filtering.ts` 的 `baseCards` 改为调用：

```ts
useUnifiedCardStore.getState().loadCardsByRuleSetAndType(ruleSetId, targetType)
```

删除紧随其后的 `.filter(card => cardBelongsToRuleSet(...))`。保留 variant 的 `realType` 二次筛选；这是另一维数据，不要过度索引。

- [ ] **Step 5: 测试、类型检查和对照扫描**

```powershell
pnpm exec vitest run tests/unit/ruleset-card-index.test.ts tests/unit/unified-card-store-initialization.test.ts tests/unit/ruleset-card-batches.test.ts tests/unit/card-system-init-scope.test.ts tests/unit/virtualized-card-grid.test.tsx
pnpm exec tsc --noEmit
rg -n "loadCardsByType\(targetType\).*cardBelongsToRuleSet" hooks/use-card-filtering.ts
```

Expected: 测试 PASS；最后一条无匹配。不要加入基于毫秒的脆弱 benchmark。

- [ ] **Step 6: 提交**

```powershell
git add card/stores/store-types.ts card/stores/store-actions.ts card/stores/unified-card-store.ts hooks/use-card-filtering.ts tests/unit/ruleset-card-index.test.ts tests/unit/unified-card-store-initialization.test.ts
git commit -m "perf: index cards by ruleset and type"
```

---

### Task 9: 清理兼容层、补架构文档并完成全量验证

**Files:**
- Modify/Delete: `lib/ruleset.ts`（只保留确有调用方的兼容导出；无调用则删除）
- Create: `docs/architecture/rulesets.md`
- Modify: `CLAUDE.md` 的架构与测试说明

- [ ] **Step 1: 清理失效 import、重复 helper 和无调用导出**

```powershell
rg -n "rhodes-island-automation|rhodes-island-derived-stats|rhodes-island-experience|rhodes-island-card-display|rhodes-domain-filter" app card components hooks lib tests
rg -n "RULE_SET_LABELS|isRhodesIsland|getRuleSetModule" app card components hooks lib tests
```

逐项确认调用方。只删除无调用兼容导出；不要因为名字旧就批量改 public API。

- [ ] **Step 2: 写维护者文档**

`docs/architecture/rulesets.md` 必须完整说明：

- registry 和两个 definition 的职责；
- 新增规则差异时应该放在哪个 hook/capability；
- 哪些逻辑属于共享层，哪些属于规则模块；
- `SheetData` 仍是兼容性单结构，本轮为何不拆判别联合；
- finalization 的固定顺序；
- 默认值、加载、迁移、导出的数据流；
- 卡牌 ruleset/type 索引何时重建；
- 新增第三套规则时的最小检查清单；
- 明确禁止在共享 UI 中新增裸 `ruleSetId === "..."` 功能判断，per-card 布局判断除外。

- [ ] **Step 3: 运行格式和快速审查门**

先只格式化本计划涉及的 TS/TSX/Markdown 文件，不要格式化全仓库：

```powershell
$changedFiles = git diff --name-only --diff-filter=ACMR | Where-Object { $_ -match '\.(ts|tsx|md)$' }
foreach ($changedFile in $changedFiles) { pnpm exec prettier --write -- $changedFile }
pnpm exec tsc --noEmit
pnpm test:review-gates
```

Expected: 全部 PASS。若 Prettier 命令触及大量不相关文件，立即恢复那些纯格式 diff，只保留本计划文件。

- [ ] **Step 4: 运行完整测试**

Run: `pnpm test:run -- --reporter=dot`

Expected: 至少原有 68 个测试文件、357 个测试加上本计划新增测试全部 PASS；不得减少测试数。

- [ ] **Step 5: 运行生产构建并检查工作树**

```powershell
pnpm build
git status --short
git diff --stat
git diff --check
```

Expected: build 成功；`git diff --check` 无空白错误。`scripts/build-static.js` 可能更新生成文件，执行者必须检查这些 diff 是否确由源码变化引起；不得盲目提交无关构建产物。

- [ ] **Step 6: 人工验收清单（由用户启动开发服务器后执行）**

不要自动执行 `pnpm dev`。告知用户启动后检查：

1. 新建 SRD 与罗德岛角色，各自编辑后切换规则，最近活动存档恢复正确。
2. SRD 可见双种族、第二武器、备用武器、新手指引、GM 面板、角色码与官方卡图包入口。
3. 罗德岛隐藏上述 SRD-only 能力，并显示分支、独立种族经历、武器原型、模组和关系页。
4. 两套规则的卡牌选择器不会串卡，罗德岛领域分类顺序不变。
5. 升级文案显示不变；武器原型、兼职互斥、模组选择仍正常。
6. JSON/HTML/PDF 导出正常，罗德岛导出仍补默认种族经历。
7. 旧 JSON 存档可导入，localStorage 中原有角色可加载，保存后字段名不发生整体重排或丢失。
8. 打印预览页数、A4 布局、罗德岛卡片图片布局保持不变。

- [ ] **Step 7: 最终提交**

```powershell
git add docs/architecture/rulesets.md CLAUDE.md
git add -u
git commit -m "docs: document modular ruleset architecture"
```

---

## 3. 完成定义

只有同时满足以下条件才能宣布完成：

- 共享 store、导出 hook、页面 registry、卡牌筛选不再直接 import 罗德岛实现。
- 罗德岛纯规则文件集中在 `lib/rulesets/rhodes-island/`。
- 规则差异通过 registry 的 hook/capability/label 表达；没有引入通用插件框架。
- 新角色默认嵌套状态互不共享。
- 升级行为不再依赖中文文案匹配，且旧 `checkedUpgrades` key 完全兼容。
- 卡牌筛选使用 ruleset/type 索引，不在 modal 热路径重复全量规则过滤。
- TypeScript、review gates、完整 Vitest、生产 build 全部通过。
- 存档格式、规则结果、页面外观和现有用户数据兼容性没有变化。

## 4. 中止/回退条件

- 如果某一步要求改变 `ruleSetId` 值、localStorage key 或 `SheetData` 字段名，停止并单独设计迁移，不要在本计划中继续扩大范围。
- 如果 registry 开始持有 React state、Zustand store、DOM 或动态 import 生命周期，说明边界过重；回退到纯配置 + 纯函数。
- 如果 Task 8 需要同时重写卡牌持久化格式，取消该性能项；本轮只接受可重建的内存索引。
- 如果 UI 测试显示外观/导出发生变化，优先保留现状并缩小抽取范围，不以“架构更干净”为理由接受行为漂移。

## 5. 建议执行方式

按 Task 1 → 9 串行执行；Task 3 的移动必须在单独提交完成，便于 `git log --follow`；Task 4、6、8 各自都是高价值检查点，不要合并成一个大提交。每个任务先跑列出的定向测试，最后才跑全量测试和 build。

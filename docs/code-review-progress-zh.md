# 代码审查进度文档

## 1. 统计口径

- 本文档基于以下信息更新到 `2026-06-01`：
  - 已落档的两份审查报告：
    - [《面向性能的代码审查报告》](./performance-oriented-code-review-report-zh.md)
    - [《稳健性、可扩展性与基础安全代码审查报告》](./robustness-scalability-security-review-report-zh.md)
  - 当前工作区中已存在的实现改动与测试文件。
  - 本次实际执行的验证结果。
- 本文档只记录“已确认完成的整改”和“仍待处理事项”。
- “已确认完成”表示当前工作区中已经能看到对应实现，并且至少有代码级核对或实际验证结果支撑。
- “仍待处理”表示两份报告中的事项在当前工作区里尚未确认关闭，或仍存在明确剩余风险 / 覆盖缺口。
- 当前仓库存在并行改动；以下状态仅以当前工作区和本次已确认验证结果为准，不回退、也不推测未复审改动。

## 2. 已确认完成的整改

| 事项 | 对应原问题 | 当前实现 / 完成结果 | 当前验证结果 | 剩余风险 / 测试缺口 |
| --- | --- | --- | --- | --- |
| 移除主页面常驻内存诊断逻辑与相关 UI 入口 | 性能报告任务 1；稳健性报告中与诊断导出暴露面相关部分 | 当前 `app/page.tsx` 已不再引入 `memory-debug`，主页面代码中也未保留诊断导出入口；本次对 `app`、`components`、`hooks`、`lib`、`tests` 做全文检索，未再发现 `memory-debug`、`startMemoryDebugMonitor`、`diagnostic`、`诊断`、`导出报告` 等相关实现命中。 | 已完成代码核对；本次仓库搜索结果为“无命中”，可确认主页面常驻诊断逻辑及其 UI 入口已移除。 | 暂未补充专门的回归测试；当前结论主要来自代码检索与实现复核。 |
| 自动保存与 UI 状态变化解耦，并统一走角色持久化入口 | 性能报告任务 2；稳健性报告任务 3 | `app/page.tsx` 中自动保存 effect 现在仅依赖 `currentCharacterId`、`formData`、`isLoading` 和 `persistCharacterData`，不再把 `currentTabValue`、`isTextMode`、`isDualPageMode` 这类纯 UI 状态作为保存触发条件。`hooks/use-character-management.ts` 新增 `persistCharacterData()`，统一透传到 `saveCharacterById()`，不再直接旁路写底层 `localStorage` key。 | 已执行相关单测：`tests/unit/use-character-management.test.tsx` 通过，确认自动保存走共享存储入口，且不会因该封装额外触发 hook 重渲染。 | 目前验证集中在持久化入口与依赖收敛；尚未补充真实大文本输入或浏览器性能基准，仍缺少“输入延迟 / 写入频率”层面的自动化验证。 |
| 去除角色读取路径中的副作用写入，并避免 modal render 阶段走完整读取 | 性能报告任务 4 | `lib/multi-character-storage.ts` 中 `loadCharacterById()` 现在会先比较迁移前后的稳定序列化结果，仅在迁移真实改写数据时才调用 `saveCharacterById()`；同时新增 `loadCharacterDisplayNameById()` 供轻量读取。`components/modals/character-management-modal.tsx` 已改为在 `useEffect` 中批量读取展示名，render 阶段不再对每个存档调用完整 `loadCharacterById()`。 | 已执行相关单测：`tests/unit/multi-character-storage.test.ts` 通过，确认当数据已经稳定后再次读取不会重写持久化数据；`tests/unit/character-management-modal.test.tsx` 通过，确认 modal 渲染展示名时不会调用完整 loader。 | 读取旧格式存档时，首次迁移仍会发生一次受控写回，这是设计内行为而非遗留副作用；当前尚未补充“多存档场景下打开 modal”的性能回归基准。 |
| 收窄本地重置功能的 `localStorage` 清理边界 | 稳健性报告任务 4 | `app/card-manager/page.tsx` 已移除 `localStorage.clear()`；当前实现改为 `clearProjectLocalStorage()`，按项目自有键清理：角色存储键来自 `getAllCharacterStorageKeys()`，其余键来自显式白名单 `PROJECT_LOCAL_STORAGE_KEYS`，并继续保留 `resetSystem()` 负责卡牌系统数据清理。 | 已完成代码核对；本次复查确认相关路径已不再调用 `localStorage.clear()`。 | 当前未见专门单测。`PROJECT_LOCAL_STORAGE_KEYS` 仍是显式白名单，未来如果新增项目自有本地键但未同步补充，存在白名单漂移风险。 |
| 为主页面低频功能做动态导入 / 代码分割 | 性能报告任务 3 | `app/page.tsx` 现在把 `AnnouncementModal`、`CharacterCreationGuide`、`CharacterManagementModal`、`CharacterCodeExportModal`、`SealDiceExportModal`、`FloatingNotebook` 改成了 `next/dynamic` 懒加载，并且只在对应打开状态下才渲染；`hooks/use-export-handlers.ts` 也把 `@/card` 与 `@/lib/html-exporter` 下沉到真正执行打印 / HTML 导出时再动态加载。 | 已执行相关单测：`tests/unit/character-code-export-modal.test.tsx` 通过；并用全量 `tsc --noEmit` 复核，本轮未新增这两处文件的类型错误。 | 当前还没有新的 bundle 体积或 hydration 对比基准；`PrintProvider`、`PrintReadyChecker`、`PrintPageRenderer` 等打印链路仍保留在页面文件中，只是继续受 `isPrintingAll` 分支门控。 |
| 收紧文本到 HTML 的信任边界 | 稳健性报告任务 1 | `components/ui/card-markdown.tsx` 已移除外部 `rehypePlugins` 注入口，显式启用 `skipHtml` 并对白名单 URL 协议做收敛；`components/character-sheet-sections/profession-description-section.tsx` 不再走 `rehypeRaw`，而是通过 `lib/md-component.ts` 的受控分段与 token 渲染支持 `[center]` / `[input]` / `[box]` / `[checkbox]`；`components/guide/character-creation-guide.tsx` 也已移除 `dangerouslySetInnerHTML`，改由 `CardMarkdown` 渲染经 `guide-content.ts` 规范化后的内容。 | 已执行相关单测：`tests/unit/card-markdown.test.tsx`、`tests/unit/profession-description-section.test.tsx`、`tests/unit/character-creation-guide.test.tsx` 全部通过，覆盖原始 HTML、事件属性、`javascript:` 链接和自定义语法渲染。 | 当前策略是“剥离 / 忽略原始 HTML”，而不是支持富 HTML 白名单；如果未来要重新支持 HTML 标签，需要单独设计 allowlist sanitizer。 |
| 将卡包编辑器导入改为事务式替换 | 稳健性报告任务 2 | `app/card-editor/utils/import-export.ts` 中 JSON 导入不再在解析前清空旧图；`app/card-editor/utils/zip-import.ts` 改为先把 ZIP 内图片暂存到内存、完整处理 `cards.json` 后再统一提交；`app/card-editor/utils/image-db-helpers.ts` 新增 `replaceAllEditorImages()`，在单个 IndexedDB transaction 中执行“清空旧图 + 写入新图”。 | 已执行相关单测：`tests/unit/card-package-import-transaction.test.ts` 通过，覆盖 JSON 成功后才替换、JSON 失败不替换、ZIP 成功后才提交、ZIP 失败不替换。 | 当前“事务式”覆盖的是编辑器图片库替换；`CardPackageState` 的最终写入仍由 store 层紧接着完成，因此还不是跨 IndexedDB 与页面状态的单一原子提交。 |
| 收缩卡牌系统初始化作用域 | 性能报告任务 5 | `CardSystemInitializer` 已从全局 [app/layout.tsx](./../app/layout.tsx) 移除，并下沉到 [app/page.tsx](./../app/page.tsx) 首页路由内；`/card-manager` 仍保留自身的显式 `initializeSystem()` 路径，因此本轮把全站初始化成本收缩到了真正使用角色表的入口。 | 新增 `tests/unit/card-system-init-scope.test.ts` 并通过，直接校验根布局不再引用 `CardSystemInitializer`、首页保留路由内初始化、`/card-manager` 继续保留页面内初始化；本轮 `corepack pnpm build` 也通过，确认静态构建未被该调整破坏。 | 当前仍缺少 `/gm-panel`、`/card-editor` 冷启动 trace 或 bundle / hydration 基准，因此“作用域已收缩”已确认，但“收益量化”仍待后续性能基准补齐。 |
| 执行 verify-first 的依赖 / 死代码 / 调试产物清理 | 性能报告任务 6 | 在首轮低风险清理基础上，本轮继续删除已确认无消费者的直接依赖 `console`、`domain`、`rehype-raw`，同步更新 `pnpm-lock.yaml`；同时去除 `.gitignore` 中重复的 `docs/code-review-progress-zh.md` 规则，保留现有 `.next-dev*.log` 与 `.playwright-mcp/` 忽略项。 | 已执行全文检索，当前工作区未发现上述三个依赖的直接 import / require 命中；`corepack pnpm build` 与 `corepack pnpm exec tsc --noEmit` 均通过，说明本轮依赖收敛未破坏构建和类型校验。 | 当前 verify-first 仍主要依赖人工检索与现有测试兜底，尚未引入通用 unused-deps 自动审计；后续若继续清理依赖，仍建议逐项验证而不是批量裁剪。 |
| 为高风险存储、导入、渲染链路补回归测试并收紧门禁 | 稳健性报告任务 5 | 本轮新增 `tests/unit/card-system-init-scope.test.ts`，并把高风险链路的核心回归测试固化为 `test:review-gates` 脚本；[.github/workflows/nextjs.yml](./../.github/workflows/nextjs.yml) 现已在构建前先执行 `pnpm test:review-gates`，将存储、导入、渲染与初始化作用域相关风险纳入显式 CI 阻断路径。 | `corepack pnpm test:review-gates` 通过，覆盖 `tests/unit/multi-character-storage.test.ts`、`tests/unit/use-character-management.test.tsx`、`tests/unit/card-markdown.test.tsx`、`tests/unit/profession-description-section.test.tsx`、`tests/unit/character-creation-guide.test.tsx`、`tests/unit/card-package-import-transaction.test.ts` 与 `tests/unit/card-system-init-scope.test.ts` 共 `13` 个测试；相关脚本已接入工作流。 | 当前门禁策略更偏“关键链路显式阻断”，而不是全仓覆盖率阈值治理；如果后续希望把标准再收紧，下一步更适合在现有 gate 基础上补 coverage threshold 或更细粒度的分层测试矩阵。 |

## 3. 仍待处理事项

| 事项 | 主要来源 | 当前状态 | 说明 |
| --- | --- | --- | --- |
| 当前无仍待处理事项 | 性能报告任务 5、6；稳健性报告任务 5 | `已关单` | 截至 `2026-06-01`，进度文档中此前列出的三项待办已完成实现、验证与文档回填；后续若继续推进，将更多是性能量化、覆盖率治理或无关既有失败用例的单独治理。 |

## 4. 当前验证结果

- `2026-06-01` 已执行并通过的关键回归与门禁验证：
  - `corepack pnpm test:review-gates`
    - 覆盖 `tests/unit/card-system-init-scope.test.ts`
    - `tests/unit/multi-character-storage.test.ts`
    - `tests/unit/use-character-management.test.tsx`
    - `tests/unit/card-markdown.test.tsx`
    - `tests/unit/profession-description-section.test.tsx`
    - `tests/unit/character-creation-guide.test.tsx`
    - `tests/unit/card-package-import-transaction.test.ts`
  - 上述 review-gate 共 `7` 个测试文件、`13` 个测试，本次执行结果均为通过。
  - `corepack pnpm exec tsc --noEmit`
  - `corepack pnpm build`
- `2026-06-01` 执行全量 `corepack pnpm test:run` 未完全通过；当前剩余失败集中在既有测试文件 `tests/unit/level-proficiency.test.ts` 中的 `2` 个断言，均与本轮三项待办无直接关联：
  - “空等级不应触发伤害阈值计算”
  - “空护甲阈值不应计算伤害阈值”

## 5. 当前剩余风险与测试缺口

- 自动保存相关整改已经有单测覆盖入口统一与避免额外重渲染，但还没有覆盖真实浏览器里的长文本输入、长任务数量和 `localStorage` 写入频率。
- 角色读取路径整改已经验证“稳定数据不会重复写回”和“modal render 不再触发完整读取”，但还缺少多存档、大 payload 场景下的性能回归基准。
- `card-manager` 的本地清理边界已从“整站清空”收敛到“项目自有键白名单”，但白名单后续仍需要维护；若新增项目本地键而未补入 `PROJECT_LOCAL_STORAGE_KEYS`，可能出现漏清理。
- 首页低频功能已经完成首轮懒加载和条件渲染收敛，但仍缺少 bundle 体积、parse/execute 时间和 hydration 时间的前后对比基准。
- 文本渲染链已经默认剥离原始 HTML，但如果未来确实需要支持更多富文本标签，仍需单独设计 allowlist sanitizer，而不能重新打开 `rehypeRaw` / `dangerouslySetInnerHTML`。
- 编辑器导入链已经避免“先清后验”的图片丢失窗口，但 `CardPackageState` 与 IndexedDB 图片集仍不是单事务跨层提交；若未来导入流程继续扩展，仍建议维持“先暂存、后提交”的边界。
- 卡牌系统初始化作用域已经按最小方案收缩到首页路由，但还没有补 `/gm-panel`、`/card-editor` 冷启动 trace，因此当前更像“结构性整改已完成、收益量化待补”的状态。
- verify-first 已完成当前文档点名候选的第二轮清理，但项目仍缺少自动 unused-deps 审计；未来如果新增依赖层清理，建议继续沿用“先检索 / 再删包 / 再跑构建”的 verify-first 流程。
- 高风险链路现在已有显式 `test:review-gates` CI 阻断，但尚未建立覆盖率阈值或更完整的分层测试矩阵。
- 当前 `corepack pnpm test:run` 仍被 `tests/unit/level-proficiency.test.ts` 的 `2` 个既有失败阻塞，因此虽然本轮 gate、类型检查与构建已通过，仓库层面的“全量单测绿灯”仍未完全恢复。

## 6. 当前结论

- 截至 `2026-06-01`，以下整改已可确认完成并已写入当前工作区实现：
  - 移除主页面常驻内存诊断逻辑与相关 UI 入口。
  - 自动保存与 UI 状态变化解耦，并统一走角色持久化入口。
  - 去除角色读取路径中的副作用写入，包括 modal render 阶段不再走完整读取。
  - 收窄本地重置功能的 `localStorage` 清理边界。
  - 为主页面低频功能做首轮动态导入 / 条件渲染收敛。
  - 收紧文本到 HTML 的信任边界。
  - 将卡包编辑器导入改为事务式替换，避免失败时先清空旧图片。
  - 收缩卡牌系统初始化作用域，把全局初始化下沉到首页路由。
  - 完成 verify-first 的第二轮依赖清理（移除无消费者直接依赖并整理忽略规则）。
  - 为高风险存储、导入、渲染链路补齐 review-gate，并接入 GitHub Actions 构建前阻断。
- 当前进度文档中原有三项待办已全部关单；本轮剩余需要后续单独跟踪的，主要是性能量化基准、覆盖率治理，以及与本轮整改无直接关联的 `level-proficiency` 既有失败用例。

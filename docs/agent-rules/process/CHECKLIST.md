# 提交流程 Checklist

> 本清单分两类：**自动项**只要求"跑命令、看退出码"，不要求人逐条打勾；
> **人工项**是脚本判不了的（教学有效性、文案口味、视觉美感），必须人看。
> 铁律与规范的权威定义见 `.trae/rules/project_rules.md`。

---

## 一、自动项（跑命令即可，不看代码也应全绿）

### 0. 一条命令跑完

```bash
npm run check        # build → 全量单测 → 架构守卫 → 分段器折行 → 中屏压字（约 8 分钟）
npm run check:all    # 以上 + 依赖安全审计（audit:deps）
```

`npm run check` 里 `check:seg-wrap` / `check:text-overlap` 会自起 `vite preview` 读 `dist/`，
**必须先 build**（脚本自身有前置检查，缺 `dist/` 直接以退出码 2 报出）。
只需快速回环时用 `npm run check:architecture`（约 20s，纯静态）。

### 1. 自动守卫与规范的对应关系

| 守卫 | 判定什么 | 对应规范 |
|------|---------|---------|
| `npx tsc --noEmit` | `src/` 严格类型（`strict` + `noUnusedLocals`） | 铁律 2、3 |
| `npx tsc -p tsconfig.test.json --noEmit` | `tests/` + `e2e/` 类型（主 tsconfig 不含它们） | 同上 |
| `npx eslint . --max-warnings 0` | 硬编码颜色（`src/theme/` 与测试除外，全域覆盖）、`physics/` 禁 React/DOM、未用变量与 disable 指令 | 铁律 1-1、2 |
| `check:single-source` | 动画在算 + 右屏看板又算一遍的双实现 | 物理事实单一真源 |
| `check:naming` | 同基名双后缀 / `foo.ts` + `foo/index.ts` / 仅大小写不同的同名 | ARCHITECTURE §10 |
| `check:font-size` | 字号必须走 `font()`/`canvasSize.font` | 铁律 1-7 |
| `check:viewport-legacy` | 不得再用 `visibleArea`/`centerScale` 等废弃缩放模式 | 铁律 1-3 |
| `check:large-files` | 单文件行数上限与白名单 | ARCHITECTURE §12.1 |
| `check:no-raf` | 禁止裸 `requestAnimationFrame` | 铁律 1-4 |
| `check:no-marker` | 禁止手写 `<marker>` 箭头 | 铁律 1-5 |
| `check:component-reuse` | 公共组件已导出/注册、无重复私有实现 | 铁律 5 |
| `check:quantity-labels` | 右屏物理量 label 与 symbol 自洽 | 右屏规范 |
| `check:control-meta` | 左屏声明式协议、预设字数、tip 边界、分段器宽度 | 铁律 6、`08_THREE_PANEL_RULES.md §2.6` |
| `check:formula-condition` | 守恒/定律类公式必须声明适用条件 | 右屏规范 |
| `check:seg-wrap` | 分段器选项贴边折行（真实 DOM 测高，双视口） | `08_THREE_PANEL_RULES.md §2.6.6` |
| `check:text-overlap` | 中屏 SVG 标注互相压字 / 文字被裁（字符级，双视口） | `07_CANVAS_SVG_CHART_RULES.md §4` |
| `audit:deps` | 依赖安全（`npm audit --audit-level=moderate`） | ARCHITECTURE §11 |

> 上表任一失败即 **不得提交**；修脚本还是修代码由失败原因决定，**不要**用
> `--no-verify`、`// eslint-disable`、或往基线文件里塞条目来绕过。基线只允许"存量与新增分离"的临时用途，
> 且必须在同一周期内清完（参见 `check-text-overlap.mjs` 头注释里"别让它长期挂账"的教训）。

### 1.1 本地 pre-commit 与 CI 的集合差异（有意为之，不是漏配）

| 检查 | pre-commit（`lefthook.yml`） | CI（`.github/workflows/ci.yml`） | 差异理由 |
|------|------------------------------|----------------------------------|----------|
| `eslint` / `tsc --noEmit` / `tsc -p tsconfig.test.json` / `vitest --run` / `check:architecture` | ✅ | ✅ | 一一对应，两边同口径 |
| `test:coverage`（80/80/70 门槛） | ❌ | ✅ | 覆盖率门槛只在对全量跑时才有意义，提交时跑会拖到 1 分钟以上 |
| `build` | ❌ | ✅ | 构建约 30s，且 `tsc -b` 已被 `tsc --noEmit` 覆盖大半 |
| `check:seg-wrap` / `check:text-overlap` | ❌ | ✅ | 需 `dist/` + Playwright 真机，约 8 分钟，只适合 CI（本地要跑用 `npm run check`） |

结论：本地漏网的只可能是"覆盖率不足""构建期才暴露的问题""真实 DOM 折行/压字"三类，
其余在提交时即拦截；**不要**为了对齐把这四项塞进 pre-commit。

### 2. 脚本覆盖不到的提交纪律

- [ ] 新增动画的 5 处注册齐全：`data/registries/<domain>.ts`（含 `paramMeta`/`controlMeta`/`defaultParams as const`）、
      `data/quantities/<domain>/<topic>.ts`、`data/physicsQuantities.ts`、`data/knowledgeTree.ts`、
      以及跑 `node scripts/gen-annotations.mjs` 刷新 `src/ANNOTATIONS.md` 与 `MEMORY.md`
- [ ] 物理计算只写在 `src/physics/`（或 `model/`），看板与场景 import 同一实现，不各算一遍
- [ ] 新增依赖已在 `PROCESS_LOG.md` 申报，并同步 `ARCHITECTURE_RULES.md §11.1` 依赖清单
- [ ] `PROCESS_LOG.md` 与当月 `logs/YYYY-MM.md` 已记录

---

## 二、人工项（脚本判不了，必须人看）

### 教学有效性（最重要，无法自动化）

- [ ] 动画演的是**真实物理过程**，不是"看起来像"的近似；简化处已在文案里标注
- [ ] 右屏数值与学生手算同量级、同符号；关键时刻（临界/守恒/极值）能对上画面
- [ ] 参数调到边界（0、极大、极小、反向）时画面与数值都不崩、教学含义仍成立
- [ ] 公式区写的是**适用条件**，不是把结论直接喂给学生

### 三屏内容分配

- [ ] 左屏只放参数与模式，无长题解、无公式推导、无考点总结
- [ ] 中屏只放物理量数值标注与坐标轴标签，无教学解释段落
- [ ] 右屏只放物理量/公式/考点，无动画控制控件

### 文案口味

- [ ] 预设标签「名称 ≤12 字 + 参数标注 ≤14 字」，不出现"高考/真题/压轴/第 N 章"等卷别词
- [ ] 观察指引只答"看哪里、怎么调"，不答"结果是多少"
- [ ] 术语与教材一致（如"支持力"而非"支撑力"、"电动势"而非"电势差"）

### 视觉

- [ ] 颜色语义正确：物理量用 `PHYSICS_COLORS`、器材用 `SCENE_COLORS`、图表用 `CHART_COLORS`
- [ ] 标注不贴边、不压曲线、不重叠（真机脚本已兜底，仍需人确认"读起来顺"）
- [ ] 1440 / 1280 / 窄屏下布局都不跳变

### 特殊场景

- [ ] AnalysisPage：同时展开步骤 ≤ 2，URL hash 状态可复原
- [ ] WrongPage：IndexedDB 读写经 `useWrongStore`，不直接碰数据库
- [ ] 路由：仅 `HashRouter`，刷新后状态保持

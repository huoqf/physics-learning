# AGENT.md — 通用 AI Agent 入口（索引，不含独立规则）

> **面向 Trae / WorkBuddy / 通用 AI Agent 的执行入口，只做索引与环境说明。**
> **唯一铁律源**：[`.trae/rules/project_rules.md`](.trae/rules/project_rules.md)；架构细则：[`docs/agent-rules/core/ARCHITECTURE_RULES.md`](docs/agent-rules/core/ARCHITECTURE_RULES.md)。
> 非 Trae 客户端不会自动加载 `.trae/rules/project_rules.md`，**首次进入任务务必先读该文件**。
> **开发环境**：若全局 `node` 不可用，Windows 下可将便携版 `D:\node-v24` 加入 `PATH`。

---

## 📐 代码检索与记忆同步策略

### 动画映射表

查询动画相关代码时，**优先使用 [`MEMORY.md`](MEMORY.md) 中的动画映射表**（由 `node scripts/gen-annotations.mjs` 自动生成，准确反映 registry → entry → scene → physics → centerExtra 的 `lazy` 调用链）。

---

## 🚀 规范按需加载索引

> **文档优先级**：`.trae/rules/project_rules.md` > `ARCHITECTURE_RULES.md` > `02_UI_RULES.md` > `03~08`

| 触发条件 | 读取文档 |
|---------|---------|
| 全局铁律、违禁速查、preset 与提交守卫 | [`.trae/rules/project_rules.md`](.trae/rules/project_rules.md)（必读） |
| 架构分层、纯函数、Store、数据层、`controlsMode` | [`docs/agent-rules/core/ARCHITECTURE_RULES.md`](docs/agent-rules/core/ARCHITECTURE_RULES.md) |
| UI 视觉、颜色语义、Tailwind 字号类、barrel import | [`docs/agent-rules/ui/02_UI_RULES.md`](docs/agent-rules/ui/02_UI_RULES.md) |
| 过渡动效 / easing | [`docs/agent-rules/ui/03_MOTION_RULES.md`](docs/agent-rules/ui/03_MOTION_RULES.md) |
| 真题解析页 / 错题本 / 跨页导航 | `docs/agent-rules/ui/04_*` · `05_*` · `06_*` |
| Canvas/SVG/图表布局、分区方向（`splitH`/`splitV`） | [`docs/agent-rules/ui/07_CANVAS_SVG_CHART_RULES.md`](docs/agent-rules/ui/07_CANVAS_SVG_CHART_RULES.md) |
| 左屏控件、右屏看板、`CenterExtra`、防压字口径 | [`docs/agent-rules/ui/08_THREE_PANEL_RULES.md`](docs/agent-rules/ui/08_THREE_PANEL_RULES.md) |
| 公共组件 API 与最小调用 | [`docs/agent-rules/ui/COMPONENT_REGISTRY.md`](docs/agent-rules/ui/COMPONENT_REGISTRY.md) |
| 动画入口→场景→物理映射 | [`MEMORY.md`](MEMORY.md) |
| 延后待办 / 提交验收 | [`TODO_deferred.md`](docs/agent-rules/process/TODO_deferred.md) · [`CHECKLIST.md`](docs/agent-rules/process/CHECKLIST.md) |

---

*最后更新：2026-11-27 | 唯一铁律源为 `.trae/rules/project_rules.md`，本文件仅作入口与按需索引*

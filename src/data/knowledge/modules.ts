/**
 * 学科模块元数据 —— 「模块 → 中文名 → 展示顺序」的**唯一真源**。
 *
 * 背景：KnowledgeNode 一直带有 `module` 字段，但知识树 UI 只按 `chapter` 平铺，
 *      `module` 仅被错题筛选（utils/moduleHelpers）使用，导致「学科分组」这一
 *      高中物理最关键的整体记忆维度在界面上完全缺失；同时模块中文名表长期不全
 *      （缺 wave-optics / vibration / nuclear / modern-physics / experiment，
 *      还残留一个数据中不存在的 'atomic'），错题按模块筛选会漏掉这些模块。
 *
 * 因此把模块清单收敛到本文件：
 *   - 新增模块 → 只改 MODULE_META 一处（标签、顺序、筛选 chip 全部自动跟随）；
 *   - 数据层（buildKnowledgeTree）与 UI 层（moduleHelpers / KnowledgeTree）共用同一份。
 *
 * 顺序遵循人教版教学推进顺序：力学 → 振动与波 → 电磁学 → 热学 → 几何光学
 * → 波动光学 → 近代物理 → 核物理 → 实验专题。
 */
export interface ModuleMeta {
  /** 与 KnowledgeNode.module 取值一致 */
  id: string
  /** 面向学生的中文名 */
  label: string
  /** 展示顺序（升序） */
  order: number
}

export const MODULE_META: ModuleMeta[] = [
  { id: 'mechanics', label: '力学', order: 1 },
  { id: 'vibration', label: '机械振动与波', order: 2 },
  { id: 'electricity', label: '电磁学', order: 3 },
  { id: 'thermodynamics', label: '热学', order: 4 },
  { id: 'optics', label: '几何光学', order: 5 },
  { id: 'wave-optics', label: '波动光学', order: 6 },
  { id: 'modern-physics', label: '近代物理', order: 7 },
  { id: 'nuclear', label: '核物理', order: 8 },
  { id: 'experiment', label: '实验专题', order: 9 },
]

/** 模块 id → 中文名（缺省回退为 id 本身） */
export const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  MODULE_META.map((m) => [m.id, m.label]),
)

/** 模块展示顺序（id 数组） */
export const MODULE_ORDER: string[] = MODULE_META.map((m) => m.id)

/** 未登记模块排在最后，避免与已登记模块混排 */
export const UNKNOWN_MODULE_RANK = 999

/** 取模块排序权重；未登记模块返回 UNKNOWN_MODULE_RANK */
export function moduleRank(moduleId: string): number {
  const meta = MODULE_META.find((m) => m.id === moduleId)
  return meta ? meta.order : UNKNOWN_MODULE_RANK
}

/** 取模块中文名；未登记模块回退为 id */
export function moduleLabel(moduleId: string): string {
  return MODULE_LABELS[moduleId] ?? moduleId
}

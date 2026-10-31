import { getKnowledgeNode } from '@/data/knowledgeTree'

/**
 * 模块 id → 中文名的真源在 `src/data/knowledge/modules.ts`（MODULE_META）。
 * 本文件不再转发该表：它会引入非字面量导出，触发 react-refresh/only-export-components，
 * 使 `lint --max-warnings 0` 失败。需要模块名请直接 `import { MODULE_LABELS } from '@/data/knowledge/modules'`。
 */
export function moduleOf(knowledgeIds: string[]): string {
  const node = knowledgeIds.map((k) => getKnowledgeNode(k)).find(Boolean)
  return node?.module ?? knowledgeIds[0]?.split('-')[0] ?? 'other'
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDateShort(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export function chip(active: boolean, label: string, onClick: () => void, key?: string) {
  return (
    <button
      key={key ?? label}
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm transition-colors active:scale-[0.97] ${
        active
          ? 'bg-primary-600 text-white'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
      }`}
    >
      {label}
    </button>
  )
}

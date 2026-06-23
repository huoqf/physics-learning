import { getKnowledgeNode } from '@/data/knowledgeTree'

export const MODULE_LABELS: Record<string, string> = {
  mechanics: '力学',
  electricity: '电磁学',
  thermodynamics: '热学',
  optics: '光学',
  atomic: '原子物理',
}

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

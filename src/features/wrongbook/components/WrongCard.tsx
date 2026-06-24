import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, CheckCircle2, StickyNote } from 'lucide-react'
import { getProblemById } from '@/data/problems'
import { getKnowledgeNode } from '@/data/knowledgeTree'
import { colors } from '@/theme/colors'
import { formatDateShort } from '@/utils/moduleHelpers'
import { STATUS_META } from '../constants/statusMeta'
import type { WrongRecord } from '@/stores'

interface WrongCardProps {
  record: WrongRecord
  menuFor: string | null
  onToggleMenu: (problemId: string) => void
  onMarkMastered: (problemId: string) => void
  onEditNote: (problemId: string, note: string) => void
  onDelete: (problemId: string) => void
}

export const WrongCard = React.memo(function WrongCard({
  record,
  menuFor,
  onToggleMenu,
  onMarkMastered,
  onEditNote,
  onDelete,
}: WrongCardProps) {
  const navigate = useNavigate()
  const r = record
  const problem = getProblemById(r.problemId)
  const meta = STATUS_META[r.status]
  const manyErrors = r.errorCount >= 3
  const summary = problem
    ? problem.content.replace(/\$\$?/g, '').replace(/\\n/g, ' ').slice(0, 60)
    : ''
  const knowledgeTags = r.knowledgeIds
    .map((k) => getKnowledgeNode(k)?.title)
    .filter(Boolean) as string[]

  return (
    <div
      className="relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderLeft: `4px solid ${manyErrors ? colors.danger[700] : meta.color}` }}
      onContextMenu={(e) => { e.preventDefault(); onToggleMenu(r.problemId) }}
    >
      {manyErrors && (
        <span
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full text-white text-xs font-bold"
          style={{ backgroundColor: colors.danger[700] }}
        >
          {r.errorCount}
        </span>
      )}
      <button onClick={() => navigate(`/analysis/${r.problemId}`)} className="text-left w-full p-5 active:scale-[0.99]">
        <div className="flex items-center gap-2 mb-2 flex-wrap pr-6">
          {problem && (
            <>
              <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700">{problem.year}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">{problem.province}</span>
              <span className="text-xs" style={{ color: colors.accent[400] }}>{'★'.repeat(problem.difficulty)}</span>
            </>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <h3 className="font-semibold text-neutral-800 mb-1">{problem?.title ?? r.problemId}</h3>
        {summary && <p className="text-sm text-neutral-500 mb-2 line-clamp-2">{summary}…</p>}
        {knowledgeTags.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {knowledgeTags.slice(0, 2).map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-500">{t}</span>
            ))}
            {knowledgeTags.length > 2 && <span className="text-xs text-neutral-400">+{knowledgeTags.length - 2}</span>}
          </div>
        )}
        <div className="border-t border-neutral-100 pt-2 text-xs text-neutral-500 flex items-center justify-between">
          <span>最近作答：{formatDateShort(r.lastAttemptTime)}</span>
          <span>错 {r.errorCount} 次</span>
        </div>
        {r.note && <p className="mt-2 text-xs text-neutral-600 bg-warning-50 rounded px-2 py-1 line-clamp-2">📝 {r.note}</p>}
      </button>

      {menuFor === r.problemId && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => onToggleMenu(r.problemId)} />
          <div className="absolute top-10 right-3 z-30 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 w-36 text-sm">
            {r.status !== 'mastered' && (
              <button onClick={() => { onMarkMastered(r.problemId); onToggleMenu(r.problemId) }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-success-600">
                <CheckCircle2 className="w-4 h-4" /> 标记已掌握
              </button>
            )}
            <button onClick={() => { onEditNote(r.problemId, r.note ?? ''); onToggleMenu(r.problemId) }}
              className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700">
              <StickyNote className="w-4 h-4" /> {r.note ? '编辑笔记' : '添加笔记'}
            </button>
            <button onClick={() => { onDelete(r.problemId); onToggleMenu(r.problemId) }}
              className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-danger-600">
              <Trash2 className="w-4 h-4" /> 删除
            </button>
          </div>
        </>
      )}
    </div>
  )
})
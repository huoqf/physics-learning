import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpenCheck, Trash2, X, StickyNote, CheckCircle2 } from 'lucide-react'
import { useWrongStore, type WrongRecord, type WrongStatus } from '@/stores'
import { NOTE_MAX_LENGTH } from '@/stores/useWrongStore'
import { getProblemById } from '@/data/problems'
import { getKnowledgeNode } from '@/data/knowledgeTree'
import { colors } from '@/theme/colors'

// ---- 常量映射 ----
const MODULE_LABELS: Record<string, string> = {
  mechanics: '力学',
  electricity: '电磁学',
  thermodynamics: '热学',
  optics: '光学',
  atomic: '原子物理',
}

const STATUS_META: Record<WrongStatus, { label: string; color: string }> = {
  new: { label: '未复习', color: colors.danger[500] },
  viewed: { label: '已查看', color: colors.warning[500] },
  retrying: { label: '重练中', color: colors.primary[500] },
  mastered: { label: '已掌握', color: colors.success[500] },
}

type SortKey = 'recent' | 'errors' | 'difficulty'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function moduleOf(knowledgeIds: string[]): string {
  const node = knowledgeIds.map((k) => getKnowledgeNode(k)).find(Boolean)
  return node?.module ?? knowledgeIds[0]?.split('-')[0] ?? 'other'
}

function isThisWeek(ts: number): boolean {
  return Date.now() - ts <= 7 * 24 * 60 * 60 * 1000
}

export default function WrongPage() {
  const navigate = useNavigate()
  const records = useWrongStore((s) => s.records)
  const hydrate = useWrongStore((s) => s.hydrate)
  const markMastered = useWrongStore((s) => s.markMastered)
  const addNote = useWrongStore((s) => s.addNote)
  const removeWrong = useWrongStore((s) => s.removeWrong)
  const clearAll = useWrongStore((s) => s.clearAll)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // ---- 筛选 / 排序状态 ----
  const [moduleFilter, setModuleFilter] = useState<Set<string>>(new Set())
  const [difficultyFilter, setDifficultyFilter] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<Set<WrongStatus>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [showMastered, setShowMastered] = useState(false)

  // ---- 弹窗状态 ----
  const [confirmDelete, setConfirmDelete] = useState<string | 'all' | null>(null)
  const [noteEditing, setNoteEditing] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  // ---- 统计面板 ----
  const stats = useMemo(() => {
    const total = records.length
    const notMastered = records.filter((r) => r.status !== 'mastered').length
    const newThisWeek = records.filter((r) => isThisWeek(r.createdAt)).length
    const masteredThisWeek = records.filter(
      (r) => r.status === 'mastered' && r.masteredAt && isThisWeek(r.masteredAt)
    ).length
    return { total, notMastered, newThisWeek, masteredThisWeek }
  }, [records])

  // ---- 应用筛选 + 排序 ----
  const filtered = useMemo(() => {
    let list = records.filter((r) => {
      if (moduleFilter.size > 0 && !moduleFilter.has(moduleOf(r.knowledgeIds))) return false
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false
      if (difficultyFilter.size > 0) {
        const d = getProblemById(r.problemId)?.difficulty
        if (d === undefined || !difficultyFilter.has(d)) return false
      }
      return true
    })

    const diffOf = (r: WrongRecord) => getProblemById(r.problemId)?.difficulty ?? 0
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'errors':
          return b.errorCount - a.errorCount
        case 'difficulty':
          return diffOf(b) - diffOf(a)
        case 'recent':
        default:
          return b.lastAttemptTime - a.lastAttemptTime
      }
    })
    return list
  }, [records, moduleFilter, difficultyFilter, statusFilter, sortKey])

  // 已掌握折叠到底部
  const activeRecords = filtered.filter((r) => r.status !== 'mastered')
  const masteredRecords = filtered.filter((r) => r.status === 'mastered')

  // ---- 渲染：错题卡片 ----
  const renderCard = (r: WrongRecord) => {
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
        key={r.problemId}
        className="relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        style={{ borderLeft: `4px solid ${manyErrors ? colors.danger[700] : meta.color}` }}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuFor(menuFor === r.problemId ? null : r.problemId)
        }}
      >
        {/* 多次错误角标 */}
        {manyErrors && (
          <span
            className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full text-white text-xs font-bold"
            style={{ backgroundColor: colors.danger[700] }}
          >
            {r.errorCount}
          </span>
        )}

        <button
          onClick={() => navigate(`/analysis/${r.problemId}`)}
          className="text-left w-full p-5 active:scale-[0.99]"
        >
          {/* 标签行 */}
          <div className="flex items-center gap-2 mb-2 flex-wrap pr-6">
            {problem && (
              <>
                <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                  {problem.year}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                  {problem.province}
                </span>
                <span className="text-xs" style={{ color: colors.accent[400] }}>
                  {'★'.repeat(problem.difficulty)}
                </span>
              </>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
            >
              {meta.label}
            </span>
          </div>

          <h3 className="font-semibold text-neutral-800 mb-1">
            {problem?.title ?? r.problemId}
          </h3>
          {summary && <p className="text-sm text-neutral-500 mb-2 line-clamp-2">{summary}…</p>}

          {/* 知识点标签（最多2个 +N） */}
          {knowledgeTags.length > 0 && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {knowledgeTags.slice(0, 2).map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-500">
                  {t}
                </span>
              ))}
              {knowledgeTags.length > 2 && (
                <span className="text-xs text-neutral-400">+{knowledgeTags.length - 2}</span>
              )}
            </div>
          )}

          <div className="border-t border-neutral-100 pt-2 text-xs text-neutral-500 flex items-center justify-between">
            <span>最近作答：{formatDate(r.lastAttemptTime)}</span>
            <span>错 {r.errorCount} 次</span>
          </div>

          {r.note && (
            <p className="mt-2 text-xs text-neutral-600 bg-warning-50 rounded px-2 py-1 line-clamp-2">
              📝 {r.note}
            </p>
          )}
        </button>

        {/* 右键上下文菜单 */}
        {menuFor === r.problemId && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
            <div className="absolute top-10 right-3 z-30 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 w-36 text-sm">
              {r.status !== 'mastered' && (
                <button
                  onClick={() => {
                    markMastered(r.problemId)
                    setMenuFor(null)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-success-600"
                >
                  <CheckCircle2 className="w-4 h-4" /> 标记已掌握
                </button>
              )}
              <button
                onClick={() => {
                  setNoteDraft(r.note ?? '')
                  setNoteEditing(r.problemId)
                  setMenuFor(null)
                }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-neutral-700"
              >
                <StickyNote className="w-4 h-4" /> {r.note ? '编辑笔记' : '添加笔记'}
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(r.problemId)
                  setMenuFor(null)
                }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 text-danger-600"
              >
                <Trash2 className="w-4 h-4" /> 删除
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ---- chip 组件 ----
  const chip = (active: boolean, label: string, onClick: () => void, key?: string) => (
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

  const hasAny = records.length > 0
  const noFilterResult = hasAny && filtered.length === 0

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center gap-3 mb-6">
          <BookOpenCheck className="w-8 h-8" style={{ color: colors.danger[600] }} />
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">错题本</h1>
            <p className="text-neutral-600">回顾做错的题目，温故而知新</p>
          </div>
          {hasAny && (
            <button
              onClick={() => setConfirmDelete('all')}
              className="ml-auto flex items-center gap-1 text-sm text-neutral-500 hover:text-danger-600 active:scale-[0.97]"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
          )}
        </div>

        {!hasAny ? (
          /* 全空态 */
          <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
            <BookOpenCheck className="w-14 h-14 text-neutral-300" />
            <p className="text-neutral-500">暂无错题，继续加油！</p>
            <p className="text-sm text-neutral-400">在真题练习中做错的题目会自动收录到这里</p>
            <button
              onClick={() => navigate('/practice')}
              className="mt-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:scale-[0.97]"
            >
              去做题
            </button>
          </div>
        ) : (
          <>
            {/* 统计面板 */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 mb-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <span className="text-neutral-600">
                总错题数：<span className="font-mono font-semibold text-neutral-800">{stats.total}</span>
              </span>
              <span className="text-neutral-600">
                未掌握：<span className="font-mono font-semibold text-danger-600">{stats.notMastered}</span>
              </span>
              <span className="text-neutral-600">
                本周新增：<span className="font-mono font-semibold text-neutral-800">{stats.newThisWeek}</span>
              </span>
              <span className="text-neutral-600">
                本周掌握：<span className="font-mono font-semibold text-success-600">{stats.masteredThisWeek}</span>
              </span>
            </div>

            {/* 筛选 + 排序 */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 w-12">模块</span>
                {Object.entries(MODULE_LABELS)
                  .filter(([m]) => records.some((r) => moduleOf(r.knowledgeIds) === m))
                  .map(([m, label]) =>
                    chip(moduleFilter.has(m), label, () => setModuleFilter(toggle(moduleFilter, m)), m)
                  )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 w-12">难度</span>
                {[1, 2, 3, 4, 5].map((d) =>
                  chip(difficultyFilter.has(d), '★'.repeat(d), () =>
                    setDifficultyFilter(toggle(difficultyFilter, d)), `d${d}`)
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 w-12">状态</span>
                {(['new', 'viewed', 'retrying', 'mastered'] as WrongStatus[]).map((s) =>
                  chip(statusFilter.has(s), STATUS_META[s].label, () =>
                    setStatusFilter(toggle(statusFilter, s)), s)
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 w-12">排序</span>
                {([
                  ['recent', '最近错误'],
                  ['errors', '错误次数'],
                  ['difficulty', '难度高→低'],
                ] as [SortKey, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setSortKey(k)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors active:scale-[0.97] ${
                      sortKey === k
                        ? 'bg-secondary-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 列表 */}
            {noFilterResult ? (
              <div className="text-center text-neutral-400 py-16">
                没有符合筛选条件的错题
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeRecords.map(renderCard)}
                </div>

                {/* 已掌握折叠区 */}
                {masteredRecords.length > 0 && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowMastered((v) => !v)}
                      className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4 text-success-500" />
                      {showMastered ? '隐藏' : '显示'}已掌握（{masteredRecords.length}）
                    </button>
                    {showMastered && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 opacity-80">
                        {masteredRecords.map(renderCard)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* 删除确认 Modal（二次确认） */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-neutral-800 mb-2">
              {confirmDelete === 'all' ? '清空全部错题？' : '删除这道错题？'}
            </h3>
            <p className="text-sm text-neutral-500 mb-5">此操作无法撤销，请确认。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 active:scale-[0.97]"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (confirmDelete === 'all') clearAll()
                  else removeWrong(confirmDelete)
                  setConfirmDelete(null)
                }}
                className="px-4 py-2 rounded-lg bg-danger-600 text-white hover:bg-danger-700 active:scale-[0.97]"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 笔记编辑 Modal */}
      {noteEditing && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setNoteEditing(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-neutral-800">题目笔记</h3>
              <button onClick={() => setNoteEditing(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value.slice(0, NOTE_MAX_LENGTH))}
              rows={5}
              placeholder="记录解题思路、易错点…"
              className="w-full border border-neutral-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-neutral-400">
                {noteDraft.length}/{NOTE_MAX_LENGTH}
              </span>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setNoteEditing(null)}
                className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 active:scale-[0.97]"
              >
                取消
              </button>
              <button
                onClick={() => {
                  addNote(noteEditing, noteDraft)
                  setNoteEditing(null)
                }}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.97]"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

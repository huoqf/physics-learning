import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpenCheck, Trash2, X, CheckCircle2 } from 'lucide-react'
import { useWrongStore } from '@/stores'
import { NOTE_MAX_LENGTH } from '@/stores/useWrongStore'
import { colors } from '@/theme/colors'
import { moduleOf, toggle, chip } from '@/utils/moduleHelpers'
import { MODULE_LABELS } from '@/data/knowledge/modules'
import { WRONG_REASONS } from '@/data/wrongReasons'
import { getProblemById } from '@/data/problems'
import {
  WrongCard,
  STATUS_META,
  useWrongBookFilter,
  UNATTRIBUTED_REASON,
  filterKeepingSelected,
  ReasonPickerModal,
  ReasonBenchmarkStrip,
} from '@/features/wrongbook'
import type { ReasonFilterKey } from '@/features/wrongbook'
import type { WrongStatus } from '@/stores'
import { PageLayout } from '@/components/Layout'

export default function WrongPage() {
  const navigate = useNavigate()
  const records = useWrongStore((s) => s.records)
  const hydrate = useWrongStore((s) => s.hydrate)
  const markMastered = useWrongStore((s) => s.markMastered)
  const addNote = useWrongStore((s) => s.addNote)
  const setReasons = useWrongStore((s) => s.setReasons)
  const removeWrong = useWrongStore((s) => s.removeWrong)
  const clearAll = useWrongStore((s) => s.clearAll)

  const {
    moduleFilter, setModuleFilter,
    difficultyFilter, setDifficultyFilter,
    statusFilter, setStatusFilter,
    reasonFilter, setReasonFilter,
    sortKey, setSortKey,
    showMastered, setShowMastered,
    stats, activeRecords, masteredRecords,
  } = useWrongBookFilter()

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // ---- 弹窗状态 ----
  const [confirmDelete, setConfirmDelete] = useState<string | 'all' | null>(null)
  const [noteEditing, setNoteEditing] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [reasonEditing, setReasonEditing] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  const hasAny = records.length > 0
  const noFilterResult = hasAny && activeRecords.length === 0 && masteredRecords.length === 0

  // 筛选项只列「真的出现过」的错因，避免一排永远点不出结果的死胶囊；
  // 但已选中的 key 由 filterKeepingSelected 保底保留 —— 否则删掉最后一道带该错因的题后，
  // chip 凭空消失、选中态却还死死生效，界面恒空且无从取消（交互死锁）。
  const presentReasons = filterKeepingSelected(
    WRONG_REASONS,
    (r) => records.some((rec) => rec.reasons?.includes(r.id)),
    reasonFilter as ReadonlySet<string>,
    (r) => r.id as string,
  )
  const presentModules = filterKeepingSelected(
    Object.keys(MODULE_LABELS),
    (m) => records.some((r) => moduleOf(r.knowledgeIds) === m),
    moduleFilter,
    (m) => m,
  )
  const showUnattributedChip =
    reasonFilter.has(UNATTRIBUTED_REASON) ||
    records.some((rec) => !rec.reasons || rec.reasons.length === 0)

  const clearFilters = () => {
    setModuleFilter(new Set<string>())
    setDifficultyFilter(new Set<number>())
    setStatusFilter(new Set<WrongStatus>())
    setReasonFilter(new Set<ReasonFilterKey>())
  }
  const hasActiveFilter =
    moduleFilter.size > 0 || difficultyFilter.size > 0 || statusFilter.size > 0 || reasonFilter.size > 0
  const editingRecord = reasonEditing
    ? records.find((r) => r.problemId === reasonEditing)
    : undefined

  const renderCard = (r: typeof records[0]) => (
    <WrongCard
      key={r.problemId}
      record={r}
      menuFor={menuFor}
      onToggleMenu={(id) => setMenuFor(menuFor === id ? null : id)}
      onMarkMastered={markMastered}
      onEditNote={(id, note) => { setNoteDraft(note); setNoteEditing(id) }}
      onEditReasons={(id) => setReasonEditing(id)}
      onDelete={(id) => setConfirmDelete(id)}
    />
  )

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <PageLayout>
        <div className="flex items-center gap-3 mb-6">
          <BookOpenCheck className="w-8 h-8" style={{ color: colors.danger[600] }} />
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">错题本</h1>
            <p className="text-neutral-600">回顾做错的题目，温故而知新</p>
          </div>
          {hasAny && (
            <button onClick={() => setConfirmDelete('all')}
              className="ml-auto flex items-center gap-1 text-sm text-neutral-500 hover:text-danger-600 active:scale-[0.97]">
              <Trash2 className="w-4 h-4" />清空
            </button>
          )}
        </div>

        <ReasonBenchmarkStrip />

        {!hasAny ? (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
            <BookOpenCheck className="w-14 h-14 text-neutral-200" />
            <h3 className="text-neutral-600 font-semibold">暂无记录</h3>
            <p className="text-sm text-neutral-400">完成练习后，错题将自动归档至此</p>
            <button onClick={() => navigate('/practice')}
              className="mt-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:scale-[0.97]">去做题</button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 mb-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <span className="text-neutral-600">总错题数：<span className="font-mono font-semibold text-neutral-800">{stats.total}</span></span>
              <span className="text-neutral-600">未掌握：<span className="font-mono font-semibold text-danger-600">{stats.notMastered}</span></span>
              <span className="text-neutral-600">本周新增：<span className="font-mono font-semibold text-neutral-800">{stats.newThisWeek}</span></span>
              <span className="text-neutral-600">本周掌握：<span className="font-mono font-semibold text-success-600">{stats.masteredThisWeek}</span></span>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 w-12">模块</span>
                {/* 模块 chip 同样由 records 动态派生，同样要并上已选 key（否则同一处死锁换个维度再来一遍） */}
                {presentModules.map((m) => chip(moduleFilter.has(m), MODULE_LABELS[m], () => setModuleFilter(toggle(moduleFilter, m)), m))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 w-12">难度</span>
                {[1, 2, 3, 4, 5].map((d) => chip(difficultyFilter.has(d), '★'.repeat(d), () => setDifficultyFilter(toggle(difficultyFilter, d)), `d${d}`))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 w-12">状态</span>
                {(['new', 'viewed', 'retrying', 'mastered'] as WrongStatus[]).map((s) => chip(statusFilter.has(s), STATUS_META[s].label, () => setStatusFilter(toggle(statusFilter, s)), s))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 w-12">错因</span>
                {presentReasons.map((r) => chip(reasonFilter.has(r.id), r.label, () => setReasonFilter(toggle(reasonFilter, r.id)), r.id))}
                {showUnattributedChip && chip(reasonFilter.has(UNATTRIBUTED_REASON), '未归因', () => setReasonFilter(toggle(reasonFilter, UNATTRIBUTED_REASON)), UNATTRIBUTED_REASON)}
                {presentReasons.length === 0 && !showUnattributedChip && (
                  <span className="text-sm text-neutral-400">
                    还没有错题被归因 —— 点卡片上的「标记错因」先打标，再回来按错因聚合
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-neutral-400 w-12">排序</span>
                {([['recent', '最近错误'], ['errors', '错误次数'], ['difficulty', '难度高→低']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setSortKey(k)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors active:scale-[0.97] ${sortKey === k ? 'bg-secondary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {noFilterResult ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center text-neutral-400 py-16">
                <span>没有符合筛选条件的错题</span>
                {/* 兜底出口：任何筛选维度（含将来新增的动态维度）把结果清空时，
                    学生不必逐个去找「自己点过哪几个胶囊」才能退出 */}
                {hasActiveFilter && (
                  <button onClick={clearFilters}
                    className="px-4 py-1.5 rounded-lg text-sm bg-neutral-100 text-neutral-600 hover:bg-neutral-200 active:scale-[0.97]">
                    清除全部筛选
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{activeRecords.map(renderCard)}</div>
                {masteredRecords.length > 0 && (
                  <div className="mt-6">
                    <button onClick={() => setShowMastered((v) => !v)} className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-success-500" />
                      {showMastered ? '隐藏' : '显示'}已掌握（{masteredRecords.length}）
                    </button>
                    {showMastered && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 opacity-80">{masteredRecords.map(renderCard)}</div>}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </PageLayout>

      {/* 删除确认 Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-neutral-800 mb-2">{confirmDelete === 'all' ? '清空全部错题？' : '删除这道错题？'}</h3>
            <p className="text-sm text-neutral-500 mb-5">此操作无法撤销，请确认。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 active:scale-[0.97]">取消</button>
              <button onClick={() => { if (confirmDelete === 'all') clearAll(); else removeWrong(confirmDelete); setConfirmDelete(null) }}
                className="px-4 py-2 rounded-lg bg-danger-600 text-white hover:bg-danger-700 active:scale-[0.97]">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 笔记编辑 Modal */}
      {noteEditing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setNoteEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-neutral-800">题目笔记</h3>
              <button onClick={() => setNoteEditing(null)} className="text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
            </div>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value.slice(0, NOTE_MAX_LENGTH))}
              rows={5} placeholder="记录解题思路、易错点…"
              className="w-full border border-neutral-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-neutral-400">{noteDraft.length}/{NOTE_MAX_LENGTH}</span>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setNoteEditing(null)} className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 active:scale-[0.97]">取消</button>
              <button onClick={() => { addNote(noteEditing, noteDraft); setNoteEditing(null) }}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.97]">保存</button>
            </div>
          </div>
        </div>
      )}
      {/* 错因归因 Modal */}
      {reasonEditing && (
        <ReasonPickerModal
          key={reasonEditing}
          problemTitle={editingRecord ? getProblemById(editingRecord.problemId)?.title : undefined}
          initial={editingRecord?.reasons ?? []}
          onClose={() => setReasonEditing(null)}
          onSave={(next) => {
            setReasons(reasonEditing, next)
            setReasonEditing(null)
          }}
        />
      )}
    </div>
  )
}
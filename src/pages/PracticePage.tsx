import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardList, GraduationCap, Timer, History, Trash2 } from 'lucide-react'
import { allProblems } from '@/data/problems'
import { getKnowledgeNode } from '@/data/knowledgeTree'
import { usePracticeStore, type PracticeMode } from '@/stores'
import { PracticeSession } from '@/features/practice'
import { colors } from '@/theme/colors'

const MODULE_LABELS: Record<string, string> = {
  mechanics: '力学',
  electricity: '电磁学',
  thermodynamics: '热学',
  optics: '光学',
  atomic: '原子物理',
}

function moduleOf(knowledgeIds: string[]): string {
  const node = knowledgeIds.map((k) => getKnowledgeNode(k)).find(Boolean)
  return node?.module ?? knowledgeIds[0]?.split('-')[0] ?? 'other'
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function PracticePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modeParam = searchParams.get('mode')
  const sessionMode: PracticeMode | null =
    modeParam === 'practice' || modeParam === 'test' ? modeParam : null

  const history = usePracticeStore((s) => s.history)
  const hydrate = usePracticeStore((s) => s.hydrate)
  const clearHistory = usePracticeStore((s) => s.clearHistory)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // 题目筛选
  const [moduleFilter, setModuleFilter] = useState<Set<string>>(new Set())
  const [difficultyFilter, setDifficultyFilter] = useState<Set<number>>(new Set())

  const availableModules = useMemo(() => {
    const set = new Set(allProblems.map((p) => moduleOf(p.knowledgeIds)))
    return Array.from(set)
  }, [])

  const filteredProblems = useMemo(() => {
    return allProblems.filter((p) => {
      if (moduleFilter.size > 0 && !moduleFilter.has(moduleOf(p.knowledgeIds))) return false
      if (difficultyFilter.size > 0 && !difficultyFilter.has(p.difficulty)) return false
      return true
    })
  }, [moduleFilter, difficultyFilter])

  function toggle<T>(set: Set<T>, v: T): Set<T> {
    const next = new Set(set)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    return next
  }

  const startSession = (mode: PracticeMode) => {
    setSearchParams({ mode })
  }
  const exitSession = () => {
    setSearchParams({})
  }

  // ---- 会话进行中 ----
  if (sessionMode) {
    if (filteredProblems.length === 0) {
      return (
        <div className="min-h-screen bg-neutral-50 p-6">
          <div className="max-w-3xl mx-auto text-center py-20">
            <p className="text-neutral-500 mb-4">当前筛选下没有题目</p>
            <button
              onClick={exitSession}
              className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              返回
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-neutral-50 p-6">
        <PracticeSession
          mode={sessionMode}
          problems={filteredProblems}
          onExit={exitSession}
          onReviewKnowledge={(animId) => navigate(`/animation/${animId}`)}
        />
      </div>
    )
  }

  // ---- 入口页 ----
  const chip = (active: boolean, label: string, onClick: () => void, key?: string) => (
    <button
      key={key ?? label}
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm transition-colors active:scale-[0.97] ${
        active ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="w-8 h-8" style={{ color: colors.secondary[600] }} />
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">真题练习</h1>
            <p className="text-neutral-600">选择模式开始练习，或浏览全部真题解析</p>
          </div>
        </div>

        {/* 题目筛选 */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 mb-5 space-y-2">
          {availableModules.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-neutral-400 w-12">模块</span>
              {availableModules.map((m) =>
                chip(moduleFilter.has(m), MODULE_LABELS[m] ?? m, () => setModuleFilter(toggle(moduleFilter, m)), m)
              )}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-neutral-400 w-12">难度</span>
            {[1, 2, 3, 4, 5].map((d) =>
              chip(difficultyFilter.has(d), '★'.repeat(d), () => setDifficultyFilter(toggle(difficultyFilter, d)), `d${d}`)
            )}
            <span className="text-sm text-neutral-400 ml-auto">共 {filteredProblems.length} 题</span>
          </div>
        </div>

        {/* 模式选择 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => startSession('practice')}
            disabled={filteredProblems.length === 0}
            className="text-left bg-white rounded-xl shadow-md p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GraduationCap className="w-8 h-8 mb-3" style={{ color: colors.primary[600] }} />
            <h3 className="font-semibold text-neutral-800 mb-1">练习模式</h3>
            <p className="text-sm text-neutral-500">有提示、可随时看解析，适合巩固学习</p>
          </button>
          <button
            onClick={() => startSession('test')}
            disabled={filteredProblems.length === 0}
            className="text-left bg-white rounded-xl shadow-md p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Timer className="w-8 h-8 mb-3" style={{ color: colors.accent[600] }} />
            <h3 className="font-semibold text-neutral-800 mb-1">测试模式</h3>
            <p className="text-sm text-neutral-500">计时、无提示，检验真实掌握程度</p>
          </button>
        </div>

        {/* 成绩历史 */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-800">
            <History className="w-5 h-5" /> 成绩历史
          </h2>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-danger-600 active:scale-[0.97]"
            >
              <Trash2 className="w-4 h-4" /> 清空
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="text-center text-neutral-400 py-10 bg-white rounded-xl border border-neutral-200">
            还没有练习记录，选择上方模式开始吧
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((rec) => {
              const rate = rec.total > 0 ? Math.round((rec.correct / rec.total) * 100) : 0
              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-lg border border-neutral-200 p-3 flex items-center gap-4 text-sm"
                >
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: rec.mode === 'test' ? `${colors.accent[500]}22` : `${colors.primary[500]}22`,
                      color: rec.mode === 'test' ? colors.accent[600] : colors.primary[600],
                    }}
                  >
                    {rec.mode === 'test' ? '测试' : '练习'}
                  </span>
                  <span className="font-mono text-neutral-800">
                    {rec.correct}/{rec.total}
                  </span>
                  <span
                    className="font-mono"
                    style={{ color: rate >= 80 ? colors.success[600] : rate >= 60 ? colors.warning[500] : colors.danger[600] }}
                  >
                    {rate}%
                  </span>
                  {rec.durationSec !== undefined && (
                    <span className="text-neutral-400">
                      {Math.floor(rec.durationSec / 60)}分{rec.durationSec % 60}秒
                    </span>
                  )}
                  <span className="text-neutral-400 ml-auto">{formatDate(rec.timestamp)}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* 浏览全部真题 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-800 mb-3">浏览全部真题</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProblems.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/analysis/${p.id}`)}
                className="text-left bg-white rounded-xl shadow-sm border border-neutral-200 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700">{p.year}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">{p.province}</span>
                  <span className="text-xs" style={{ color: colors.accent[500] }}>{'★'.repeat(p.difficulty)}</span>
                </div>
                <h3 className="font-medium text-neutral-800 text-sm">{p.title}</h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

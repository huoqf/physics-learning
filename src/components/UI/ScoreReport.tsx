import { useMemo } from 'react'
import { Award, TrendingUp, RotateCcw, BookOpen } from 'lucide-react'
import type { ScoreRecord } from '@/stores'
import { getKnowledgeNode } from '@/data/knowledgeTree'
import { getProblemById } from '@/data/problems'
import { colors } from '@/theme/colors'

const MODULE_LABELS: Record<string, string> = {
  mechanics: '力学',
  electricity: '电磁学',
  thermodynamics: '热学',
  optics: '光学',
  atomic: '原子物理',
}

interface ScoreReportProps {
  record: Omit<ScoreRecord, 'id' | 'timestamp'>
  onRetry: () => void
  onExit: () => void
  onReviewKnowledge?: (animId: string) => void
}

function formatDuration(sec?: number): string {
  if (sec === undefined) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

export function ScoreReport({ record, onRetry, onExit, onReviewKnowledge }: ScoreReportProps) {
  const rate = record.total > 0 ? Math.round((record.correct / record.total) * 100) : 0
  const scoreColor =
    rate >= 80 ? colors.success[600] : rate >= 60 ? colors.warning[500] : colors.danger[600]

  // 薄弱知识点：来自答错题目的关联知识点，去重
  const weakKnowledge = useMemo(() => {
    const ids = new Set<string>()
    record.wrongProblemIds.forEach((pid) => {
      getProblemById(pid)?.knowledgeIds.forEach((k) => ids.add(k))
    })
    return Array.from(ids)
      .map((k) => getKnowledgeNode(k))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
  }, [record.wrongProblemIds])

  return (
    <div className="max-w-2xl mx-auto">
      {/* 总分卡 */}
      <div className="bg-white rounded-xl shadow-md p-8 text-center mb-6">
        <Award className="w-12 h-12 mx-auto mb-3" style={{ color: scoreColor }} />
        <p className="text-neutral-500 text-sm mb-1">
          {record.mode === 'test' ? '测试' : '练习'}完成
        </p>
        <div className="text-5xl font-bold font-mono mb-2" style={{ color: scoreColor }}>
          {record.correct}
          <span className="text-2xl text-neutral-400"> / {record.total}</span>
        </div>
        <p className="text-neutral-600">正确率 {rate}%</p>
        {record.durationSec !== undefined && (
          <p className="text-sm text-neutral-400 mt-1">用时 {formatDuration(record.durationSec)}</p>
        )}
      </div>

      {/* 各模块正确率 */}
      {Object.keys(record.byModule).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5 mb-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 mb-4">
            <TrendingUp className="w-4 h-4" /> 各模块正确率
          </h3>
          <div className="space-y-3">
            {Object.entries(record.byModule).map(([module, { correct, total }]) => {
              const r = total > 0 ? Math.round((correct / total) * 100) : 0
              return (
                <div key={module}>
                  <div className="flex justify-between text-xs text-neutral-600 mb-1">
                    <span>{MODULE_LABELS[module] ?? module}</span>
                    <span className="font-mono">
                      {correct}/{total}（{r}%）
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${r}%`,
                        backgroundColor:
                          r >= 80 ? colors.success[500] : r >= 60 ? colors.warning[500] : colors.danger[500],
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 薄弱知识点 */}
      {weakKnowledge.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5 mb-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 mb-3">
            <BookOpen className="w-4 h-4" /> 建议复习
          </h3>
          <div className="flex flex-wrap gap-2">
            {weakKnowledge.map((node) => {
              const animId = node.animationIds?.[0]
              return (
                <button
                  key={node.id}
                  onClick={() => animId && onReviewKnowledge?.(animId)}
                  disabled={!animId}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    animId
                      ? 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 active:scale-[0.97]'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500 cursor-default'
                  }`}
                >
                  {node.title}
                  {animId && ' →'}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 操作 */}
      <div className="flex justify-center gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:scale-[0.97]"
        >
          <RotateCcw className="w-4 h-4" /> 再来一组
        </button>
        <button
          onClick={onExit}
          className="px-5 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 active:scale-[0.97]"
        >
          返回
        </button>
      </div>
    </div>
  )
}

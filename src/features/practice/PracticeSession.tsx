import { useEffect, useRef, useState } from 'react'
import { Clock, Pause, Play, Lightbulb, Eye, Check, X } from 'lucide-react'
import type { Problem } from '@/data/types'
import type { PracticeMode, ScoreRecord } from '@/stores'
import { useProblemStore, usePracticeStore, useWrongStore } from '@/stores'
import { moduleOf } from '@/utils/moduleHelpers'
import { KatexFormula } from '@/components/UI/KatexFormula'
import { ScoreReport } from '@/components/UI'
import { colors } from '@/theme/colors'

interface PracticeSessionProps {
  mode: PracticeMode
  problems: Problem[]
  onExit: () => void
  onReviewKnowledge?: (animId: string) => void
}

/** 渲染含 $...$ / $$...$$ 的文本 */
function RichText({ text }: { text: string }) {
  const segs = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)
  return (
    <>
      {segs.map((seg, i) => {
        if (seg.startsWith('$$') && seg.endsWith('$$'))
          return <KatexFormula key={i} formula={seg.slice(2, -2).trim()} mode="block" />
        if (seg.startsWith('$') && seg.endsWith('$'))
          return <KatexFormula key={i} formula={seg.slice(1, -1).trim()} mode="inline" />
        return <span key={i} className="whitespace-pre-wrap">{seg.replace(/\\n/g, '\n')}</span>
      })}
    </>
  )
}

export function PracticeSession({ mode, problems, onExit, onReviewKnowledge }: PracticeSessionProps) {
  const isTest = mode === 'test'

  // useProblemStore：当前作答会话状态（激活此前未接线的 store）
  const currentIndex = useProblemStore((s) => s.currentStep)
  const setCurrentIndex = useProblemStore((s) => s.setCurrentStep)
  const setCurrentProblem = useProblemStore((s) => s.setCurrentProblem)
  const resetProblem = useProblemStore((s) => s.reset)

  const addRecord = usePracticeStore((s) => s.addRecord)
  const hydratePractice = usePracticeStore((s) => s.hydrate)

  const addWrong = useWrongStore((s) => s.addWrong)
  const recordCorrect = useWrongStore((s) => s.recordCorrect)
  const hydrateWrong = useWrongStore((s) => s.hydrate)

  // 每题判定结果：index -> 'correct' | 'wrong'
  const [results, setResults] = useState<Record<number, 'correct' | 'wrong'>>({})
  const [revealed, setRevealed] = useState(false) // 当前题是否已揭示解析
  const [showHint, setShowHint] = useState(false)
  const [finished, setFinished] = useState(false)

  // 计时器（仅测试模式）
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const startRef = useRef(Date.now())

  useEffect(() => {
    void hydratePractice()
    void hydrateWrong()
    setCurrentProblem(problems[0]?.id ?? null)
    setCurrentIndex(0)
    return () => resetProblem()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isTest || paused || finished) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [isTest, paused, finished])

  // 切换题目时重置揭示/提示态
  useEffect(() => {
    setRevealed(results[currentIndex] !== undefined)
    setShowHint(false)
  }, [currentIndex, results])

  const problem = problems[currentIndex]

  const answeredCount = Object.keys(results).length
  const correctCount = Object.values(results).filter((r) => r === 'correct').length

  const buildRecord = (): Omit<ScoreRecord, 'id' | 'timestamp'> => {
    const byModule: Record<string, { correct: number; total: number }> = {}
    const wrongProblemIds: string[] = []
    problems.forEach((p, i) => {
      const m = moduleOf(p.knowledgeIds)
      byModule[m] ??= { correct: 0, total: 0 }
      byModule[m].total += 1
      if (results[i] === 'correct') byModule[m].correct += 1
      else wrongProblemIds.push(p.id)
    })
    return {
      mode,
      total: problems.length,
      correct: correctCount,
      durationSec: isTest ? elapsed : undefined,
      wrongProblemIds,
      byModule,
    }
  }

  const finishSession = () => {
    const record = buildRecord()
    addRecord(record)
    setFinished(true)
  }

  // 自评：标记当前题对/错，并联动错题本
  const judge = (correct: boolean) => {
    setResults((prev) => ({ ...prev, [currentIndex]: correct ? 'correct' : 'wrong' }))
    if (correct) recordCorrect(problem.id)
    else addWrong(problem.id, problem.knowledgeIds)
  }

  const goNext = () => {
    if (currentIndex < problems.length - 1) setCurrentIndex(currentIndex + 1)
  }
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  if (finished) {
    return (
      <ScoreReport
        record={buildRecord()}
        onRetry={() => {
          setResults({})
          setRevealed(false)
          setShowHint(false)
          setElapsed(0)
          setPaused(false)
          startRef.current = Date.now()
          setCurrentIndex(0)
          setFinished(false)
        }}
        onExit={onExit}
        onReviewKnowledge={onReviewKnowledge}
      />
    )
  }

  if (!problem) {
    return <div className="text-center text-neutral-400 py-20">没有可练习的题目</div>
  }

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const currentResult = results[currentIndex]

  return (
    <div className="max-w-3xl mx-auto">
      {/* 顶栏：进度 + 计时器 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">
            第 {currentIndex + 1} / {problems.length} 题
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
            已答 {answeredCount} · 对 {correctCount}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isTest && (
            <div className="flex items-center gap-2 font-mono text-sm text-neutral-700">
              <Clock className="w-4 h-4" />
              {fmtTime(elapsed)}
              <button
                onClick={() => setPaused((p) => !p)}
                className="text-neutral-500 hover:text-neutral-700"
                aria-label={paused ? '继续' : '暂停'}
              >
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </div>
          )}
          <button onClick={onExit} className="text-sm text-neutral-500 hover:text-neutral-700">
            退出
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden mb-6">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(answeredCount / problems.length) * 100}%`,
            backgroundColor: colors.primary[500],
          }}
        />
      </div>

      {/* 题干 */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700">{problem.year}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">{problem.province}</span>
          <span className="text-xs" style={{ color: colors.accent[500] }}>{'★'.repeat(problem.difficulty)}</span>
        </div>
        <h2 className="font-semibold text-neutral-800 mb-3">{problem.title}</h2>
        <div className="text-[15px] leading-7 text-neutral-700">
          {problem.content.split('\\n').map((line, i) => (
            <p key={i} className="mb-1.5"><RichText text={line} /></p>
          ))}
        </div>

        {/* 练习模式：提示按钮（展示首步描述作为思路提示） */}
        {!isTest && !revealed && problem.steps[0] && (
          <div className="mt-4">
            <button
              onClick={() => setShowHint((v) => !v)}
              className="flex items-center gap-1 text-sm text-secondary-600 hover:text-secondary-700"
            >
              <Lightbulb className="w-4 h-4" /> {showHint ? '隐藏提示' : '查看提示'}
            </button>
            {showHint && (
              <p className="mt-2 text-sm text-neutral-600 bg-secondary-50 rounded-lg px-3 py-2">
                💡 {problem.steps[0].description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 揭示解析 */}
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50 active:scale-[0.99]"
        >
          <Eye className="w-4 h-4" />
          {isTest ? '提交并查看答案' : '查看解析'}
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <h3 className="text-sm font-semibold text-neutral-800 mb-3">分步解析</h3>
          <ol className="space-y-4">
            {problem.steps.map((step, i) => (
              <li key={step.id} className="border-l-2 border-primary-200 pl-3">
                <p className="text-sm font-medium text-neutral-700 mb-1">
                  {i + 1}. {step.description}
                </p>
                {step.formula && <KatexFormula formula={step.formula.replace(/^\$\$|\$\$$/g, '').trim()} mode="block" />}
                <p className="text-sm text-neutral-500 mt-1"><RichText text={step.explanation} /></p>
              </li>
            ))}
          </ol>

          {/* 自评 */}
          {currentResult === undefined ? (
            <div className="mt-5 pt-4 border-t border-neutral-100">
              <p className="text-sm text-neutral-600 mb-2">对照解析，你答对了吗？</p>
              <div className="flex gap-3">
                <button
                  onClick={() => judge(true)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-success-100 text-success-700 hover:bg-success-200 active:scale-[0.97]"
                >
                  <Check className="w-4 h-4" /> 答对了
                </button>
                <button
                  onClick={() => judge(false)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-danger-100 text-danger-700 hover:bg-danger-200 active:scale-[0.97]"
                >
                  <X className="w-4 h-4" /> 答错了
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-neutral-100">
              <span
                className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full"
                style={{
                  backgroundColor: currentResult === 'correct' ? `${colors.success[500]}22` : `${colors.danger[500]}22`,
                  color: currentResult === 'correct' ? colors.success[600] : colors.danger[600],
                }}
              >
                {currentResult === 'correct' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {currentResult === 'correct' ? '已记为答对' : '已加入错题本'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 底部导航 */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          上一题
        </button>
        {currentIndex < problems.length - 1 ? (
          <button
            onClick={goNext}
            className="px-5 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.97]"
          >
            下一题
          </button>
        ) : (
          <button
            onClick={finishSession}
            className="px-5 py-2 rounded-lg bg-success-600 text-white hover:bg-success-700 active:scale-[0.97]"
          >
            完成并查看成绩
          </button>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Clock, Pause, Play, Lightbulb, Eye, Check, X } from 'lucide-react'
import type { Problem } from '@/data/types'
import type { PracticeMode, ScoreRecord } from '@/stores'
import { useProblemStore, usePracticeStore, useWrongStore } from '@/stores'
import { moduleOf } from '@/utils/moduleHelpers'
import { KatexFormula, ScoreReport, Card, Button } from '@/components/UI'
import { colors } from '@/theme/colors'

interface PracticeSessionProps {
  mode: PracticeMode
  problems: Problem[]
  onExit: () => void
  onReviewKnowledge?: (animId: string) => void
  onLaunchAnimation?: (animId: string, params?: Record<string, number>) => void
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

export function PracticeSession({ mode, problems, onExit, onReviewKnowledge, onLaunchAnimation }: PracticeSessionProps) {
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? '继续' : '暂停'}
              >
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={onExit}>
            退出
          </Button>
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
      <Card className="p-6 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-medium">{problem.year}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">{problem.province}</span>
          {problem.tags?.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              {t}
            </span>
          ))}
          <span className="text-xs ml-auto" style={{ color: colors.accent[500] }}>{'★'.repeat(problem.difficulty)}</span>
        </div>
        {problem.source && (
          <p className="text-xs text-neutral-400 mb-2 font-mono">来源: {problem.source}</p>
        )}
        <h2 className="font-semibold text-neutral-800 mb-3">{problem.title}</h2>
        <div className="text-[15px] leading-7 text-neutral-700">
          {problem.content.split('\\n').map((line, i) => (
            <p key={i} className="mb-1.5"><RichText text={line} /></p>
          ))}
        </div>

        {/* 题干初始纯净配图 (方案 B 静态高清图，零解答辅助线/透题矢) */}
        {problem.images && problem.images.length > 0 && (
          <div className="my-4 flex flex-wrap gap-3">
            {problem.images.map((imgUrl, idx) => (
              <img
                key={idx}
                src={imgUrl}
                alt={`真题原图 ${idx + 1}`}
                className="max-w-full max-h-[260px] object-contain rounded-lg border border-neutral-200 bg-neutral-50"
              />
            ))}
          </div>
        )}

        {/* 真题-动画双向联动入口 */}
        {problem.targetAnimation && onLaunchAnimation && (
          <div className="mt-4 p-3 bg-primary-50 rounded-xl border border-primary-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎥</span>
              <div>
                <p className="text-xs font-semibold text-primary-900">真题-仿真动画双向联动</p>
                <p className="text-xs text-primary-700">
                  {problem.targetAnimation.presetDescription || '一键将高考真题物理参数载入 3D/SVG 仿真模型'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onLaunchAnimation(problem.targetAnimation!.animId, problem.targetAnimation!.presetParams)}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium"
            >
              载入真题参数并运行仿真 ➔
            </Button>
          </div>
        )}

        {/* 练习模式：提示按钮（展示首步描述作为思路提示） */}
        {!isTest && !revealed && problem.steps[0] && (
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint((v) => !v)}
              className="text-secondary-600 hover:text-secondary-700"
            >
              <Lightbulb className="w-4 h-4" /> {showHint ? '隐藏提示' : '查看提示'}
            </Button>
            {showHint && (
              <p className="mt-2 text-sm text-neutral-600 bg-secondary-50 rounded-lg px-3 py-2">
                💡 {problem.steps[0].description}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* 揭示解析 */}
      {!revealed ? (
        <Button
          variant="secondary"
          onClick={() => setRevealed(true)}
          className="w-full"
        >
          <Eye className="w-4 h-4" />
          {isTest ? '提交并查看答案' : '查看解析'}
        </Button>
      ) : (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-neutral-800 mb-3">分步解析与高考采分点</h3>
          <ol className="space-y-4">
            {problem.steps.map((step, i) => (
              <li key={step.id} className="border-l-2 border-primary-200 pl-3">
                <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                  <p className="text-sm font-medium text-neutral-700">
                    {i + 1}. {step.description}
                  </p>
                  {step.scorePoints != null && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                      采分点 +{step.scorePoints}分
                    </span>
                  )}
                </div>

                {/* 关键突破条件 */}
                {step.keyCondition && (
                  <div className="my-1.5 p-2 rounded bg-amber-50/70 border-l-2 border-amber-400 text-xs text-amber-900">
                    <span className="font-semibold">⚡ Key 突破条件：</span>{step.keyCondition}
                  </div>
                )}

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
                <Button
                  variant="danger"
                  onClick={() => judge(false)}
                >
                  <X className="w-4 h-4" /> 答错了
                </Button>
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
        </Card>
      )}

      {/* 底部导航 */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          上一题
        </Button>
        {currentIndex < problems.length - 1 ? (
          <Button
            onClick={goNext}
          >
            下一题
          </Button>
        ) : (
          <Button
            onClick={finishSession}
            className="bg-success-600 hover:bg-success-700"
          >
            完成并查看成绩
          </Button>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Eye, EyeOff, Zap, Award } from 'lucide-react'
import { ContentWithKatex, StepCard, KnowledgeChain, ProblemDeconstruction, useAnalysisSteps } from '@/features/analysis'
import { getKnowledgeNode } from '@/data/knowledgeTree'
import { getProblemDiagram } from '@/components/Physics/ProblemDiagrams'
import { Button, Badge } from '@/components/UI'
import { PageLayout } from '@/components/Layout'

const difficultyLabels = ['入门', '基础', '中等', '较难', '困难']
const difficultyColors: Record<number, string> = {
  1: 'bg-success-100 text-success-700',
  2: 'bg-primary-100 text-primary-700',
  3: 'bg-accent-100 text-accent-700',
  4: 'bg-warning-100 text-warning-700',
  5: 'bg-danger-100 text-danger-700',
}

export default function AnalysisPage() {
  const navigate = useNavigate()
  const [isAnalysisUnlocked, setIsAnalysisUnlocked] = useState(false)
  const {
    id, problem, analysisEntry, wrongRecord,
    addWrong, markMastered,
    expandedSteps, currentStepIndex,
    completedKnowledgeIds, currentStepKnowledgeId,
    toggleStep, goToPrevStep, goToNextStep,
    handleAnimationClick, getStepStatus,
  } = useAnalysisSteps()

  if (!analysisEntry || !problem) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">题目未找到</h2>
          <p className="text-neutral-500 mb-4">ID: {id}</p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-6">
      <PageLayout maxWidth="900px" padding={false}>
        {/* 顶部真题原卷卡片 (试题来源、严谨题干原文与原卷纯净配图) */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-semibold bg-primary-50 text-primary-700 rounded border border-primary-100">
                {analysisEntry.year}年 {analysisEntry.province}
              </span>
              {problem.source && (
                <span className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 rounded">
                  {problem.source}
                </span>
              )}
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${difficultyColors[analysisEntry.difficulty]}`}
              >
                难度: {difficultyLabels[analysisEntry.difficulty - 1]}
              </span>
              {analysisEntry.knowledgeIds.slice(0, 3).map((kid) => {
                const node = getKnowledgeNode(kid)
                return node ? (
                  <Badge key={kid} variant={node.importance as 'basic' | 'core' | 'gaokao' | 'hard' | 'extend'} className="text-xs">
                    {node.title}
                  </Badge>
                ) : null
              })}
            </div>

            <div className="flex items-center gap-2">
              {isAnalysisUnlocked && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAnalysisUnlocked(false)}
                  className="text-xs flex items-center gap-1"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>收起解析</span>
                </Button>
              )}
              {wrongRecord && wrongRecord.status === 'mastered' ? (
                <span className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-success-100 text-success-700 font-medium">✓ 已掌握</span>
              ) : wrongRecord ? (
                <Button variant="secondary" size="sm" className="shrink-0" onClick={() => markMastered(wrongRecord.problemId)}>
                  标记已掌握
                </Button>
              ) : (
                <Button variant="secondary" size="sm" className="shrink-0" onClick={() => addWrong(problem.id, analysisEntry.knowledgeIds)}>
                  加入错题本
                </Button>
              )}
            </div>
          </div>

          <h1 className="text-lg font-semibold text-neutral-900 mb-3">{analysisEntry.title}</h1>
          
          {/* 真题题干原文（100% 严格引用高考原卷原文） */}
          <div className="text-base leading-[1.8] text-neutral-800 mb-4 bg-neutral-50/50 p-4 rounded-lg border border-neutral-100">
            <div className="text-xs font-semibold text-neutral-500 mb-2 flex items-center gap-1">
              <span>📄 高考真题试题原文：</span>
            </div>
            {problem.content.split('\n').map((line, i) => (
              <p key={i} className="mb-2 last:mb-0"><ContentWithKatex content={line} /></p>
            ))}
          </div>

          {/* 若该真题配置有标准矢量示意图，渲染题干纯净模式示意图 (Skill 0A 绝对纯净无解题线) */}
          {(() => {
            const DiagramComp = getProblemDiagram(problem.id)
            if (DiagramComp) {
              return (
                <div className="mt-4 mb-3">
                  <div className="text-xs font-semibold text-neutral-500 mb-1">📷 真题原卷附图：</div>
                  <DiagramComp showAnalysis={false} />
                </div>
              )
            }
            if (problem.images && problem.images.length > 0) {
              return (
                <div className="mt-4 mb-3 flex flex-wrap gap-4">
                  {problem.images.map((imgUrl, idx) => (
                    <div key={idx} className="border border-neutral-200 rounded-lg p-2 bg-white">
                      <img src={imgUrl} alt={`真题原图 ${idx + 1}`} className="max-h-[220px] object-contain rounded" />
                    </div>
                  ))}
                </div>
              )
            }
            return null
          })()}

          {/* 初始未解锁解析时的思考引导区与显式解锁按钮 */}
          {!isAnalysisUnlocked && (
            <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-primary-50/80 via-white to-primary-50/30 border border-primary-200 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-2 text-primary-800 font-semibold text-sm">
                <Zap className="w-4 h-4 text-accent-600" />
                <span>考场独立思考模式 (初始防透题)</span>
              </div>
              <p className="text-xs text-neutral-600 mb-4 max-w-lg mx-auto leading-relaxed">
                上方已为您呈现 100% 还原考场原貌的真题题干与纯净图像（不含任何受力分析箭头与解答提示）。请先独立思考并尝试推导，求解完成后点击下方按钮展开破题拆解流。
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsAnalysisUnlocked(true)}
                className="flex items-center justify-center gap-2 mx-auto px-6 py-2.5 shadow-md hover:shadow-lg transition-all"
              >
                <Eye className="w-4 h-4" />
                <span className="font-semibold text-sm">💡 展开高考大题三步破题拆解与标准采分点</span>
              </Button>
            </div>
          )}
        </div>

        {/* 只有在解锁解析后，才呈现破题拆解流与分步解析 */}
        {isAnalysisUnlocked && (
          <div className="animate-fade-in space-y-6">
            {/* 高考大题三步破题拆解流卡片 */}
            <ProblemDeconstruction
              problem={problem}
              currentStepIndex={currentStepIndex}
              onStepChange={(idx) => {
                if (idx > currentStepIndex) goToNextStep()
                else if (idx < currentStepIndex) goToPrevStep()
              }}
              onLaunchAnimation={(animId, params) => {
                if (params) {
                  const searchParams = new URLSearchParams()
                  Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)))
                  navigate(`/animation/${animId}?${searchParams.toString()}`)
                } else {
                  navigate(`/animation/${animId}`)
                }
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 bg-white rounded-lg border border-neutral-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary-600" />
                    <h2 className="text-base font-semibold text-neutral-800">高考阅卷标准分步解析</h2>
                  </div>
                  <span className="text-xs text-neutral-400">
                    步骤 {currentStepIndex + 1} / {problem.steps.length}
                    <span className="ml-1">· 已展开 {expandedSteps.size}/2</span>
                  </span>
                </div>
                <div className="space-y-3">
                  {problem.steps.map((step, index) => {
                    const expandedArr = Array.from(expandedSteps)
                    const isFirstExpanded = expandedArr.length >= 2 && expandedArr[0] === index
                    return (
                      <StepCard
                        key={step.id}
                        step={step}
                        index={index}
                        status={getStepStatus(index)}
                        isExpanded={expandedSteps.has(index)}
                        isSvgDegraded={isFirstExpanded}
                        onToggle={() => toggleStep(index)}
                        onClickAnimation={handleAnimationClick}
                      />
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-200">
                  <Button variant="primary" size="sm" onClick={goToPrevStep} disabled={currentStepIndex === 0}>
                    <ChevronLeft size={16} className="mr-1" />上一步
                  </Button>
                  <Button variant="primary" size="sm" onClick={goToNextStep} disabled={currentStepIndex === problem.steps.length - 1}>
                    下一步<ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-2 bg-neutral-50 rounded-lg border border-neutral-200 p-4">
                <h2 className="text-base font-semibold text-neutral-800 mb-4">知识链路</h2>
                <KnowledgeChain
                  knowledgeIds={analysisEntry.knowledgeIds}
                  currentStepKnowledgeId={currentStepKnowledgeId}
                  completedKnowledgeIds={completedKnowledgeIds}
                  onNodeClick={handleAnimationClick}
                />
              </div>
            </div>
          </div>
        )}
      </PageLayout>
    </div>
  )
}
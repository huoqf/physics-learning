import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, FileText, AlertTriangle, Zap, ArrowRight } from 'lucide-react'
import type { MasterModel } from '@/data/masterModels'
import { ContentWithKatex } from '@/features/analysis'
import { Button } from '@/components/UI'
import { getProblemById } from '@/data/problems'

interface MasterModelCardProps {
  model: MasterModel
}

export const MasterModelCard: React.FC<MasterModelCardProps> = ({ model }) => {
  const navigate = useNavigate()

  const handleGoAnimation = (usePreset = false) => {
    if (usePreset && model.presetParams) {
      // 通过 URL 参数将一键真题预设传递给动画页面
      const searchParams = new URLSearchParams()
      Object.entries(model.presetParams).forEach(([k, v]) => {
        searchParams.set(k, String(v))
      })
      navigate(`/animation/${model.animId}?${searchParams.toString()}`)
    } else {
      navigate(`/animation/${model.animId}`)
    }
  }

  const handleGoAnalysis = (probId: string) => {
    navigate(`/analysis/${probId}`)
  }

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-6 shadow-xl hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* 头部：勋章与标题 */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {model.frequencyBadge}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">ID: {model.id}</span>
        </div>

        <h3 className="text-xl font-bold text-slate-100 mb-2">{model.title}</h3>
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">{model.summary}</p>

        {/* 秒杀速算公式卡片 */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-amber-500/30 mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
            <span>⚡ 秒杀公式与速算口诀：{model.quickFormula.title}</span>
          </div>
          <div className="text-amber-200 font-mono text-base mb-2 overflow-x-auto py-1">
            <ContentWithKatex content={model.quickFormula.latex} />
          </div>
          <p className="text-xs text-slate-400 leading-normal">{model.quickFormula.explanation}</p>
        </div>

        {/* 高考易错陷阱 */}
        {model.examTips.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center gap-1 text-xs font-semibold text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>高考常考易错点与踩坑避雷：</span>
            </div>
            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 pl-1">
              {model.examTips.map((tip, idx) => (
                <li key={idx} className="leading-normal">{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 关联同源真题变式链 */}
        {model.relatedProblemIds.length > 0 && (
          <div className="mb-5 pt-3 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block mb-2">🔗 同源高考真题变式链：</span>
            <div className="flex flex-wrap gap-2">
              {model.relatedProblemIds.map((probId) => {
                const prob = getProblemById(probId)
                return (
                  <button
                    key={probId}
                    onClick={() => handleGoAnalysis(probId)}
                    className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 rounded-md border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3 text-sky-400" />
                    <span>{prob ? prob.title : probId}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部动作按钮 */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/80">
        <Button
          variant="primary"
          size="sm"
          className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center justify-center gap-1.5"
          onClick={() => handleGoAnimation(true)}
        >
          <Zap className="w-4 h-4" />
          <span>📋 真题一键装载仿真</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5"
          onClick={() => handleGoAnimation(false)}
        >
          <Play className="w-4 h-4 text-sky-400" />
          <span>🎥 进入物理仿真</span>
        </Button>
      </div>
    </div>
  )
}

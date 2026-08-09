import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, FileText, AlertTriangle, Zap, ArrowRight } from 'lucide-react'
import type { MasterModel } from '@/data/masterModels'
import { Button, KatexFormula } from '@/components/UI'
import { getProblemById } from '@/data/problems'
import { colors } from '@/theme/colors'

interface MasterModelCardProps {
  model: MasterModel
}

export const MasterModelCard: React.FC<MasterModelCardProps> = ({ model }) => {
  const navigate = useNavigate()

  const handleGoAnimation = (usePreset = false) => {
    if (usePreset && model.presetParams) {
      const searchParams = new URLSearchParams()
      Object.entries(model.presetParams).forEach(([k, v]) => {
        searchParams.set(k, String(v))
      })
      navigate(`/animation/${model.animId}?${searchParams.toString()}`)
    } else {
      navigate(`/animation/${model.animId}`)
    }
  }

  const handleGoSecondaryAnimation = (usePreset = false) => {
    if (!model.secondaryAnimId) return
    if (usePreset && model.secondaryPresetParams) {
      const searchParams = new URLSearchParams()
      Object.entries(model.secondaryPresetParams).forEach(([k, v]) => {
        searchParams.set(k, String(v))
      })
      navigate(`/animation/${model.secondaryAnimId}?${searchParams.toString()}`)
    } else {
      navigate(`/animation/${model.secondaryAnimId}`)
    }
  }

  const handleGoAnalysis = (probId: string) => {
    navigate(`/analysis/${probId}`)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* 头部：勋章与标题 (高考 5 级标签使用 accent 金色系) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className="px-2.5 py-0.5 text-xs font-semibold rounded border flex items-center gap-1"
            style={{
              backgroundColor: colors.accent[100],
              color: colors.accent[700],
              borderColor: colors.accent[200],
            }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: colors.accent[600] }} />
            {model.frequencyBadge}
          </span>
          <span className="text-xs text-neutral-400 font-mono">ID: {model.id}</span>
        </div>

        <h3 className="text-lg font-semibold text-neutral-800 mb-2">{model.title}</h3>
        <p className="text-sm text-neutral-600 mb-4 leading-relaxed">{model.summary}</p>

        {/* 秒杀速算公式区 (02_UI_RULES.md §7: primary-50 背景, rounded-sm/lg, padding 12px 16px) */}
        <div className="bg-primary-50 rounded-lg p-4 border border-primary-100 mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 mb-2">
            <span>⚡ 秒杀公式与速算口诀：{model.quickFormula.title}</span>
          </div>
          <div className="text-neutral-800 text-sm mb-2 overflow-x-auto py-1">
            <KatexFormula formula={model.quickFormula.latex} mode="block" />
          </div>
          <p className="text-xs text-neutral-500 leading-normal">{model.quickFormula.explanation}</p>
        </div>

        {/* 高考易错点 */}
        {model.examTips.length > 0 && (
          <div className="bg-danger-100/50 rounded-lg p-3 border border-danger-100 mb-4">
            <div className="flex items-center gap-1 text-xs font-semibold text-danger-700 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>高考常考易错避雷：</span>
            </div>
            <ul className="list-disc list-inside text-xs text-neutral-600 space-y-1 pl-1">
              {model.examTips.map((tip, idx) => (
                <li key={idx} className="leading-normal">{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 关联同源真题变式链 */}
        {model.relatedProblemIds.length > 0 && (
          <div className="mb-5 pt-3 border-t border-neutral-100">
            <span className="text-xs font-semibold text-neutral-500 block mb-2 flex items-center justify-between">
              <span>🔗 绑定高考真题与原卷原图：</span>
            </span>
            <div className="space-y-2">
              {model.relatedProblemIds.map((probId) => {
                const prob = getProblemById(probId)
                return (
                  <div
                    key={probId}
                    onClick={() => handleGoAnalysis(probId)}
                    className="p-3 bg-neutral-50 hover:bg-primary-50/40 rounded-lg border border-neutral-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 group-hover:text-primary-700">
                        <FileText className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                        <span>{prob ? prob.title : probId}</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-primary-100/60 text-primary-700 shrink-0">
                        {prob?.source || '高考真题'}
                      </span>
                    </div>

                    {prob && (
                      <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-2">
                        {prob.content.replace(/\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]/g, ' [公式] ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-primary-600 font-medium">
                      <span>📄 考场模式 (纯净原图·初始无解析)</span>
                      <div className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                        <span>真题考场进入</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部动作按钮 (全量复用 @/components/UI 的 Button 标准变体) */}
      <div className="flex flex-col gap-2 pt-3 border-t border-neutral-100">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 flex items-center justify-center gap-1 text-xs"
            onClick={() => handleGoAnimation(true)}
          >
            <Zap className="w-3 h-3" />
            <span>📋 真题预设</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 flex items-center justify-center gap-1 text-xs"
            onClick={() => handleGoAnimation(false)}
          >
            <Play className="w-3 h-3 text-primary-600" />
            <span>🎥 展开仿真</span>
          </Button>
        </div>

        {model.secondaryAnimId && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1 text-xs"
              onClick={() => handleGoSecondaryAnimation(true)}
            >
              <Zap className="w-3 h-3" />
              <span>📋 变式预设</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1 text-xs"
              onClick={() => handleGoSecondaryAnimation(false)}
            >
              <Play className="w-3 h-3 text-primary-600" />
              <span>🚀 变式仿真</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

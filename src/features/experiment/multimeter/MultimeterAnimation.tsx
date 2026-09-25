import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useMultimeterPhysics } from './hooks/useMultimeterPhysics'
import { MultimeterScene } from './components/MultimeterScene'

export default function MultimeterAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const rangeIndex = params.rangeIndex ?? 6 // 默认 Ω ×1
  const zeroOffset = params.zeroOffset ?? 0 // 默认调零精准
  const componentType = params.componentType ?? 0 // 默认定值电阻
  const rxNominal = params.rxNominal ?? 30 // 默认 30Ω
  const probesConnected = params.probesConnected ?? 1 // 默认表笔接通

  const physics = useMultimeterPhysics({
    rangeIndex,
    zeroOffset,
    componentType,
    rxNominal,
    probesConnected,
  })

  // 使用 CANVAS_PRESETS.full (840×650)，并留出右侧 280px 用于待测元件台 Overlay
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
    overlayRight: 280,
  })

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      {/* ── 核心 SVG 画布：多用电表巨型表头与换挡大旋钮 ── */}
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <MultimeterScene physics={physics} font={canvasSize.font} />
      </AnimationSvgCanvas>

      {/* ── 右侧 HTML 浮层 Overlay：待测元器件接线台与极性指南 ── */}
      <div className="absolute right-3 top-3 bottom-3 w-[265px] bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 p-3 shadow-md flex flex-col gap-2.5 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            待测器件接线台
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              physics.probesConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {physics.probesConnected ? '● 表笔已接触' : '○ 表笔断开'}
          </span>
        </div>

        {/* 待测元件卡片 */}
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold text-slate-700">
            {componentType === 0 && '🔲 定值电阻待测'}
            {componentType === 1 && '🔺 二极管（黑笔接正极）'}
            {componentType === 2 && '🔻 二极管（黑笔接负极）'}
            {componentType === 3 && '📦 未知黑箱元件'}
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>标称/等效阻值:</span>
            <span className="font-bold text-slate-800">
              {componentType === 1
                ? '≈ 25 Ω (正向导通)'
                : componentType === 2
                ? '≈ 5 MΩ (反向截止)'
                : `${physics.rActual} Ω`}
            </span>
          </div>
        </div>

        {/* 换挡与调零诊断提示 */}
        <div
          className={`p-2 rounded-lg border text-[11px] ${
            physics.advice === 'switch_larger'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : physics.advice === 'switch_smaller'
              ? 'bg-sky-50 border-sky-200 text-sky-800'
              : physics.advice === 'adjust_zero'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="font-bold mb-0.5">
            {physics.advice === 'switch_larger' && '⚠️ 指针偏角过小（偏左）'}
            {physics.advice === 'switch_smaller' && '⚠️ 指针偏角过大（偏右）'}
            {physics.advice === 'adjust_zero' && '⚠️ 欧姆调零未对准'}
            {physics.advice === 'ok' && '✅ 处于适宜读数测量区'}
          </div>
          <p className="text-[10px] leading-relaxed">
            {physics.advice === 'switch_larger' &&
              '指针在刻度密集区误差过大，应换用【更大倍率挡】，换挡后切记重新欧姆调零！'}
            {physics.advice === 'switch_smaller' &&
              '指针偏角过大接近0Ω，应换用【更小倍率挡】，换挡后切记重新欧姆调零！'}
            {physics.advice === 'adjust_zero' &&
              '红黑表笔短接后，必须调节欧姆调零旋钮使指针精确对准右端 0Ω 刻度。'}
            {physics.advice === 'ok' &&
              '指针指在刻度盘中央（中值电阻附近），此时阻值读取相对误差最小。'}
          </p>
        </div>

        {/* 红黑表笔极性特别提醒 */}
        <div className="mt-auto p-2 bg-slate-100 rounded-lg border border-slate-200 text-[10px] text-slate-600">
          <div className="font-bold text-slate-700 mb-1">⚡ 红进黑出极性法则</div>
          <p className="leading-tight text-slate-500">
            内部电源正极接黑表笔，负极接红表笔；测二极管时黑表笔接二极管正极时正向导通。
          </p>
        </div>
      </div>
    </div>
  )
}

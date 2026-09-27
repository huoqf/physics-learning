import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useMultimeterPhysics } from './hooks/useMultimeterPhysics'
import { MultimeterScene } from './components/MultimeterScene'
import { PHYSICS_COLORS, CANVAS_COLORS, CIRCUIT_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

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

        {/* 🔬 高考核心：欧姆挡内部原理电路图 */}
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-1">
          <div className="font-bold text-[11px] text-slate-800 flex items-center justify-between">
            <span>🔬 欧姆挡内部等效电路</span>
            <span className="text-[9px] font-normal text-slate-500">高考核心考点</span>
          </div>
          {/* 原理图 SVG 矢量微缩电路 */}
          <div className="w-full bg-white rounded border border-slate-200 p-1 flex justify-center">
            <svg viewBox="0 0 240 100" className="w-full h-24">
              {/* 回路导线 */}
              <rect x="25" y="15" width="190" height="70" rx="6" fill="none" stroke={CIRCUIT_COLORS.wire} strokeWidth="1.5" />
              
              {/* 顶部：表头 G 与 调零电阻 R_Ω */}
              {/* 表头 G */}
              <circle cx="85" cy="15" r="11" fill={CANVAS_COLORS.white} stroke={PHYSICS_COLORS.velocity} strokeWidth="1.5" />
              <text x="85" y="18" fill={PHYSICS_COLORS.velocity} fontSize="10" fontWeight="bold" textAnchor="middle">G</text>
              <text x="85" y="4" fill={CANVAS_COLORS.textMuted} fontSize="8" textAnchor="middle">Ig, Rg</text>

              {/* 调零电阻 R_Ω */}
              <rect x="135" y="8" width="28" height="14" rx="2" fill={colors.neutral[100]} stroke={PHYSICS_COLORS.acceleration} strokeWidth="1.2" />
              <line x1="149" y1="2" x2="149" y2="8" stroke={PHYSICS_COLORS.acceleration} strokeWidth="1.2" />
              <polygon points="149,8 147,5 151,5" fill={PHYSICS_COLORS.acceleration} />
              <text x="149" y="30" fill={PHYSICS_COLORS.acceleration} fontSize="8" fontWeight="bold" textAnchor="middle">R_Ω (调零)</text>

              {/* 右侧：红表笔与负极插孔（红进） */}
              <circle cx="215" cy="50" r="4" fill={PHYSICS_COLORS.electricCurrent} />
              <text x="228" y="53" fill={PHYSICS_COLORS.electricCurrent} fontSize="9" fontWeight="bold">红 (-)</text>

              {/* 底部：内部电源 E, r */}
              <g transform="translate(100, 85)">
                <line x1="10" y1="-8" x2="10" y2="8" stroke={PHYSICS_COLORS.magneticField} strokeWidth="2.5" />
                <line x1="20" y1="-14" x2="20" y2="14" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="1.5" />
                <text x="5" y="4" fill={PHYSICS_COLORS.magneticField} fontSize="9" fontWeight="bold">-</text>
                <text x="25" y="4" fill={PHYSICS_COLORS.electricCurrent} fontSize="9" fontWeight="bold">+</text>
                <text x="15" y="-12" fill={CANVAS_COLORS.labelText} fontSize="8" textAnchor="middle">E, r</text>
              </g>

              {/* 左侧：黑表笔与正极插孔（黑出） */}
              <circle cx="25" cy="50" r="4" fill={CANVAS_COLORS.labelText} />
              <text x="12" y="53" fill={CANVAS_COLORS.labelText} fontSize="9" fontWeight="bold" textAnchor="end">黑 (+)</text>

              {/* 外接待测件 Rx */}
              <g transform="translate(120, 50)">
                <rect x="-16" y="-8" width="32" height="16" rx="2" fill={colors.accent[100]} stroke={colors.accent[600]} strokeWidth="1.2" />
                <text x="0" y="3" fill={colors.accent[700]} fontSize="8" fontWeight="bold" textAnchor="middle">
                  {physics.probesConnected ? 'Rx 接入' : '表笔断开'}
                </text>
                {/* 连到表笔的测试探针 */}
                <line x1="-16" y1="0" x2="-95" y2="0" stroke={CANVAS_COLORS.labelText} strokeWidth="1.2" strokeDasharray="3,2" />
                <line x1="16" y1="0" x2="95" y2="0" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="1.2" strokeDasharray="3,2" />
              </g>
            </svg>
          </div>
          <div className="text-[9.5px] text-slate-500 font-mono text-center">
            {'闭合回路：I = E / (Rg + R_Ω + r + Rx)'}
          </div>
        </div>

        {/* 红黑表笔极性特别提醒 */}
        <div className="mt-auto p-2 bg-slate-100 rounded-lg border border-slate-200 text-[10px] text-slate-600">
          <div className="font-bold text-slate-700 mb-0.5">⚡ 红进黑出极性法则</div>
          <p className="leading-tight text-slate-500">
            内部电池负极接红表笔，正极接黑表笔；电流从红表笔流入电表，从黑表笔流出。
          </p>
        </div>
      </div>
    </div>
  )
}

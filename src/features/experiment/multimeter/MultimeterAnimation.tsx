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
          {/* 原理图 SVG 矢量微缩电路：串联闭合回路（电池 → R_Ω → 表头 G → 红表笔 → Rx → 黑表笔） */}
          <div className="w-full bg-white rounded border border-slate-200 p-1 flex justify-center">
            <svg viewBox="0 0 240 100" className="w-full h-24">
              {/* 端到端分段导线（回路：上部干路 + 左右竖线 + 下部外接支路） */}
              {/* 左上角 → 表头 G 左端 */}
              <line x1="22" y1="28" x2="58" y2="28" stroke={CIRCUIT_COLORS.wire} strokeWidth="1.5" />
              {/* 表头 G 右端 → 调零电阻左端 */}
              <line x1="82" y1="28" x2="106" y2="28" stroke={CIRCUIT_COLORS.wire} strokeWidth="1.5" />
              {/* 调零电阻右端 → 电池负极板 */}
              <line x1="150" y1="28" x2="180" y2="28" stroke={CIRCUIT_COLORS.wire} strokeWidth="1.5" />
              {/* 电池正极板 → 右上角 */}
              <line x1="190" y1="28" x2="218" y2="28" stroke={CIRCUIT_COLORS.wire} strokeWidth="1.5" />
              {/* 右侧竖线：正极 → 黑表笔 */}
              <line x1="218" y1="28" x2="218" y2="78" stroke={CIRCUIT_COLORS.wire} strokeWidth="1.5" />
              {/* 左侧竖线：红表笔 → 表头 G 左端 */}
              <line x1="22" y1="28" x2="22" y2="78" stroke={CIRCUIT_COLORS.wire} strokeWidth="1.5" />
              {/* 下部分段：红表笔 → Rx，Rx → 黑表笔 */}
              <line x1="22" y1="78" x2="104" y2="78" stroke={CIRCUIT_COLORS.wire} strokeWidth="1.5" />
              <line x1="136" y1="78" x2="218" y2="78" stroke={CIRCUIT_COLORS.wire} strokeWidth="1.5" />

              {/* 上部干路：表头 G（Ig, Rg） */}
              <circle cx="70" cy="28" r="12" fill={CANVAS_COLORS.white} stroke={PHYSICS_COLORS.velocity} strokeWidth="1.5" />
              <text x="70" y="31" fill={PHYSICS_COLORS.velocity} fontSize="10" fontWeight="bold" textAnchor="middle">G</text>
              <text x="70" y="11" fill={CANVAS_COLORS.textMuted} fontSize="8" textAnchor="middle">Ig, Rg</text>

              {/* 上部干路：调零电阻 R_Ω（滑线变阻器符号，串联在表头与电池之间） */}
              <rect x="106" y="21" width="44" height="14" rx="2" fill={colors.neutral[100]} stroke={PHYSICS_COLORS.acceleration} strokeWidth="1.2" />
              <line x1="128" y1="14" x2="128" y2="21" stroke={PHYSICS_COLORS.acceleration} strokeWidth="1.2" />
              <polygon points="128,21 126,17 130,17" fill={PHYSICS_COLORS.acceleration} />
              <text x="128" y="48" fill={PHYSICS_COLORS.acceleration} fontSize="8" fontWeight="bold" textAnchor="middle">R_Ω (调零)</text>

              {/* 上部干路：内部电池 E, r —— 负极（短板）朝向表头侧，正极（长板）接黑表笔 */}
              <line x1="180" y1="22" x2="180" y2="34" stroke={PHYSICS_COLORS.magneticField} strokeWidth="2.6" />
              <line x1="190" y1="17" x2="190" y2="39" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="1.4" />
              <text x="180" y="46" fill={PHYSICS_COLORS.magneticField} fontSize="9" fontWeight="bold" textAnchor="middle">-</text>
              <text x="190" y="46" fill={PHYSICS_COLORS.electricCurrent} fontSize="9" fontWeight="bold" textAnchor="middle">+</text>
              <text x="185" y="11" fill={CANVAS_COLORS.labelText} fontSize="8" textAnchor="middle">E, r</text>

              {/* 左端接线柱：红表笔（接内部电源负极） */}
              <circle cx="22" cy="78" r="4" fill={PHYSICS_COLORS.electricCurrent} />
              <text x="2" y="92" fill={PHYSICS_COLORS.electricCurrent} fontSize="8" fontWeight="bold" textAnchor="start">红表笔 (-)</text>

              {/* 右端接线柱：黑表笔（接内部电源正极） */}
              <circle cx="218" cy="78" r="4" fill={CANVAS_COLORS.labelText} />
              <text x="238" y="92" fill={CANVAS_COLORS.labelText} fontSize="8" fontWeight="bold" textAnchor="end">黑表笔 (+)</text>

              {/* 下支路：外接待测件 Rx（与电表串联） */}
              <rect x="104" y="71" width="32" height="14" rx="2" fill={colors.accent[100]} stroke={colors.accent[600]} strokeWidth="1.2" />
              <text x="120" y="81" fill={colors.accent[700]} fontSize="8" fontWeight="bold" textAnchor="middle">
                {physics.probesConnected ? 'Rx' : '断开'}
              </text>
            </svg>
          </div>
          <div className="text-[9.5px] text-slate-500 font-mono text-center">
            {'串联回路：I = E / (Rg + R_Ω + r + Rx)'}
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

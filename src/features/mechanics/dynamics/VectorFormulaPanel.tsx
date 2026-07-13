import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { Card, KatexFormula } from '@/components/UI'
import { useVectorAdditionPhysics } from './useVectorAdditionPhysics'

export default function VectorFormulaPanel() {
  const { params } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
    }))
  )

  const f1 = params.f1 ?? 10
  const f2 = params.f2 ?? 8
  const angle = params.angle ?? 60
  const phi = params.phi ?? 0
  const mode = params.mode ?? 0

  // 物理计算 Hook 调用
  const physicsData = useVectorAdditionPhysics({
    f1,
    f2,
    angle,
    phi,
    mode,
    canvasWidth: 0,
    canvasHeight: 0,
    scale: 1,
    time: 0,
    isPlaying: false,
  })

  const { fResultant, resultAngleDeg, fxVal, fyVal } = physicsData

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3 overflow-y-auto">
      <h3 className="text-base font-bold text-neutral-800 flex items-center gap-1.5 border-b border-neutral-200 pb-1.5">
        <span className="text-blue-500">📐</span>
        <span>{mode === 2 ? '力的正交分解公式' : '力的合成计算与推导'}</span>
      </h3>

      {mode === 2 ? (
        // ==========================================
        // 正交分解公式展示
        // ==========================================
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 bg-neutral-50 border border-neutral-100 rounded-lg p-2.5 text-center text-xs">
            <div>
              <div className="text-neutral-500">待分解力 F</div>
              <div className="font-bold text-neutral-800 mt-0.5">{f1.toFixed(1)} N</div>
            </div>
            <div>
              <div className="text-neutral-500">偏角 θ</div>
              <div className="font-bold text-neutral-800 mt-0.5">{angle.toFixed(0)}°</div>
            </div>
          </div>

          <Card className="p-3 border border-neutral-200 bg-white flex flex-col gap-2">
            <div className="text-xs font-bold text-neutral-800">1. 分解公式</div>
            <div className="flex flex-col gap-2 bg-neutral-50 border border-neutral-100 p-2.5 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <span>水平分量:</span>
                <KatexFormula formula={`F_x = F \\cos\\theta = ${f1.toFixed(1)} \\times \\cos(${angle.toFixed(0)}^\\circ) = ${fxVal.toFixed(2)} \\text{ N}`} mode="inline" />
              </div>
              <div className="flex items-center justify-between text-xs border-t border-neutral-100 pt-1.5">
                <span>竖直分量:</span>
                <KatexFormula formula={`F_y = F \\sin\\theta = ${f1.toFixed(1)} \\times \\sin(${angle.toFixed(0)}^\\circ) = ${fyVal.toFixed(2)} \\text{ N}`} mode="inline" />
              </div>
            </div>
          </Card>

          <Card className="p-3 border border-neutral-200 bg-white">
            <div className="text-xs font-bold text-neutral-800 mb-1">💡 物理方法论</div>
            <p className="text-[11px] text-neutral-500 leading-normal">
              正交分解法将平面矢量运算转换为代数标量运算。任何一个大小为 $F$、与 $x$ 轴夹角为 $\theta$ 的共点力，在直角坐标系下都可以唯一分解为 $F_x = F \cos\theta$ 和 $F_y = F \sin\theta$ 两个等效的正交分量。
            </p>
          </Card>
        </div>
      ) : (
        // ==========================================
        // 力的合成公式展示
        // ==========================================
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2 bg-neutral-50 border border-neutral-100 rounded-lg p-2 text-center text-xs">
            <div>
              <div className="text-neutral-500">分力 F₁</div>
              <div className="font-bold text-blue-600 mt-0.5">{f1.toFixed(1)} N</div>
            </div>
            <div>
              <div className="text-neutral-500">分力 F₂</div>
              <div className="font-bold text-emerald-600 mt-0.5">{f2.toFixed(1)} N</div>
            </div>
            <div>
              <div className="text-neutral-500">夹角 θ</div>
              <div className="font-bold text-neutral-800 mt-0.5">{angle.toFixed(0)}°</div>
            </div>
          </div>

          <Card className="p-3 border border-neutral-200 bg-white flex flex-col gap-2">
            <div className="text-xs font-bold text-neutral-800">1. 合力计算公式 (余弦定理)</div>
            <div className="my-1.5 flex justify-center bg-neutral-50 border border-neutral-100 p-2.5 rounded-lg">
              <KatexFormula
                formula={`F = \\sqrt{F_1^2 + F_2^2 + 2F_1F_2\\cos\\theta}`}
                mode="block"
              />
            </div>
            <div className="text-xs text-neutral-700 space-y-1">
              <div className="flex justify-between items-center bg-neutral-50 p-2 rounded">
                <span>代入数值计算合力:</span>
                <span className="font-bold text-rose-500">{fResultant.toFixed(2)} N</span>
              </div>
              <div className="flex justify-between items-center bg-neutral-50 p-2 rounded">
                <span>合力与 F₁ 夹角 α:</span>
                <span className="font-bold text-neutral-800">{resultAngleDeg.toFixed(1)}°</span>
              </div>
            </div>
          </Card>

          <Card className="p-3 border border-neutral-200 bg-white">
            <div className="text-xs font-bold text-neutral-800 mb-1">💡 平行四边形与三角形定则</div>
            <p className="text-[11px] text-neutral-500 leading-normal">
              <strong>平行四边形定则</strong>是共点力合成的基本法则。以表示分力的线段为邻边作平行四边形，对角线即表示合力的大小和方向。<br />
              <strong>三角形定则</strong>则是将分力首尾相接，从第一个力的起点指向最后一个力的末端的有向线段即为合力。
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}

import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { ViewportInfo } from '@/utils'

type ChartPoint = { x: number; y: number }

type ChartMarker = {
  axis: 'point' | 'vertical' | 'horizontal'
  x: number
  label: string
  color: string
}

export interface LightRodRopeChartsData {
  et1: ChartPoint[]
  et2: ChartPoint[]
  etot: ChartPoint[]
  pt1: ChartPoint[]
  pt2: ChartPoint[]
  vHA: ChartPoint[]
  vHB: ChartPoint[]
  tTheta: ChartPoint[]
  vAt: ChartPoint[]
  vBt: ChartPoint[]
  tOA: ChartPoint[]
  tAB: ChartPoint[]
}

interface LightRodRopeChartsProps {
  constraint: number
  vp: Pick<ViewportInfo, 'tx' | 'ty' | 'scale'>
  chartsData: LightRodRopeChartsData
  tMax: number
  eMax: number
  pMax: number
  time: number
  curHB: number
  curThetaB: number
  chartMarkers: ChartMarker[]
}

export function LightRodRopeCharts({
  constraint,
  vp,
  chartsData,
  tMax,
  eMax,
  pMax,
  time,
  curHB,
  curThetaB,
  chartMarkers,
}: LightRodRopeChartsProps) {
  return (
    <foreignObject
      x={vp.tx + 370 * vp.scale}
      y={vp.ty + 10 * vp.scale}
      width={310 * vp.scale}
      height={400 * vp.scale}
    >
      <div className="w-full h-full flex flex-col" style={{ gap: `${20 * vp.scale}px` }}>
        {constraint === 0 ? (
          // 刚性轻杆模式下：原有双曲线图
          <>
            <div className="flex-1 min-h-0">
              <RelationChart
                points={chartsData.et1}
                mainLabel="A球机械能 EA"
                color={PHYSICS_COLORS.velocity}
                additionalSeries={[
                  {
                    points: chartsData.et2,
                    label: 'B球机械能 EB',
                    color: PHYSICS_COLORS.power,
                  },
                  {
                    points: chartsData.etot,
                    label: '系统总能 E总',
                    color: PHYSICS_COLORS.mechanicalEnergy,
                    strokeWidth: 2,
                  },
                ]}
                xDomain={[0, tMax]}
                yDomain={[0, eMax]}
                xLabel="时间 t (s)"
                yLabel="能量 E (J)"
                title="能量-时间 (E-t) 曲线"
                cursorX={time}
              />
            </div>

            <div className="flex-1 min-h-0">
              <RelationChart
                points={chartsData.pt1}
                mainLabel="杆对 A 功率 PA"
                color={PHYSICS_COLORS.velocity}
                additionalSeries={[
                  {
                    points: chartsData.pt2,
                    label: '杆对 B 功率 PB',
                    color: PHYSICS_COLORS.power,
                  },
                ]}
                xDomain={[0, tMax]}
                yDomain={[-pMax, pMax]}
                xLabel="时间 t (s)"
                yLabel="功率 P (W)"
                title="瞬时功率-时间 (P-t) 曲线"
                cursorX={time}
                showZeroLine={true}
              />
            </div>
          </>
        ) : constraint === 1 ? (
          // 双绳分系高考模式下：两个关联曲线图并列纵向展示（不切换）
          <>
            <div className="flex-1 min-h-0">
              <RelationChart
                key="vh-chart"
                points={chartsData.vHA}
                mainLabel="A球速度 vA"
                color={PHYSICS_COLORS.velocity}
                additionalSeries={[
                  {
                    points: chartsData.vHB,
                    label: 'B球速度 vB',
                    color: PHYSICS_COLORS.power,
                  },
                ]}
                xLabel="B球下落高度 h_B (m)"
                yLabel="速度 v (m/s)"
                title="速度-高度 (v-h_B) 曲线"
                cursorX={curHB}
              />
            </div>

            <div className="flex-1 min-h-0">
              <RelationChart
                key="Ttheta-chart"
                points={chartsData.tTheta}
                mainLabel="绳子张力 T"
                color={PHYSICS_COLORS.velocity}
                xLabel="B绳与竖直方向偏角 θ (°)"
                yLabel="张力 T (N)"
                title="张力-偏角 (T-θ) 曲线"
                cursorX={curThetaB}
              />
            </div>
          </>
        ) : (
          // constraint === 2: 轻绳三阶段高考模型下，并存展示 v-t 速度与 F-t 张力时间曲线图 (带状态拉直/松弛突变虚线标注)
          <>
            <div className="flex-1 min-h-0">
              <RelationChart
                key="vt-chart"
                points={chartsData.vAt}
                mainLabel="A球速度 vA"
                color={PHYSICS_COLORS.velocity}
                additionalSeries={[
                  {
                    points: chartsData.vBt,
                    label: 'B球速度 vB',
                    color: PHYSICS_COLORS.power,
                  },
                ]}
                xDomain={[0, tMax]}
                xLabel="时间 t (s)"
                yLabel="速度 v (m/s)"
                title="速度-时间 (v-t) 曲线"
                cursorX={time}
                markers={chartMarkers}
              />
            </div>

            <div className="flex-1 min-h-0">
              <RelationChart
                key="Ft-chart"
                points={chartsData.tOA}
                mainLabel="OA绳张力 T_OA"
                color={PHYSICS_COLORS.velocity}
                additionalSeries={[
                  {
                    points: chartsData.tAB,
                    label: 'AB绳张力 T_AB',
                    color: PHYSICS_COLORS.power,
                  },
                ]}
                xDomain={[0, tMax]}
                xLabel="时间 t (s)"
                yLabel="张力 T (N)"
                title="绳中张力-时间 (F-t) 曲线"
                cursorX={time}
                markers={chartMarkers}
              />
            </div>
          </>
        )}
      </div>
    </foreignObject>
  )
}

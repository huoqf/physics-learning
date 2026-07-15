import { useMemo } from 'react'
import { VelocityTimeChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import { computeVTPoints } from '@/physics/work'
import type { WorkKinematics } from '@/physics/work'

interface WorkVTChartProps {
  /**
   * 保留旧接口以减少 WorkAnimation 调用面变更。
   * 组件已迁移到公共 VelocityTimeChart，字号由 BasePhysicsChart 自适应管理。
   */
  font: (size: number) => number
  kinematics: WorkKinematics
  currentTime: number
  maxAnimTime: number
}

/**
 * 恒力做功场景的 v-t 图。
 *
 * 说明：该组件原先是手写 SVG 坐标图，单独维护坐标轴、网格、参考线、游标与硬编码定标。
 * 现在改为薄适配层：数据语义仍来自 WorkKinematics，渲染统一交给公共 VelocityTimeChart。
 */
export function WorkVTChart({
  font,
  kinematics,
  currentTime,
  maxAnimTime,
}: WorkVTChartProps) {
  const { a, t_total } = kinematics

  const points = useMemo(() => computeVTPoints(kinematics, 80), [kinematics])

  const tMax = isFinite(t_total) && t_total > 0 ? t_total * 1.15 : 10
  const progress = Math.min(currentTime / maxAnimTime, 1)
  const currentT = isFinite(t_total) && t_total > 0 ? progress * progress * t_total : 0

  return (
    <div className="w-full h-full relative">
      <VelocityTimeChart
        mode="animated"
        points={points}
        domainPoints={points}
        referencePoints={points}
        currentTime={currentT}
        tMax={tMax}
        xLabel="t (s)"
        yLabel="v (m/s)"
        title="v-t"
        series="primary"
        showCursor={currentT > 0}
        showReferenceLine
        referenceColor={PHYSICS_COLORS.labelTextLight}
        referenceOpacity={0.45}
      />
      <div
        className="absolute pointer-events-none font-bold"
        style={{
          top: 8,
          right: 8,
          fontSize: font(10),
          lineHeight: '14px',
          color: PHYSICS_COLORS.labelTextLight,
        }}
      >
        v(t)=at<br />a={a.toFixed(2)} m/s²
      </div>
    </div>
  )
}

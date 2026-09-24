import { PhysicsGround, PhysicsVectorArrow } from '@/components/Physics'
import {
  THERMO_COLORS,
  DYNAMICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  withAlpha,
  STROKE,
} from '@/theme/physics'
import type { SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CanvasSize } from '@/utils'
import type { SolidsLiquidsPhysicsResult } from '../hooks/useSolidsLiquidsPhysics'

interface SolidsLiquidsSceneProps {
  physics: SolidsLiquidsPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  mode: number
  solidType: number
  isMercury: number
  gamma: number
}

export function SolidsLiquidsScene({
  physics,
  canvasSize,
  sceneScale,
  vp,
  mode,
  solidType,
  isMercury,
}: SolidsLiquidsSceneProps) {
  const { font } = canvasSize

  return (
    <g>
      {/* 底部基座 */}
      <PhysicsGround
        x={vp.designLeft}
        y={580}
        width={vp.designVisibleW}
        type="ground"
      />

      {/* 模式 0: 晶体与非晶体微观结构与导热各向异性实验 */}
      {mode === 0 && (
        <g>
          {/* 左半侧: 空间点阵微观结构演示 */}
          <rect
            x={100}
            y={120}
            width={300}
            height={320}
            rx={8}
            fill={withAlpha(SCENE_COLORS.materials.structBgPale, 0.5)}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1.5}
          />
          <text
            x={250}
            y={150}
            fontSize={font(13)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            {solidType === 0 ? '单晶体空间点阵 (规则点阵)' : solidType === 1 ? '多晶体晶畴结构 (微晶杂乱)' : '非晶体分子排列 (无序结构)'}
          </text>

          {/* 渲染微观分子球与点阵连线 */}
          <g transform="translate(160, 180)">
            {/* 单晶体绘制规则虚线晶格骨架 */}
            {solidType === 0 && (
              <g stroke={CANVAS_COLORS.grid} strokeDasharray="2 2" strokeWidth={1}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <line key={`h-${i}`} x1={0} y1={i * 24} x2={144} y2={i * 24} />
                ))}
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <line key={`v-${i}`} x1={i * 24} y1={0} x2={i * 24} y2={144} />
                ))}
              </g>
            )}

            {/* 分子小球 */}
            {physics.latticeNodes.map((node, idx) => (
              <circle
                key={idx}
                cx={node.x}
                cy={node.y}
                r={5.5}
                fill={node.isCrystal ? THERMO_COLORS.temperatureLow : THERMO_COLORS.phaseChange}
                stroke={CANVAS_COLORS.strokeDark}
                strokeWidth={1}
              />
            ))}
          </g>

          {/* 右半侧: 石蜡导热融化实验（纯物理实验场景，无大段教学文字） */}
          <rect
            x={440}
            y={120}
            width={300}
            height={320}
            rx={8}
            fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.8)}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1.5}
          />
          <text
            x={590}
            y={150}
            fontSize={font(13)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            {solidType === 0 ? '云母薄片石蜡融化 (各向异性)' : '玻璃/多晶薄片石蜡融化 (各向同性)'}
          </text>

          {/* 薄片基底 */}
          <rect
            x={490}
            y={180}
            width={200}
            height={200}
            rx={4}
            fill={withAlpha(SCENE_COLORS.materials.structFill, 0.15)}
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={2}
          />

          {/* 石蜡融化形态：单晶体为椭圆形；非晶体/多晶体为正圆形 */}
          {solidType === 0 ? (
            <ellipse
              cx={590}
              cy={280}
              rx={75}
              ry={45}
              fill={withAlpha(THERMO_COLORS.phaseChange, 0.4)}
              stroke={THERMO_COLORS.temperature}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          ) : (
            <circle
              cx={590}
              cy={280}
              r={55}
              fill={withAlpha(THERMO_COLORS.phaseChange, 0.4)}
              stroke={THERMO_COLORS.temperature}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}

          {/* 中心热针加热点 */}
          <circle cx={590} cy={280} r={5} fill={THERMO_COLORS.temperatureHigh} />
          <text x={590} y={260} fontSize={font(11)} fill={THERMO_COLORS.temperatureHigh} textAnchor="middle">
            烧热铁针
          </text>

          <text
            x={590}
            y={415}
            fontSize={font(11)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            {solidType === 0 ? '融化区域：椭圆形 (导热各向异性)' : '融化区域：正圆形 (导热各向同性)'}
          </text>
        </g>
      )}

      {/* 模式 1: 表面张力与微观机理 */}
      {mode === 1 && (
        <g>
          {/* 左侧：金属丝框拉膜实验模拟 */}
          <g transform="translate(120, 160)">
            <rect
              x={0}
              y={0}
              width={260}
              height={260}
              rx={4}
              fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.1)}
              stroke={SCENE_COLORS.materials.structStroke}
              strokeWidth={3}
            />
            {/* U型金属框内部双面肥皂液膜 */}
            <rect
              x={4}
              y={4}
              width={200}
              height={252}
              fill={withAlpha(THERMO_COLORS.phaseChange, 0.2)}
            />
            {/* 可滑动活动边金属丝 */}
            <line
              x1={204}
              y1={-10}
              x2={204}
              y2={270}
              stroke={DYNAMICS_COLORS.appliedForce}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <text
              x={204}
              y={-18}
              fontSize={font(12)}
              fill={DYNAMICS_COLORS.appliedForce}
              textAnchor="middle"
            >
              活动细金属杆 (L = 8cm)
            </text>

            {/* 表面张力拉力矢量 F = 2γL (向左) */}
            <PhysicsVectorArrow
              originDesign={{ x: 204, y: 130 }}
              vector={{ x: -physics.surfaceForce * 10, y: 0 }}
              type="force"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text
              x={130}
              y={120}
              fontSize={font(12)}
              fontWeight="bold"
              fill={DYNAMICS_COLORS.forceNet}
            >
              {`F = 2γL = ${(physics.surfaceForce * 1000).toFixed(1)} mN`}
            </text>
          </g>

          {/* 右侧：自由液滴收缩成球形微观示意 */}
          <g transform="translate(480, 160)">
            <rect
              x={0}
              y={0}
              width={260}
              height={260}
              rx={6}
              fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.6)}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={1.5}
            />
            <text
              x={130}
              y={35}
              fontSize={font(13)}
              fontWeight="bold"
              fill={CANVAS_COLORS.labelText}
              textAnchor="middle"
            >
              表面层分子引力促使表面积收缩
            </text>

            {/* 液滴球形截面 */}
            <circle
              cx={130}
              cy={145}
              r={65}
              fill={withAlpha(THERMO_COLORS.temperatureLow, 0.35)}
              stroke={THERMO_COLORS.temperatureLow}
              strokeWidth={2}
            />

            {/* 表面张力切线箭头 */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180
              const cx = 130 + 65 * Math.cos(rad)
              const cy = 145 + 65 * Math.sin(rad)
              return (
                <circle
                  key={deg}
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  fill={DYNAMICS_COLORS.friction}
                />
              )
            })}
            <text
              x={130}
              y={235}
              fontSize={font(11)}
              fill={CANVAS_COLORS.textMuted}
              textAnchor="middle"
            >
              表面层分子间距 r &gt; r0 (表现为分子引力)
            </text>
          </g>
        </g>
      )}

      {/* 模式 2: 浸润与毛细现象 */}
      {mode === 2 && (
        <g transform="translate(180, 140)">
          {/* 大器皿液体底槽 */}
          <rect
            x={0}
            y={240}
            width={480}
            height={160}
            rx={4}
            fill={withAlpha(isMercury === 1 ? CANVAS_COLORS.strokeDark : THERMO_COLORS.temperatureLow, 0.4)}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={2}
          />
          <text
            x={240}
            y={370}
            fontSize={font(13)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            {isMercury === 1 ? '不浸润液体 (接触角 θ &gt; 90°)' : '浸润液体 (接触角 θ &lt; 90°)'}
          </text>

          {/* 插入细玻璃毛细管 */}
          <rect
            x={215}
            y={50}
            width={50}
            height={300}
            fill="none"
            stroke={SCENE_COLORS.materials.structStroke}
            strokeWidth={2}
          />

          {/* 管内毛细液柱 (基于物理高度计算，像素比例映射) */}
          {(() => {
            const risePx = Math.max(-100, Math.min(150, physics.capillaryRise.h * 2000))
            const liquidLevelY = 240 - risePx

            return (
              <g>
                <rect
                  x={217}
                  y={liquidLevelY}
                  width={46}
                  height={390 - liquidLevelY}
                  fill={withAlpha(isMercury === 1 ? CANVAS_COLORS.strokeDark : THERMO_COLORS.temperatureLow, 0.7)}
                />
                {/* 弯月液面：凹液面 vs 凸液面 */}
                <ellipse
                  cx={240}
                  cy={liquidLevelY}
                  rx={23}
                  ry={6}
                  fill={isMercury === 1 ? CANVAS_COLORS.strokeDark : THERMO_COLORS.temperatureLow}
                />
                {/* 高度标注虚线与文字 */}
                <line
                  x1={160}
                  y1={liquidLevelY}
                  x2={320}
                  y2={liquidLevelY}
                  stroke={DYNAMICS_COLORS.appliedForce}
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
                <text
                  x={330}
                  y={liquidLevelY + 4}
                  fontSize={font(12)}
                  fontWeight="bold"
                  fill={DYNAMICS_COLORS.appliedForce}
                >
                  {`h = ${(physics.capillaryRise.h * 1000).toFixed(1)} mm (${physics.capillaryRise.isWetting ? '上升' : '下降'})`}
                </text>
              </g>
            )
          })()}
        </g>
      )}
    </g>
  )
}

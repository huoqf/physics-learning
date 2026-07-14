import { useRef } from 'react'
import { worldToDesign } from '@/scene'
import { AnimationSvgCanvas } from '@/components/Layout'
import { PhysicsGround, Block, Incline, VectorArrow, PhysicsVectorArrow, VectorDefs } from '@/components/Physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useSystemIsolatedPhysics } from './hooks/useSystemIsolatedPhysics'

export default function SystemIsolatedMethodologyAnimation() {
  const p = useSystemIsolatedPhysics()
  const svgRef = useRef<SVGSVGElement>(null)

  const {
    vp,
    canvasSize,
    sceneScale,
    modelType,
    analysisView,
    activeObject,
    m1,
    m2,
    F,
    theta,
    time,
    g,
    thetaRad,
    groundY,
    model0,
    model1,
    model2,
  } = p

  // 1. 地面设计坐标 (Edge-to-edge 撑满可视区，符合铁律 1.8 & 场景 6)
  const groundY_design = worldToDesign(0, groundY, sceneScale).py

  // 2. 整体法包裹虚线框的 opacity 与高亮状态判断
  const isSystemView = analysisView === 0
  const isIsolatedView = analysisView === 1

  return (
    <div className="w-full h-full relative select-none">
      <AnimationSvgCanvas
        containerRef={p.containerRef}
        transform={vp.transform}
        svgRef={svgRef}
      >
        {/* 标准粗糙地面 */}
        <PhysicsGround
          x={vp.designLeft}
          y={groundY_design}
          width={vp.designVisibleW}
          type="ground"
          appearance={{
            showHatch: true,
            color: PHYSICS_COLORS.labelText,
          }}
        />

        {/* ==================== 模型 0：同加速连接体 (拉车) ==================== */}
        {modelType === 0 && (
          <g>
            {/* 整体法虚线包裹框 */}
            {isSystemView && (
              <g>
                {(() => {
                  const m1_lt = worldToDesign(model0.m1_pos.x - 0.2, model0.m1_pos.y + model0.h1 + 0.3, sceneScale)
                  const m2_rb = worldToDesign(model0.m2_pos.x + model0.w2 + 0.2, model0.m2_pos.y - 0.1, sceneScale)
                  return (
                    <g>
                      <rect
                        x={m1_lt.px}
                        y={m1_lt.py}
                        width={m2_rb.px - m1_lt.px}
                        height={m2_rb.py - m1_lt.py}
                        fill="rgba(34, 197, 94, 0.05)"
                        stroke="#22c55e"
                        strokeWidth={2}
                        strokeDasharray="5,4"
                        rx={6}
                      />
                      <rect
                        x={(m1_lt.px + m2_rb.px) / 2 - 60}
                        y={m1_lt.py - 12}
                        width={120}
                        height={20}
                        fill="#22c55e"
                        rx={4}
                      />
                      <text
                        x={(m1_lt.px + m2_rb.px) / 2}
                        y={m1_lt.py + 2}
                        fontSize={canvasSize.font(10)}
                        fill="white"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        整体 M = {(m1 + m2).toFixed(1)}kg
                      </text>
                    </g>
                  )
                })()}
              </g>
            )}

            {/* 物体 m1 */}
            {(() => {
              const opacity = isIsolatedView && activeObject !== 0 ? 0.15 : 1
              const lt = worldToDesign(model0.m1_pos.x, model0.m1_pos.y + model0.h1, sceneScale)
              const w = model0.w1 * sceneScale.scaleX
              const h = model0.h1 * sceneScale.scaleY
              return (
                <g opacity={opacity} className="transition-opacity duration-200">
                  <Block
                    x={lt.px}
                    y={lt.py}
                    width={w}
                    height={h}
                    type="standard"
                    label={`m₁ = ${m1}kg`}
                    font={canvasSize.font}
                    translucent={isIsolatedView && activeObject === 0}
                  />
                </g>
              )
            })()}

            {/* 连接绳 */}
            {(() => {
              const pLeft = worldToDesign(model0.ropeLeft.x, model0.ropeLeft.y, sceneScale)
              const pRight = worldToDesign(model0.ropeRight.x, model0.ropeRight.y, sceneScale)
              const opacity = isSystemView ? 0.15 : 1
              return (
                <line
                  x1={pLeft.px}
                  y1={pLeft.py}
                  x2={pRight.px}
                  y2={pRight.py}
                  stroke={colors.neutral[800]}
                  strokeWidth={3}
                  strokeDasharray={isSystemView ? '3,3' : '0'}
                  opacity={opacity}
                  className="transition-opacity duration-200"
                />
              )
            })()}

            {/* 物体 m2 */}
            {(() => {
              const opacity = isIsolatedView && activeObject !== 1 ? 0.15 : 1
              const lt = worldToDesign(model0.m2_pos.x, model0.m2_pos.y + model0.h2, sceneScale)
              const w = model0.w2 * sceneScale.scaleX
              const h = model0.h2 * sceneScale.scaleY
              return (
                <g opacity={opacity} className="transition-opacity duration-200">
                  <Block
                    x={lt.px}
                    y={lt.py}
                    width={w}
                    height={h}
                    type="standard"
                    label={`m₂ = ${m2}kg`}
                    font={canvasSize.font}
                    translucent={isIsolatedView && activeObject === 1}
                  />
                </g>
              )
            })()}

            {/* 外力与内力受力分析箭头 */}
            {time >= 0 && (
              <g>
                {/* 整体法：只画外力 */}
                {isSystemView && (
                  <g>
                    {/* 拉力 F */}
                    <PhysicsVectorArrow
                      origin={model0.ropeRight}
                      vector={{ x: F, y: 0 }}
                      type="appliedForce"
                      sceneScale={sceneScale}
                      label={`F = ${F}N`}
                      font={canvasSize.font}
                      glow
                    />
                    {/* 整体重力 (m1+m2)g */}
                    <PhysicsVectorArrow
                      origin={{ x: (model0.m1_pos.x + model0.m2_pos.x + model0.w2) / 2, y: groundY + model0.h1 / 2 }}
                      vector={{ x: 0, y: -(m1 + m2) * g }}
                      type="gravity"
                      sceneScale={sceneScale}
                      label={`(m₁+m₂)g = ${((m1 + m2) * g).toFixed(1)}N`}
                      font={canvasSize.font}
                    />
                    {/* 整体地面对其的支持力 */}
                    <PhysicsVectorArrow
                      origin={{ x: (model0.m1_pos.x + model0.m2_pos.x + model0.w2) / 2, y: groundY }}
                      vector={{ x: 0, y: (m1 + m2) * g }}
                      type="normalForce"
                      sceneScale={sceneScale}
                      label="N_地"
                      font={canvasSize.font}
                    />
                    {/* 整体地面合摩擦力 */}
                    <PhysicsVectorArrow
                      origin={{ x: (model0.m1_pos.x + model0.m2_pos.x + model0.w2) / 2, y: groundY }}
                      vector={{ x: -(model0.f1 + model0.f2), y: 0 }}
                      type="friction"
                      sceneScale={sceneScale}
                      label={`f_总 = ${(model0.f1 + model0.f2).toFixed(1)}N`}
                      font={canvasSize.font}
                    />
                  </g>
                )}

                {/* 隔离法 1：隔离 m1 */}
                {isIsolatedView && activeObject === 0 && (
                  <g>
                    {/* 绳子拉力 T */}
                    <PhysicsVectorArrow
                      origin={model0.ropeLeft}
                      vector={{ x: model0.T, y: 0 }}
                      type="tension"
                      sceneScale={sceneScale}
                      label={`T = ${model0.T.toFixed(1)}N`}
                      font={canvasSize.font}
                      glow
                    />
                    {/* m1 重力 */}
                    <PhysicsVectorArrow
                      origin={{ x: model0.m1_pos.x + model0.w1 / 2, y: groundY + model0.h1 / 2 }}
                      vector={{ x: 0, y: -m1 * g }}
                      type="gravity"
                      sceneScale={sceneScale}
                      label="m₁g"
                      font={canvasSize.font}
                    />
                    {/* 地面支持力 N1 */}
                    <PhysicsVectorArrow
                      origin={{ x: model0.m1_pos.x + model0.w1 / 2, y: groundY }}
                      vector={{ x: 0, y: m1 * g }}
                      type="normalForce"
                      sceneScale={sceneScale}
                      label="N₁"
                      font={canvasSize.font}
                    />
                    {/* m1 摩擦力 f1 */}
                    <PhysicsVectorArrow
                      origin={{ x: model0.m1_pos.x + model0.w1 / 2, y: groundY }}
                      vector={{ x: -model0.f1, y: 0 }}
                      type="friction"
                      sceneScale={sceneScale}
                      label="f₁"
                      font={canvasSize.font}
                    />
                  </g>
                )}

                {/* 隔离法 2：隔离 m2 */}
                {isIsolatedView && activeObject === 1 && (
                  <g>
                    {/* 外部拉力 F */}
                    <PhysicsVectorArrow
                      origin={{ x: model0.m2_pos.x + model0.w2, y: groundY + model0.h2 / 2 }}
                      vector={{ x: F, y: 0 }}
                      type="appliedForce"
                      sceneScale={sceneScale}
                      label={`F = ${F}N`}
                      font={canvasSize.font}
                      glow
                    />
                    {/* 绳子向左拉力 T */}
                    <PhysicsVectorArrow
                      origin={model0.ropeRight}
                      vector={{ x: -model0.T, y: 0 }}
                      type="tension"
                      sceneScale={sceneScale}
                      label={`T = ${model0.T.toFixed(1)}N`}
                      font={canvasSize.font}
                      glow
                    />
                    {/* m2 重力 */}
                    <PhysicsVectorArrow
                      origin={{ x: model0.m2_pos.x + model0.w2 / 2, y: groundY + model0.h2 / 2 }}
                      vector={{ x: 0, y: -m2 * g }}
                      type="gravity"
                      sceneScale={sceneScale}
                      label="m₂g"
                      font={canvasSize.font}
                    />
                    {/* 地面支持力 N2 */}
                    <PhysicsVectorArrow
                      origin={{ x: model0.m2_pos.x + model0.w2 / 2, y: groundY }}
                      vector={{ x: 0, y: m2 * g }}
                      type="normalForce"
                      sceneScale={sceneScale}
                      label="N₂"
                      font={canvasSize.font}
                    />
                    {/* m2 摩擦力 f2 */}
                    <PhysicsVectorArrow
                      origin={{ x: model0.m2_pos.x + model0.w2 / 2, y: groundY }}
                      vector={{ x: -model0.f2, y: 0 }}
                      type="friction"
                      sceneScale={sceneScale}
                      label="f₂"
                      font={canvasSize.font}
                    />
                  </g>
                )}
              </g>
            )}
          </g>
        )}

        {/* ==================== 模型 1：静力学叠放平衡 (推斜面) ==================== */}
        {modelType === 1 && (
          <g>
            {/* 整体法虚线包裹框 */}
            {isSystemView && (
              <g>
                {(() => {
                  const lt = worldToDesign(model1.slope_left_x - 0.2, groundY + model1.slope_H + 0.6, sceneScale)
                  const rb = worldToDesign(model1.slope_right_x + 0.2, groundY - 0.1, sceneScale)
                  return (
                    <g>
                      <rect
                        x={lt.px}
                        y={lt.py}
                        width={rb.px - lt.px}
                        height={rb.py - lt.py}
                        fill="rgba(34, 197, 94, 0.05)"
                        stroke="#22c55e"
                        strokeWidth={2}
                        strokeDasharray="5,4"
                        rx={6}
                      />
                      <rect
                        x={(lt.px + rb.px) / 2 - 60}
                        y={lt.py - 12}
                        width={120}
                        height={20}
                        fill="#22c55e"
                        rx={4}
                      />
                      <text
                        x={(lt.px + rb.px) / 2}
                        y={lt.py + 2}
                        fontSize={canvasSize.font(10)}
                        fill="white"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        整体 M = {(m1 + m2).toFixed(1)}kg
                      </text>
                    </g>
                  )
                })()}
              </g>
            )}

            {/* 斜面体 M (使用标准 Incline 组件) */}
            {(() => {
              const slope_origin = worldToDesign(model1.slope_left_x, groundY, sceneScale)
              const w_px = model1.slope_W * sceneScale.scaleX
              const h_px = model1.slope_H * sceneScale.scaleY
              const opacity = isIsolatedView && activeObject !== 1 ? 0.15 : 1
              return (
                <g opacity={opacity} className="transition-opacity duration-200">
                  <Incline
                    x0={slope_origin.px}
                    y0={slope_origin.py}
                    width={w_px}
                    height={h_px}
                  />
                  <text
                    x={slope_origin.px + w_px * 0.4}
                    y={slope_origin.py - 15}
                    fontSize={canvasSize.font(11)}
                    fill={PHYSICS_COLORS.labelText}
                    fontWeight="bold"
                  >
                    M = {m2}kg
                  </text>
                  {/* 斜面角度标注 */}
                  <path
                    d={`M ${slope_origin.px + w_px - 24} ${slope_origin.py} A 24 24 0 0 0 ${slope_origin.px + w_px - 24 * Math.cos(theta * Math.PI / 180)} ${slope_origin.py - 24 * Math.sin(theta * Math.PI / 180)}`}
                    fill="none"
                    stroke={colors.neutral[500]}
                    strokeWidth={1.2}
                  />
                  <text
                    x={slope_origin.px + w_px - 44}
                    y={slope_origin.py - 8}
                    fontSize={canvasSize.font(9)}
                    fill={colors.neutral[600]}
                    fontWeight="medium"
                  >
                    θ={theta}°
                  </text>
                </g>
              )
            })()}

            {/* 滑块 m */}
            {(() => {
              const lt = worldToDesign(model1.block_pos.x - model1.w_block / 2, model1.block_pos.y + model1.h_block / 2, sceneScale)
              const w = model1.w_block * sceneScale.scaleX
              const h = model1.h_block * sceneScale.scaleY
              const center_px = worldToDesign(model1.block_pos.x, model1.block_pos.y, sceneScale)
              const opacity = isIsolatedView && activeObject !== 0 ? 0.15 : 1
              return (
                <g
                  transform={`rotate(${theta}, ${center_px.px}, ${center_px.py})`}
                  opacity={opacity}
                  className="transition-opacity duration-200"
                >
                  <Block
                    x={lt.px}
                    y={lt.py}
                    width={w}
                    height={h}
                    type="standard"
                    label={`m = ${m1}kg`}
                    font={canvasSize.font}
                    translucent={isIsolatedView && activeObject === 0}
                  />
                </g>
              )
            })()}

            {/* 力学矢量渲染 */}
            <g>
              {/* 整体法 */}
              {isSystemView && (
                <g>
                  {/* 水平推力 F */}
                  <PhysicsVectorArrow
                    origin={{ x: model1.slope_left_x - 1.2, y: groundY + 0.3 }}
                    vector={{ x: F, y: 0 }}
                    type="appliedForce"
                    sceneScale={sceneScale}
                    label={`F = ${F}N`}
                    font={canvasSize.font}
                    glow
                  />
                  {/* 地面摩擦力 f_地 */}
                  <PhysicsVectorArrow
                    origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY }}
                    vector={{ x: -model1.f_ground, y: 0 }}
                    type="friction"
                    sceneScale={sceneScale}
                    label={`f_地 = ${model1.f_ground.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                  {/* 整体重力 (M+m)g */}
                  <PhysicsVectorArrow
                    origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY + model1.slope_H / 3 }}
                    vector={{ x: 0, y: -model1.N_ground }}
                    type="gravity"
                    sceneScale={sceneScale}
                    label={`(M+m)g = ${model1.N_ground.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                  {/* 地面支持力 N_地 */}
                  <PhysicsVectorArrow
                    origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY }}
                    vector={{ x: 0, y: model1.N_ground }}
                    type="normalForce"
                    sceneScale={sceneScale}
                    label={`N_地 = ${model1.N_ground.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                </g>
              )}

              {/* 隔离滑块 m */}
              {isIsolatedView && activeObject === 0 && (
                <g>
                  {/* 重力 mg */}
                  <PhysicsVectorArrow
                    origin={model1.block_pos}
                    vector={{ x: 0, y: -m1 * g }}
                    type="gravity"
                    sceneScale={sceneScale}
                    label="mg"
                    font={canvasSize.font}
                  />
                  {/* 支持力 N (向右上) */}
                  <PhysicsVectorArrow
                    origin={model1.block_pos}
                    vector={{ x: model1.N_slope * Math.sin(thetaRad), y: model1.N_slope * Math.cos(thetaRad) }}
                    type="normalForce"
                    sceneScale={sceneScale}
                    label={`N = ${model1.N_slope.toFixed(1)}N`}
                    font={canvasSize.font}
                    glow
                  />
                  {/* 摩擦力 f (向左上) */}
                  <PhysicsVectorArrow
                    origin={model1.block_pos}
                    vector={{ x: -model1.f_slope * Math.cos(thetaRad), y: model1.f_slope * Math.sin(thetaRad) }}
                    type="friction"
                    sceneScale={sceneScale}
                    label={`f = ${model1.f_slope.toFixed(1)}N`}
                    font={canvasSize.font}
                    glow
                  />
                </g>
              )}

              {/* 隔离斜面 M */}
              {isIsolatedView && activeObject === 1 && (
                <g>
                  {/* 水平推力 F */}
                  <PhysicsVectorArrow
                    origin={{ x: model1.slope_left_x - 1.2, y: groundY + 0.3 }}
                    vector={{ x: F, y: 0 }}
                    type="appliedForce"
                    sceneScale={sceneScale}
                    label={`F = ${F}N`}
                    font={canvasSize.font}
                    glow
                  />
                  {/* 重力 Mg */}
                  <PhysicsVectorArrow
                    origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY + model1.slope_H * 0.3 }}
                    vector={{ x: 0, y: -m2 * g }}
                    type="gravity"
                    sceneScale={sceneScale}
                    label="Mg"
                    font={canvasSize.font}
                  />
                  {/* 滑块对斜面的压力 N' (向左下) */}
                  <PhysicsVectorArrow
                    origin={model1.block_pos}
                    vector={{ x: -model1.N_slope * Math.sin(thetaRad), y: -model1.N_slope * Math.cos(thetaRad) }}
                    type="tension"
                    sceneScale={sceneScale}
                    label={`N' = ${model1.N_slope.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                  {/* 滑块对斜面的摩擦力 f' (向右下) */}
                  <PhysicsVectorArrow
                    origin={model1.block_pos}
                    vector={{ x: model1.f_slope * Math.cos(thetaRad), y: -model1.f_slope * Math.sin(thetaRad) }}
                    type="friction"
                    sceneScale={sceneScale}
                    color="#f43f5e"
                    label={`f' = ${model1.f_slope.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                  {/* 地面支持力 N_地 */}
                  <PhysicsVectorArrow
                    origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY }}
                    vector={{ x: 0, y: model1.N_ground }}
                    type="normalForce"
                    sceneScale={sceneScale}
                    label={`N_地 = ${model1.N_ground.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                  {/* 地面摩擦力 f_地 */}
                  <PhysicsVectorArrow
                    origin={{ x: model1.slope_left_x + model1.slope_W * 0.4, y: groundY }}
                    vector={{ x: -model1.f_ground, y: 0 }}
                    type="friction"
                    sceneScale={sceneScale}
                    label={`f_地 = ${model1.f_ground.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                </g>
              )}
            </g>
          </g>
        )}

        {/* ==================== 模型 2：系统牛顿第二定律 (斜面下滑) ==================== */}
        {modelType === 2 && (
          <g>
            {/* 整体法虚线包裹框 */}
            {isSystemView && (
              <g>
                {(() => {
                  const lt = worldToDesign(model2.slope_left_x - 0.2, groundY + model2.slope_H + 0.6, sceneScale)
                  const rb = worldToDesign(model2.slope_right_x + 0.2, groundY - 0.1, sceneScale)
                  return (
                    <g>
                      <rect
                        x={lt.px}
                        y={lt.py}
                        width={rb.px - lt.px}
                        height={rb.py - lt.py}
                        fill="rgba(34, 197, 94, 0.05)"
                        stroke="#22c55e"
                        strokeWidth={2}
                        strokeDasharray="5,4"
                        rx={6}
                      />
                      <rect
                        x={(lt.px + rb.px) / 2 - 60}
                        y={lt.py - 12}
                        width={120}
                        height={20}
                        fill="#22c55e"
                        rx={4}
                      />
                      <text
                        x={(lt.px + rb.px) / 2}
                        y={lt.py + 2}
                        fontSize={canvasSize.font(10)}
                        fill="white"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        整体 M = {(m1 + m2).toFixed(1)}kg
                      </text>
                    </g>
                  )
                })()}
              </g>
            )}

            {/* 斜面体 M (使用标准 Incline 组件) */}
            {(() => {
              const slope_origin = worldToDesign(model2.slope_left_x, groundY, sceneScale)
              const w_px = model2.slope_W * sceneScale.scaleX
              const h_px = model2.slope_H * sceneScale.scaleY
              const opacity = isIsolatedView && activeObject !== 1 ? 0.15 : 1
              return (
                <g opacity={opacity} className="transition-opacity duration-200">
                  <Incline
                    x0={slope_origin.px}
                    y0={slope_origin.py}
                    width={w_px}
                    height={h_px}
                  />
                  <text
                    x={slope_origin.px + w_px * 0.4}
                    y={slope_origin.py - 15}
                    fontSize={canvasSize.font(11)}
                    fill={PHYSICS_COLORS.labelText}
                    fontWeight="bold"
                  >
                    M = {m2}kg
                  </text>
                  {/* 斜面角度标注 */}
                  <path
                    d={`M ${slope_origin.px + w_px - 24} ${slope_origin.py} A 24 24 0 0 0 ${slope_origin.px + w_px - 24 * Math.cos(theta * Math.PI / 180)} ${slope_origin.py - 24 * Math.sin(theta * Math.PI / 180)}`}
                    fill="none"
                    stroke={colors.neutral[500]}
                    strokeWidth={1.2}
                  />
                  <text
                    x={slope_origin.px + w_px - 44}
                    y={slope_origin.py - 8}
                    fontSize={canvasSize.font(9)}
                    fill={colors.neutral[600]}
                    fontWeight="medium"
                  >
                    θ={theta}°
                  </text>
                </g>
              )
            })()}

            {/* 滑块 m (沿斜面加速下滑) */}
            {(() => {
              const lt = worldToDesign(model2.block_pos.x - model2.w_block / 2, model2.block_pos.y + model2.h_block / 2, sceneScale)
              const w = model2.w_block * sceneScale.scaleX
              const h = model2.h_block * sceneScale.scaleY
              const center_px = worldToDesign(model2.block_pos.x, model2.block_pos.y, sceneScale)
              const opacity = isIsolatedView && activeObject !== 0 ? 0.15 : 1
              return (
                <g
                  transform={`rotate(${theta}, ${center_px.px}, ${center_px.py})`}
                  opacity={opacity}
                  className="transition-opacity duration-200"
                >
                  <Block
                    x={lt.px}
                    y={lt.py}
                    width={w}
                    height={h}
                    type="standard"
                    label={`m = ${m1}kg`}
                    font={canvasSize.font}
                    translucent={isIsolatedView && activeObject === 0}
                  />
                </g>
              )
            })()}

            {/* 加速度分量标注 */}
            {isSystemView && model2.a > 0 && time > 0 && (
              <g>
                {(() => {
                  const origin_design = worldToDesign(model2.block_pos.x + 0.6, model2.block_pos.y + 0.6, sceneScale)
                  const origin_px = { x: origin_design.px, y: origin_design.py }
                  return (
                    <g opacity={0.85}>
                      {/* 合加速度 a (向右下) */}
                      <VectorArrow
                        originDesign={origin_px}
                        vector={{ x: model2.a * Math.cos(thetaRad), y: -model2.a * Math.sin(thetaRad) }}
                        type="acceleration"
                        sceneScale={sceneScale}
                        label={`a = ${model2.a.toFixed(1)}`}
                        font={canvasSize.font}
                      />
                      {/* 水平分加速度 ax (向右) */}
                      <VectorArrow
                        originDesign={origin_px}
                        vector={{ x: model2.ax, y: 0 }}
                        type="acceleration"
                        dashed
                        sceneScale={sceneScale}
                        label={`a_x=${model2.ax.toFixed(1)}`}
                        font={canvasSize.font}
                      />
                      {/* 竖直分加速度 ay (向下) */}
                      <VectorArrow
                        originDesign={origin_px}
                        vector={{ x: 0, y: -model2.ay }}
                        type="acceleration"
                        dashed
                        sceneScale={sceneScale}
                        label={`a_y=${model2.ay.toFixed(1)}`}
                        font={canvasSize.font}
                      />
                    </g>
                  )
                })()}
              </g>
            )}

            {/* 力学矢量渲染 */}
            <g>
              {/* 整体法 (系统牛二定律) */}
              {isSystemView && (
                <g>
                  {/* 整体重力 (M+m)g */}
                  <PhysicsVectorArrow
                    origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY + model2.slope_H * 0.3 }}
                    vector={{ x: 0, y: -(m1 + m2) * g }}
                    type="gravity"
                    sceneScale={sceneScale}
                    label={`(M+m)g = ${((m1 + m2) * g).toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                  {/* 系统支持力 N_地 */}
                  <PhysicsVectorArrow
                    origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY }}
                    vector={{ x: 0, y: model2.N_ground }}
                    type="normalForce"
                    sceneScale={sceneScale}
                    label={`N_地 = ${model2.N_ground.toFixed(1)}N`}
                    font={canvasSize.font}
                    glow
                  />
                  {/* 系统地面对斜面的静摩擦力 f_地 (向右) */}
                  <PhysicsVectorArrow
                    origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY }}
                    vector={{ x: model2.f_ground, y: 0 }}
                    type="friction"
                    sceneScale={sceneScale}
                    label={`f_地 = ${model2.f_ground.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                </g>
              )}

              {/* 隔离滑块 m */}
              {isIsolatedView && activeObject === 0 && (
                <g>
                  {/* 重力 mg */}
                  <PhysicsVectorArrow
                    origin={model2.block_pos}
                    vector={{ x: 0, y: -m1 * g }}
                    type="gravity"
                    sceneScale={sceneScale}
                    label="mg"
                    font={canvasSize.font}
                  />
                  {/* 支持力 N (向右上) */}
                  <PhysicsVectorArrow
                    origin={model2.block_pos}
                    vector={{ x: model2.N_slope * Math.sin(thetaRad), y: model2.N_slope * Math.cos(thetaRad) }}
                    type="normalForce"
                    sceneScale={sceneScale}
                    label={`N = ${model2.N_slope.toFixed(1)}N`}
                    font={canvasSize.font}
                    glow
                  />
                  {/* 斜面摩擦力 f (向左上) */}
                  <PhysicsVectorArrow
                    origin={model2.block_pos}
                    vector={{ x: -model2.f_slope * Math.cos(thetaRad), y: model2.f_slope * Math.sin(thetaRad) }}
                    type="friction"
                    sceneScale={sceneScale}
                    label={`f = ${model2.f_slope.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                </g>
              )}

              {/* 隔离斜面 M (处于静止) */}
              {isIsolatedView && activeObject === 1 && (
                <g>
                  {/* 重力 Mg */}
                  <PhysicsVectorArrow
                    origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY + model2.slope_H * 0.3 }}
                    vector={{ x: 0, y: -m2 * g }}
                    type="gravity"
                    sceneScale={sceneScale}
                    label="Mg"
                    font={canvasSize.font}
                  />
                  {/* 滑块对斜面的压力 N' (向左下) */}
                  <PhysicsVectorArrow
                    origin={model2.block_pos}
                    vector={{ x: -model2.N_slope * Math.sin(thetaRad), y: -model2.N_slope * Math.cos(thetaRad) }}
                    type="tension"
                    sceneScale={sceneScale}
                    label={`N' = ${model2.N_slope.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                  {/* 滑块对斜面的滑动摩擦力 f' (向右下) */}
                  <PhysicsVectorArrow
                    origin={model2.block_pos}
                    vector={{ x: model2.f_slope * Math.cos(thetaRad), y: -model2.f_slope * Math.sin(thetaRad) }}
                    type="friction"
                    sceneScale={sceneScale}
                    color="#f43f5e"
                    label={`f' = ${model2.f_slope.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                  {/* 地面支持力 N_地 */}
                  <PhysicsVectorArrow
                    origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY }}
                    vector={{ x: 0, y: model2.N_ground }}
                    type="normalForce"
                    sceneScale={sceneScale}
                    label={`N_地 = ${model2.N_ground.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                  {/* 地面摩擦力 f_地 (向右) */}
                  <PhysicsVectorArrow
                    origin={{ x: model2.slope_left_x + model2.slope_W * 0.4, y: groundY }}
                    vector={{ x: model2.f_ground, y: 0 }}
                    type="friction"
                    sceneScale={sceneScale}
                    label={`f_地 = ${model2.f_ground.toFixed(1)}N`}
                    font={canvasSize.font}
                  />
                </g>
              )}
            </g>
          </g>
        )}

        {/* 共享渐变 defs 与 Marker 标记 */}
        <defs>
          <VectorDefs colors={[
            PHYSICS_COLORS.appliedForce,
            PHYSICS_COLORS.gravity,
            PHYSICS_COLORS.normalForce,
            PHYSICS_COLORS.friction,
            PHYSICS_COLORS.tension,
            PHYSICS_COLORS.acceleration,
            '#f43f5e'
          ]} />
        </defs>
      </AnimationSvgCanvas>
    </div>
  )
}

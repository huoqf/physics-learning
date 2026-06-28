/**
 * src/theme/physics/scene/electricity.ts
 * 电磁与电路实验器材配色规范
 */

// ─── 磁铁 (Magnet) ────────────────────────────────────────────────────────────
export const MAGNET_COLORS = {
  // N 极（红）3D 拟物面
  northLight:    '#FF6B6B', // N 极受光面高光
  northBase:     '#DC2626', // N 极正面      — danger-600（与 PHYSICS_COLORS.magnetNorth 统一）
  northMid:      '#B91C1C', // N 极侧面      — danger-700
  northDark:     '#991B1B', // N 极暗部      — danger-800
  northShadow:   '#7F1D1D', // N 极最暗/投影 — danger-900
  northStroke:   '#450A0A', // N 极描边
  northLabel:    '#FFFFFF', // N 字标签      — 白

  // S 极（蓝）3D 拟物面
  southLight:    '#60A5FA', // S 极受光面高光 — primary-400
  southBase:     '#2563EB', // S 极正面      — primary-600（与 PHYSICS_COLORS.magnetSouth 统一）
  southMid:      '#1D4ED8', // S 极侧面      — primary-700
  southDark:     '#1E40AF', // S 极暗部      ★修正 #1565cc → primary-800
  southShadow:   '#1E3A8A', // S 极最暗/投影 ★修正 #0c3873 / #0d4082 → primary-900
  southStroke:   '#172554', // S 极描边      — primary-950
  southLabel:    '#FFFFFF', // S 字标签      — 白

  // 磁铁连接部 / 中性区（条形磁铁中段、马蹄形连接部）
  bodyFill:      '#D4D4D4', // 主体灰
  bodyStroke:    '#737373', // 主体描边
  poleEnd:       '#E5E7EB', // 极面端部
} as const

// ─── 线圈 / 导线 (Coil & Wire) ────────────────────────────────────────────────
export const COIL_COLORS = {
  // 铜导线（电磁感应线圈）
  copperLight:   '#F0C060', // 铜线受光面高光
  copperBase:    '#B8860B', // 铜线正面      ★复用硬编码 #B8860B（Dark Goldenrod）
  copperMid:     '#9A7209', // 铜线侧面
  copperDark:    '#7A5A07', // 铜线暗部
  copperStroke:  '#5C4205', // 铜线描边

  // 漆包线（绿漆，常见电机绕组）
  enamelBase:    '#7C9A22', // 漆包线正面    ★复用硬编码 #7c9a22
  enamelDark:    '#5A7219', // 漆包线暗部
  enamelStroke:  '#3D5010', // 漆包线描边

  // 绝缘导线（黑/深灰皮）
  insulation:    '#374151', // 绝缘皮主色    — gray-700
  insulationSt:  '#1F2937', // 绝缘皮描边    — gray-800

  // 通电激活状态
  activeGlow:    '#059669', // 通电光晕 — emerald-600（设备激活/通电状态指示，非物理量语义）
  activeGlowBg:  '#D1FAE5', // 通电光晕背景  — emerald-100
} as const

// ─── 电路元件外观 (Circuit Component Appearance) ─────────────────────────────
export const CIRCUIT_COLORS = {
  // 导线
  wire:          '#1F2937', // 导线主色      — gray-800
  wireActive:    '#059669', // 通电导线      — emerald-600
  wireBroken:    '#EF4444', // 断路标记      — danger-500
  node:          '#111827', // 节点圆点      — gray-900

  // 开关
  switchOpen:    '#EF4444', // 断开状态      — danger-500
  switchClosed:  '#10B981', // 闭合状态      — emerald-500

  // 电池/电源
  batteryPos:    '#DC2626', // 正极          — danger-600
  batteryNeg:    '#1F2937', // 负极          — gray-800
  batteryBody:   '#F3F4F6', // 外壳          — gray-100

  // 电阻
  resistorFill:  '#FDE68A', // 电阻器填充    — amber-200
  resistorStroke:'#92400E', // 电阻器描边    — amber-800

  // 电容
  capacitorPlate:'#93C5FD', // 极板          — primary-300
  capacitorSt:   '#1D4ED8', // 电容描边      — primary-700

  // 电感
  inductorWire:  '#B8860B', // 电感线圈      — copper（同 coilBase）

  // 仪表（电压表/电流表）
  voltmeterFace: '#F0FDF4', // 电压表表盘    — green-50
  ammeterFace:   '#FFF7ED', // 电流表表盘    — orange-50
  meterFrame:    '#374151', // 仪表外框      — gray-700
  meterNeedle:   '#DC2626', // 指针          — danger-600
  meterScale:    '#1F2937', // 刻度线        — gray-900

  // 灯泡（熄灭状态，发光状态见 BULB_GLOW_COLORS）
  bulbGlass:     '#FEF9C4', // 灯泡玻璃壳（熄灭）— yellow-100
  bulbGlassOff:  '#F3F4F6', // 灯泡外壳灰（熄灭暗态）— gray-100
  bulbGlassStroke:'#9CA3AF',// 灯泡描边
  bulbFilament:  '#92400E', // 灯丝主色      — amber-800
  bulbBase:      '#374151', // 灯头外壳      — gray-700
} as const

// ─── 灯泡发光渐变效果 (Bulb Glow) ────────────────────────────────────────────
export const BULB_GLOW_COLORS = {
  // 径向渐变色阶（中心 → 外围，用于 radialGradient / canvas createRadialGradient）
  glowCenter:    '#FFFFFF', // 中心纯白高光
  glowInner:     '#FFF176', // 内圈光晕      ★复用硬编码 #FFF176
  glowMid:       '#FFC107', // 中圈光晕      ★复用硬编码 #FFC107
  glowOuter:     '#FF8F00', // 外圈光晕      ★复用硬编码 #FF8F00
  glowFade:      'rgba(255,143,0,0)', // 完全透明（渐变终点）

  // 亮度状态预设（配合 glowOuter 等使用）
  dim:           '#FEF08A', // 低亮 (~10% 功率)  — yellow-200
  normal:        '#FDE047', // 正常 (~50% 功率)  — yellow-300
  bright:        '#EAB308', // 全亮 (100% 功率)  — yellow-500
  overload:      '#EF4444', // 过载（红光警示）  — danger-500

  // 玻璃壳发光状态
  glassDim:      '#FFFDE7', // 微亮
  glassNormal:   '#FFF9C4', // 正常亮
  glassBright:   '#FFF176', // 全亮
} as const

// ─── 手势教具 (Hand Gesture / Left-Hand Rule) ─────────────────────────────────
export const HAND_COLORS = {
  // 皮肤色阶（适合亚洲肤色，与项目整体蓝色调协调）
  skinLight:     '#F3C7A6', // 受光面高光    ★复用硬编码 #F3C7A6
  skinBase:      '#E6B896', // 主皮肤色      ★复用硬编码 #E6B896
  skinMid:       '#D4A574', // 阴影过渡面
  skinDark:      '#7C4A2E', // 深阴影/暗部   ★复用硬编码 #7C4A2E
  skinShadow:    '#5C3422', // 最暗投影

  // 骨骼手（线框风格，解剖教学专用）
  boneLight:     '#F5F5F4', // 骨骼受光面    — stone-100
  boneBase:      '#E7E5E4', // 骨骼主色      — stone-200
  boneDark:      '#A8A29E', // 骨骼暗部      — stone-400
  boneStroke:    '#44403C', // 骨骼描边      — stone-700
  jointFill:     '#D6D3D1', // 关节填充      — stone-300
  jointStroke:   '#57534E', // 关节描边      — stone-600

  // 方向指示配色（左手定则三指颜色）
  thumbDir:      '#16A34A', // 拇指方向      — green-600（常表示运动方向 v）
  indexDir:      '#2563EB', // 食指方向      — primary-600（常表示 B 场方向）
  middleDir:     '#DC2626', // 中指方向      — danger-600（常表示电流 I 方向）
  arrowDecor:    '#1E293B', // 手势说明箭头  — neutral-800
} as const

// ─── 电学与静电学实验器材色配置 ───────────────────────────────────────────────
export const ELECTRICAL_APPARATUS_COLORS = {
  // 滑动变阻器
  rheostatCeramic: '#F1F5F9', // 绝缘瓷管 (slate-100)
  rheostatWire:    '#B45309', // 电阻线圈 (amber-700)
  rheostatRod:     '#CBD5E1', // 上方金属导电滑杆 (slate-300)
  rheostatSlider:  '#64748B', // 滑片主体 (slate-500)
  rheostatContact: '#F59E0B', // 接触点指示高亮 (amber-500)

  // 变阻箱
  dialPlate:       '#1E293B', // 旋钮面板
  dialKnob:        '#0F172A', // 阻值旋钮
  dialMarker:      '#EF4444', // 指示刻度线 (red-500)

  // 多用电表与表笔
  multimeterBody:  '#EA580C', // 电表深橙外壳 (orange-600，低饱和度防抢眼)
  probeRed:        '#DC2626', // 红表笔/正接线柱 (辅助“红进”电流)
  probeBlack:      '#1F2937', // 黑表笔/负接线柱 (辅助“黑出”电流)

  // LED/数显发光屏特有色 (从 DCSource.tsx 提取收归)
  ledScreenBg:     '#090D16', // LED 数显屏暗色底壳 (极深蓝黑)
  ledDisplayGreen: '#22C55E', // 数码管发光绿 (数显绿)
  ledDisplayRed:   '#EF4444', // 数码管发光红 (数显红，用于超载指示)

  // 电学五金件部件 (从 Rheostat.tsx 等 Stone 色阶硬编码中收归)
  terminalBody:    '#57534E', // 接线柱塑料外壳 (stone-600)
  terminalCap:     '#292524', // 接线柱旋帽深色 (stone-800)
  terminalCore:    '#CBD5E1', // 接线柱/滑轨金属柱芯 (slate-300 / stone-400)
  rheostatBase:    '#44403C', // 变阻器铸铁支架 (stone-700)
} as const;

export const ELECTROSTATIC_APPARATUS_COLORS = {
  // 验电器
  ballFill:        '#D1D5DB', // 顶端感应金属球 (gray-300)
  rodFill:         '#9CA3AF', // 金属传导杆 (gray-400)
  foilGold:        '#FDE047', // 箔片黄金色 (yellow-300，反射金属光泽)
  foilGlow:        'rgba(253, 224, 71, 0.3)', // 电荷聚集时箔片的微光
  insulatorPlug:   '#D8B4FE', // 橡胶/橡皮绝缘塞 (purple-300)
  glassDomeFill:   'rgba(241, 245, 249, 0.15)', // 玻璃外罩半透明填充
  glassDomeStroke: '#94A3B8', // 玻璃罩轮廓 (slate-400)
} as const;

import type { PhysicsPanelData } from './types'
import { normalizeParams, type ParamDefs } from './types'

interface LaserParams {
  mode: number
  propagationDistance: number
  divergenceAngleLaser: number
  divergenceAngleNormal: number
  wavelength: number
  slitDistance: number
  screenDist: number
  laserPower: number
  focusDiameter: number
  material: number
}

const DEFAULTS: ParamDefs<LaserParams> = {
  mode: { default: 0 },
  propagationDistance: { default: 50 },
  divergenceAngleLaser: { default: 1.5 },
  divergenceAngleNormal: { default: 15 },
  wavelength: { default: 650 },
  slitDistance: { default: 0.2 },
  screenDist: { default: 1.2 },
  laserPower: { default: 50 },
  focusDiameter: { default: 30 },
  material: { default: 0 },
}

export function buildLaserQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-laser') return null

  const p = normalizeParams(params, DEFAULTS)
  const modeVal = p.mode

  const quantities: PhysicsPanelData['quantities'] = []
  let formulas: PhysicsPanelData['formulas'] = []
  let gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = []

  const r0 = 0.001 // 初始半径 1mm

  if (modeVal === 0) {
    // 1. 平行性对比模式
    const thetaLaserRad = (p.divergenceAngleLaser / 1000) / 2
    const thetaNormalRad = (p.divergenceAngleNormal * Math.PI / 180) / 2

    const laserR = r0 + p.propagationDistance * Math.tan(thetaLaserRad)
    const normalR = r0 + p.propagationDistance * Math.tan(thetaNormalRad)

    const laserRatio = (r0 / laserR) ** 2 * 100
    const normalRatio = (r0 / normalR) ** 2 * 100

    quantities.push({ label: '激光束半径 R_L', value: (laserR * 1000).toFixed(2), unit: 'mm', highlight: 'positive' })
    quantities.push({ label: '普通光半径 R_N', value: normalR >= 1.0 ? normalR.toFixed(2) : (normalR * 100).toFixed(2), unit: normalR >= 1.0 ? 'm' : 'cm' })
    quantities.push({ label: '激光末端相对光强', value: laserRatio.toFixed(2), unit: '%', highlight: 'extreme' })
    quantities.push({ label: '普通光末端相对光强', value: normalRatio.toFixed(6), unit: '%' })

    formulas = [
      {
        name: '发散光束半径公式',
        latex: 'R(d) = R_0 + d \\cdot \\tan(\\theta/2)',
        condition: 'θ 为光束全发散角，d 为传播距离。激光的 θ 通常在 10⁻³ 弧度量级。',
        level: 'important',
      },
      {
        name: '光强衰减面积反比律',
        latex: '\\frac{I}{I_0} = \\left(\\frac{R_0}{R}\\right)^2',
        condition: '假设总光通量守恒，光强（能量密度）与光束横截面积成反比。',
        level: 'core',
      },
    ]

    gaokaoPoints = [
      { text: '激光的方向性极好：发散角极小，几乎是平行光束。这使得激光能够在很长距离内保持光能高度集中。', importance: 'gaokao' },
      { text: '普通光源（如白炽灯、手电筒）的光在空间中迅速发散，光强（能量密度）随传播距离呈平方反比衰减。', importance: 'core' },
      { text: '激光高平行度的应用：激光测距（通过发射接收的时间差计算距离，d = c·t/2）、激光雷达准确定位、光盘读取。', importance: 'gaokao' },
    ]
  } else if (modeVal === 1) {
    // 2. 相干性对比模式
    const lam = p.wavelength * 1e-9
    const dSlit = p.slitDistance * 1e-3
    const deltaX = (p.screenDist * lam / dSlit) * 1e3 // mm

    quantities.push({ label: '光源波长 λ', value: p.wavelength, unit: 'nm' })
    quantities.push({ label: '双缝间距 d', value: p.slitDistance, unit: 'mm' })
    quantities.push({ label: '缝屏距离 L', value: p.screenDist, unit: 'm' })
    quantities.push({ label: '干涉条纹间距 Δx', value: deltaX.toFixed(3), unit: 'mm', highlight: 'positive' })

    formulas = [
      {
        name: '双缝干涉条纹间距公式',
        latex: '\\Delta x = \\frac{L}{d} \\lambda',
        condition: 'd 为双缝间距，L 为双缝到屏的距离，λ 为入射单色光的波长。',
        level: 'core',
      },
      {
        name: '干涉相长/相消条件',
        latex: '\\Delta r = k\\lambda \\quad 或 \\quad \\Delta r = (2k+1)\\frac{\\lambda}{2}',
        condition: '当两光源的光程差为波长的整数倍时相长（亮条纹），为半波长奇数倍时相消（暗条纹）。',
        level: 'core',
      },
    ]

    gaokaoPoints = [
      { text: '相干光源条件：频率相同、相位差恒定、振动方向一致。普通光源发光为随机独立辐射，极难发生干涉。', importance: 'gaokao' },
      { text: '激光是极佳的相干光：激光是由受激辐射产生的，具有极好的相干性。双缝干涉实验中，激光产生的条纹对比度高、明暗极其清晰。', importance: 'gaokao' },
      { text: '普通红光双缝干涉：即使通过滤光片获得单色光，由于原子自发辐射的相干长度极短，在干涉屏上对比度极低，条纹模糊不清。', importance: 'core' },
      { text: '激光高相干性的应用：全息照相技术（利用激光记录物光与参考光的干涉图样以重建三维物体）、激光测长、精密干涉测量。', importance: 'gaokao' },
    ]
  } else {
    // 3. 高能量应用模式 (激光切割)
    interface MaterialConfig {
      T_m: number
      T_b: number
      Cv: number
      E_melt: number
      E_vap: number
      kloss: number
    }
    const configMap: Record<number, MaterialConfig> = {
      0: { T_m: 100, T_b: 250, Cv: 0.008, E_melt: 0, E_vap: 0.8, kloss: 0.0006 },
      1: { T_m: 150, T_b: 360, Cv: 0.025, E_melt: 0, E_vap: 2.2, kloss: 0.0012 },
      2: { T_m: 1538, T_b: 2750, Cv: 0.16, E_melt: 3.5, E_vap: 15.0, kloss: 0.006 },
    }

    const mat = configMap[p.material] || configMap[0]

    // 运行同 useLaserPhysics.ts 中的热动力数值计算，求得当前 time 下的焦点温度和切割深度
    const T0 = 20
    const dt = 0.01
    const stepsNeeded = Math.floor(time / dt)
    let simT = T0
    let simDepth = 0
    let simMeltAccum = 0
    let simMelted = false

    for (let step = 0; step < stepsNeeded; step++) {
      const loss = mat.kloss * (simT - T0)
      const netPower = Math.max(0, p.laserPower * 0.85 - loss)

      if (!simMelted && mat.T_m > 0 && simT >= mat.T_m) {
        simT = mat.T_m
        simMeltAccum += netPower * dt
        if (simMeltAccum >= mat.E_melt) {
          simMelted = true
        }
      } else if (simT >= mat.T_b) {
        simT = mat.T_b
        simMelted = true
        simDepth += (netPower * dt) / mat.E_vap
      } else {
        simT += (netPower * dt) / mat.Cv
      }
    }

    // 物理焦点光斑面积 S = pi * (D/2)^2
    const focusRadM = (p.focusDiameter * 1e-6) / 2
    const area = Math.PI * (focusRadM ** 2)
    const energyDensity = p.laserPower / area // W/m2

    quantities.push({ label: '激光功率 P', value: p.laserPower, unit: 'W' })
    quantities.push({ label: '焦点面积 S', value: area.toExponential(3), unit: 'm²' })
    quantities.push({ label: '焦点能量密度 E_d', value: energyDensity.toExponential(3), unit: 'W/m²', highlight: 'extreme' })
    quantities.push({ label: '靶材焦点温度 T', value: simT.toFixed(1), unit: '°C', highlight: simT >= mat.T_b ? 'extreme' : undefined })
    quantities.push({ label: '切割/穿透深度 h', value: simDepth.toFixed(3), unit: 'mm', highlight: simDepth > 0 ? 'positive' : undefined })

    formulas = [
      {
        name: '能量密度/辐射照度公式',
        latex: 'E_d = \\frac{P}{S} = \\frac{P}{\\pi (D/2)^2}',
        condition: 'P 为激光功率，D 为焦斑直径。当 D 在微米级时，能量密度可达到 10⁹~10¹² W/m² 的极端量级。',
        level: 'core',
      },
      {
        name: '热相变能量转化方程',
        latex: 'Q = c \\cdot m \\cdot \\Delta T + L_f + L_v',
        condition: '材料升温并汽化所需的能量。汽化潜热 Lv 极大，唯有激光的高能量密度能够快速提供并使其瞬间汽化。',
        level: 'important',
      },
    ]

    gaokaoPoints = [
      { text: '激光亮度/能量密度极高：激光能在极小的空间与极短的时间内集中极大的能量。将激光通过透镜聚焦到微米级尺寸，可在焦点处获得极高的能量密度。', importance: 'gaokao' },
      { text: '高能量激光切割原理：照射区域的材料吸收激光能量后瞬间加热，迅速达到熔点与沸点并剧烈汽化，被辅助气体吹走，从而实现精密打孔或无接触式切割。', importance: 'gaokao' },
      { text: '激光高亮度/高能量的应用：工业切割、激光焊接、受控热核反应（利用激光均匀加热氘氚燃料球触发核聚变）、激光武器、医疗手术（如视网膜剥离光凝焊接）。', importance: 'gaokao' },
    ]
  }

  return {
    quantities,
    formulas,
    gaokaoPoints,
  }
}

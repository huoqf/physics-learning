import { useMemo } from 'react'

interface UseLaserPhysicsParams {
  mode: number                  // 0: 平行性, 1: 相干性, 2: 高能量应用
  propagationDistance: number   // m (mode 0)
  divergenceAngleLaser: number  // mrad (mode 0)
  divergenceAngleNormal: number // degree (mode 0)
  wavelength: number            // nm (mode 1)
  slitDistance: number          // mm (mode 1)
  screenDist: number            // m (mode 1)
  laserPower: number            // W (mode 2)
  focusDiameter: number         // um (mode 2)
  material: number              // 0: 纸张, 1: 木板, 2: 铁板 (mode 2)
  time: number                  // s
}

export interface ChartPoint {
  x: number // 自变量
  y: number // 因变量
}

export interface SparkParticle {
  id: number
  cx: number
  cy: number
  vx: number
  vy: number
  life: number // 0 ~ 1
  maxLife: number
}

export interface LaserPhysicsResult {
  // Mode 0: 平行性对比
  laserSpotRadius: number       // m
  normalSpotRadius: number      // m
  laserIntensityRatio: number   // 末端光强与初始光强比 (%)
  normalIntensityRatio: number  // 末端光强与初始光强比 (%)
  divergenceChartPoints: ChartPoint[] // R-d 曲线

  // Mode 1: 相干性对比
  deltaX: number                // mm
  laserInterferencePoints: ChartPoint[] // I-y 曲线
  normalInterferencePoints: ChartPoint[] // I-y 曲线

  // Mode 2: 高能量应用
  temp: number                  // °C
  meltDepth: number             // mm
  meltingPoint: number          // °C
  boilingPoint: number          // °C
  isMelted: boolean
  isBoiled: boolean
  tempChartPoints: ChartPoint[] // T-t 曲线
  sparks: SparkParticle[]
}

export function useLaserPhysics({
  mode,
  propagationDistance,
  divergenceAngleLaser,
  divergenceAngleNormal,
  wavelength,
  slitDistance,
  screenDist,
  laserPower,
  material,
  time,
}: UseLaserPhysicsParams): LaserPhysicsResult {
  return useMemo(() => {
    // ─── 默认/初始值 ───
    let laserSpotRadius = 0.001
    let normalSpotRadius = 0.001
    let laserIntensityRatio = 100
    let normalIntensityRatio = 100
    let divergenceChartPoints: ChartPoint[] = []

    let deltaX = 0
    let laserInterferencePoints: ChartPoint[] = []
    let normalInterferencePoints: ChartPoint[] = []

    let temp = 20
    let meltDepth = 0
    let meltingPoint = 0
    let boilingPoint = 0
    let isMelted = false
    let isBoiled = false
    let tempChartPoints: ChartPoint[] = []
    let sparks: SparkParticle[] = []

    const r0 = 0.001 // 初始光束半径 1mm

    // ==========================================
    // 1. 模式 0：平行性对比 (Directionality)
    // ==========================================
    if (mode === 0) {
      const thetaLaserRad = (divergenceAngleLaser / 1000) / 2 // 半发散角 (rad)
      const thetaNormalRad = (divergenceAngleNormal * Math.PI / 180) / 2 // 半发散角 (rad)

      // 计算在当前传播距离处的光斑半径
      laserSpotRadius = r0 + propagationDistance * Math.tan(thetaLaserRad)
      normalSpotRadius = r0 + propagationDistance * Math.tan(thetaNormalRad)

      // 光强与面积成反比 I/I0 = (r0/r)^2
      laserIntensityRatio = Math.max(0.01, Math.min(100, (r0 / laserSpotRadius) ** 2 * 100))
      normalIntensityRatio = Math.max(0.0001, Math.min(100, (r0 / normalSpotRadius) ** 2 * 100))

      // 生成 R-d 曲线，传播距离从 0 到 100m
      const steps = 50
      for (let i = 0; i <= steps; i++) {
        const d = (i / steps) * 100
        const rLaser = r0 + d * Math.tan(thetaLaserRad)
        divergenceChartPoints.push({ x: d, y: rLaser * 1000 }) // 转换为 mm 绘图更直观
      }
    }

    // ==========================================
    // 2. 模式 1：相干性对比 (Coherence)
    // ==========================================
    if (mode === 1) {
      // 双缝干涉条纹间距: Δx = L/d * λ
      // L 单位: m, d_slit 单位: mm, λ 单位: nm
      // Δx = L * λ / d_slit * 1e-3 (mm)
      const lam = wavelength * 1e-9
      const dSlit = slitDistance * 1e-3
      deltaX = (screenDist * lam / dSlit) * 1e3 // mm

      // 屏宽设定为 10mm (-5mm 到 5mm)
      const screenWidth = 10
      const steps = 150

      // 激光干涉曲线 (高相干度, V ≈ 0.95)
      // 普通红光干涉曲线 (极低相干度, V ≈ 0.08)
      const vLaser = 0.95
      const vNormal = 0.08

      for (let i = 0; i <= steps; i++) {
        const y = -screenWidth / 2 + (i / steps) * screenWidth // mm
        const phase = (2 * Math.PI * y) / deltaX
        
        // 加入单缝衍射的强度包络（中央最亮，两侧衰减，使图形更逼真）
        const envelope = Math.sin(y * 0.8) === 0 ? 1 : (Math.sin(y * 0.8) / (y * 0.8)) ** 2

        const iLaser = envelope * (1 + vLaser * Math.cos(phase))
        const iNormal = envelope * (1 + vNormal * Math.cos(phase))

        laserInterferencePoints.push({ x: y, y: iLaser })
        normalInterferencePoints.push({ x: y, y: iNormal })
      }
    }

    // ==========================================
    // 3. 模式 2：高能量应用 (High Intensity)
    // ==========================================
    if (mode === 2) {
      // 靶材热物理常数配置
      interface MaterialConfig {
        name: string
        T_m: number    // 熔点 (°C)
        T_b: number    // 沸点/汽化点 (°C)
        Cv: number     // 有效热容 (J/K)
        E_melt: number // 熔化所需潜热 (J)
        E_vap: number  // 汽化 1mm 深度所需潜热 (J)
        kloss: number  // 散热系数 (W/K)
      }

      const configMap: Record<number, MaterialConfig> = {
        0: { name: '纸张', T_m: 100, T_b: 250, Cv: 0.008, E_melt: 0, E_vap: 0.8, kloss: 0.0006 },
        1: { name: '木板', T_m: 150, T_b: 360, Cv: 0.025, E_melt: 0, E_vap: 2.2, kloss: 0.0012 },
        2: { name: '铁板', T_m: 1538, T_b: 2750, Cv: 0.16, E_melt: 3.5, E_vap: 15.0, kloss: 0.006 },
      }

      const mat = configMap[material] || configMap[0]
      meltingPoint = mat.T_m
      boilingPoint = mat.T_b

      const T0 = 20 // 初始温度 20°C
      const dt = 0.01 // 模拟步长 (s)
      const maxSimTime = 10.0 // 最大模拟时间

      // 辅助模拟函数：模拟到时间 t 时的温度和切割深度
      const runSimTo = (targetTime: number) => {
        let simT = T0
        let simDepth = 0
        let simMeltAccum = 0
        let simMelted = false
        let simBoiled = false

        const stepsNeeded = Math.floor(targetTime / dt)
        for (let step = 0; step < stepsNeeded; step++) {
          const loss = mat.kloss * (simT - T0)
          const netPower = Math.max(0, laserPower * 0.85 - loss)

          if (!simMelted && mat.T_m > 0 && simT >= mat.T_m) {
            // 熔化阶段（保持熔点，吸收潜热）
            simT = mat.T_m
            simMeltAccum += netPower * dt
            if (simMeltAccum >= mat.E_melt) {
              simMelted = true
            }
          } else if (simT >= mat.T_b) {
            // 汽化阶段（保持沸点，消耗潜热增加汽化深度）
            simT = mat.T_b
            simBoiled = true
            simMelted = true
            simDepth += (netPower * dt) / mat.E_vap
          } else {
            // 升温阶段
            simT += (netPower * dt) / mat.Cv
          }
        }
        return { simT, simDepth, simMelted, simBoiled }
      }

      // 1. 计算当前时间 time 下的状态
      const currentSim = runSimTo(time)
      temp = currentSim.simT
      meltDepth = currentSim.simDepth
      isMelted = currentSim.simMelted
      isBoiled = currentSim.simBoiled

      // 2. 生成 0~10s 的图表曲线数据
      const curveSteps = 100
      for (let i = 0; i <= curveSteps; i++) {
        const t = (i / curveSteps) * maxSimTime
        const stateAtT = runSimTo(t)
        tempChartPoints.push({ x: t, y: stateAtT.simT })
      }

      // 3. 生成火花粒子 (当温度到达熔点或沸点时)
      if (time > 0.05 && (isMelted || isBoiled)) {
        const sparkCount = isBoiled ? 15 : 6
        for (let i = 0; i < sparkCount; i++) {
          // 使用确定性的伪随机数，防止闪烁
          const seed = Math.sin(time * 1000 + i * 57) * 10000
          const pseudoRand = () => {
            const val = Math.sin(seed)
            return val - Math.floor(val)
          }

          const life = (time * 6 + i * 0.17) % 1.0
          const maxLife = 0.3 + pseudoRand() * 0.4
          
          const angle = (pseudoRand() * 100 - 50) * Math.PI / 180 // -50° ~ 50°
          const speed = 80 + pseudoRand() * 150 // 设计像素/秒
          
          sparks.push({
            id: i,
            cx: -speed * life * Math.cos(angle), // 激光自左向右射向靶材，火花向左（后）喷射
            cy: speed * life * Math.sin(angle),
            vx: -speed * Math.cos(angle),
            vy: speed * Math.sin(angle),
            life: Math.max(0, 1 - life / maxLife),
            maxLife,
          })
        }
      }
    }

    return {
      laserSpotRadius,
      normalSpotRadius,
      laserIntensityRatio,
      normalIntensityRatio,
      divergenceChartPoints,
      deltaX,
      laserInterferencePoints,
      normalInterferencePoints,
      temp,
      meltDepth,
      meltingPoint,
      boilingPoint,
      isMelted,
      isBoiled,
      tempChartPoints,
      sparks,
    }
  }, [
    mode,
    propagationDistance,
    divergenceAngleLaser,
    divergenceAngleNormal,
    wavelength,
    slitDistance,
    screenDist,
    laserPower,
    material,
    time,
  ])
}

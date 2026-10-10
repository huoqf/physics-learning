import type { PhysicsPanelData } from './types'
import { SODIUM_WORK_FUNCTION } from '@/physics/photoelectric'

export function buildModernPhysicsQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-bohr-theory') return null

  const mode = params.mode ?? 0

  if (mode === 0) {
    // 阶段一：玻尔原子模型与定态跃迁
    const targetLevel = params.targetLevel ?? 2
    const E1 = -13.6
    const r1 = 0.53 // 0.53 Å (10^-10 m)

    const En = E1 / (targetLevel * targetLevel)
    const rn = targetLevel * targetLevel * r1

    const quantities: PhysicsPanelData['quantities'] = [
      {
        label: '当前定态能级',
        symbol: 'n',
        value: targetLevel.toString(),
        unit: '',
      },
      {
        label: '能级能量',
        symbol: 'E_n',
        value: En.toFixed(2),
        unit: 'eV',
        highlight: targetLevel === 1 ? 'negative' : 'positive',
      },
      {
        label: '轨道半径',
        symbol: 'r_n',
        value: rn.toFixed(2),
        unit: '×10⁻¹⁰ m',
      },
    ]

    const formulas: PhysicsPanelData['formulas'] = [
      {
        name: '氢原子能级公式',
        latex: 'E_n = \\frac{E_1}{n^2} = -\\frac{13.6}{n^2} \\text{ eV}',
        level: 'core',
      },
      {
        name: '轨道半径公式',
        latex: 'r_n = n^2 r_1 = n^2 \\cdot 0.53 \\times 10^{-10} \\text{ m}',
        level: 'core',
      },
      {
        name: '玻尔跃迁辐射条件',
        latex: 'h\\nu = |E_m - E_n|',
        level: 'core',
      },
    ]

    const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
      { text: '定态假设：电子在定态轨道上绕核运动时不向外辐射电磁波。', importance: 'core' },
      { text: '跃迁规律：电子从高能级向低能级跃迁辐射特定频率光子，反之吸收光子。', importance: 'gaokao' },
      { text: '氢原子电离：处于 n 能级的氢原子吸收能量大于等于 |En| 的光子即发生电离。', importance: 'gaokao' },
    ]

    return {
      quantities,
      formulas,
      gaokaoPoints,
      warnings: [],
      mnemonic: '轨道量子化，能级是平方；跃迁看差值，辐射出光芒。',
    }
  }

  if (mode === 1) {
    // 阶段二：跃迁与激发机制（光子严苛共振 vs 电子碰撞）
    const atomQuantity = params.atomQuantity ?? 0
    const excitationType = params.excitationType ?? 0
    const incidentEnergy = params.incidentEnergy ?? 10.2

    const levelDiffs = {
      n2: 10.20,
      n3: 12.09,
      n4: 12.75,
      ionization: 13.60,
    }

    let isExcited = false
    let finalLevel = 1
    let resultMessage = ''
    let totalPhotons = 0

    if (excitationType === 0) {
      // 光子照射：必须严格等于能级差
      if (incidentEnergy >= levelDiffs.ionization) {
        isExcited = true
        finalLevel = 5
        const extraEnergy = incidentEnergy - levelDiffs.ionization
        resultMessage = `彻底电离！光子完全被吸收，光电子初动能 ${extraEnergy.toFixed(2)} eV`
      } else {
        const matchThreshold = 0.05
        if (Math.abs(incidentEnergy - levelDiffs.n4) < matchThreshold) {
          isExcited = true
          finalLevel = 4
          resultMessage = '激发成功：吸收光子，跃迁至 n=4 能级'
        } else if (Math.abs(incidentEnergy - levelDiffs.n3) < matchThreshold) {
          isExcited = true
          finalLevel = 3
          resultMessage = '激发成功：吸收光子，跃迁至 n=3 能级'
        } else if (Math.abs(incidentEnergy - levelDiffs.n2) < matchThreshold) {
          isExcited = true
          finalLevel = 2
          resultMessage = '激发成功：吸收光子，跃迁至 n=2 能级'
        } else {
          isExcited = false
          finalLevel = 1
          resultMessage = '激发失败：光子能量不满足能级差，未被吸收 (直穿)'
        }
      }
    } else {
      // 电子碰撞：只需能量大于等于能级差
      if (incidentEnergy >= levelDiffs.ionization) {
        isExcited = true
        finalLevel = 5
        const extraEnergy = incidentEnergy - levelDiffs.ionization
        resultMessage = `彻底电离！碰撞后出射电子保留能量 ${extraEnergy.toFixed(2)} eV`
      } else if (incidentEnergy >= levelDiffs.n4) {
        isExcited = true
        finalLevel = 4
        const remain = incidentEnergy - levelDiffs.n4
        resultMessage = `激发成功：跃迁至 n=4，碰后出射电子剩余 ${remain.toFixed(2)} eV`
      } else if (incidentEnergy >= levelDiffs.n3) {
        isExcited = true
        finalLevel = 3
        const remain = incidentEnergy - levelDiffs.n3
        resultMessage = `激发成功：跃迁至 n=3，碰后出射电子剩余 ${remain.toFixed(2)} eV`
      } else if (incidentEnergy >= levelDiffs.n2) {
        isExcited = true
        finalLevel = 2
        const remain = incidentEnergy - levelDiffs.n2
        resultMessage = `激发成功：跃迁至 n=2，碰后出射电子剩余 ${remain.toFixed(2)} eV`
      } else {
        isExcited = false
        finalLevel = 1
        resultMessage = '激发失败：入射电子动能低于 10.2 eV，未能激发氢原子'
      }
    }

    if (isExcited && finalLevel < 5) {
      if (atomQuantity === 0) {
        totalPhotons = (finalLevel * (finalLevel - 1)) / 2
      } else {
        totalPhotons = finalLevel - 1
      }
    }

    const quantities: PhysicsPanelData['quantities'] = [
      {
        label: '激发媒介',
        value: excitationType === 0 ? '光子 (严格共振)' : '实物电子 (碰撞传递)',
        unit: '',
      },
      {
        label: '入射能量',
        symbol: 'E_in',
        value: incidentEnergy.toFixed(1),
        unit: 'eV',
      },
      {
        label: '激发判定状态',
        value: resultMessage,
        unit: '',
        highlight: isExcited ? 'positive' : 'negative',
      },
    ]

    if (isExcited && finalLevel < 5) {
      quantities.push({
        label: atomQuantity === 0 ? '光子最多发射种数 (一群)' : '光子最多发射种数 (单个)',
        symbol: 'N',
        value: totalPhotons.toString(),
        unit: '种',
        highlight: 'extreme',
      })
    }

    const formulas: PhysicsPanelData['formulas'] = [
      {
        name: '光子吸收激发条件',
        latex: 'h\\nu = E_m - E_n \\quad (\\text{或 } h\\nu \\ge |E_n| \\text{ 电离})',
        condition: '光子能量必须恰好等于两能级差',
        level: 'core',
      },
      {
        name: '实物粒子碰撞条件',
        latex: 'E_k \\ge E_m - E_n',
        condition: '碰撞粒子动能大于等于能级差即可传递能量',
        level: 'core',
      },
      {
        name: '一群原子谱线种数',
        latex: 'N = C_n^2 = \\frac{n(n-1)}{2}',
        level: 'important',
      },
      {
        name: '单个原子谱线种数',
        latex: 'N_{\\max} = n - 1',
        level: 'important',
      },
    ]

    const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
      { text: '光子激发：光子能量必须“严丝合缝”等于能级差；若不相等则完全不吸收。', importance: 'gaokao' },
      { text: '电子碰撞：实物粒子动能只需“大于或等于”能级差，通过非弹性碰撞带走余能。', importance: 'gaokao' },
      { text: '考题陷阱：审题注意“一群处于激发态”与“单个处于激发态”的谱线种数区别。', importance: 'gaokao' },
    ]

    const warnings = []
    if (excitationType === 0 && !isExcited) {
      warnings.push({ text: '光子能量不满足能级差，未被吸收！', level: 'warning' as const })
    }

    return {
      quantities,
      formulas,
      gaokaoPoints,
      warnings,
      mnemonic: '一群氢原子 C(n,2)，一个氢原子 n-1；光子照射必须准，电子碰撞超差行。',
    }
  }

  if (mode === 2) {
    // 阶段三：高考综合应用（跃迁辐射光子激发光电效应）
    const radiationPhotonIndex = params.radiationPhotonIndex ?? 1
    const workFunction = params.workFunction ?? SODIUM_WORK_FUNCTION
    const stoppingVoltage = params.stoppingVoltage ?? 0

    const photonEnergies = [0.66, 2.55, 12.75, 1.89, 12.09, 10.20]
    const photonLabels = ['4→3 跃迁 (0.66 eV)', '4→2 跃迁 (2.55 eV)', '4→1 跃迁 (12.75 eV)', '3→2 跃迁 (1.89 eV)', '3→1 跃迁 (12.09 eV)', '2→1 跃迁 (10.20 eV)']

    const hv = photonEnergies[radiationPhotonIndex]
    const isPhotoelectric = hv >= workFunction
    const Ekm = isPhotoelectric ? hv - workFunction : 0
    const Uc = Ekm

    let currentStatus = ''
    if (!isPhotoelectric) {
      currentStatus = '未发生光电效应 (光子能量 hν < 逸出功 W₀)'
    } else if (stoppingVoltage >= Uc) {
      currentStatus = '发生光电效应，光电流已被反向遏止电压拦截'
    } else {
      currentStatus = '发生光电效应，形成稳定光电流'
    }

    const quantities: PhysicsPanelData['quantities'] = [
      {
        label: '照射光子来源',
        value: photonLabels[radiationPhotonIndex],
        unit: '',
      },
      {
        label: '光子能量',
        symbol: 'hν',
        value: hv.toFixed(2),
        unit: 'eV',
      },
      {
        label: '金属逸出功',
        symbol: 'W_0',
        value: workFunction.toFixed(2),
        unit: 'eV',
      },
      {
        label: '光电子最大初动能',
        symbol: 'E_km',
        value: isPhotoelectric ? Ekm.toFixed(2) : '—',
        unit: 'eV',
        highlight: isPhotoelectric ? 'positive' : undefined,
      },
      {
        label: '理论遏止电压',
        symbol: 'U_c',
        value: isPhotoelectric ? Uc.toFixed(2) : '—',
        unit: 'V',
        highlight: isPhotoelectric ? 'extreme' : undefined,
      },
      {
        label: '回路工作状态',
        value: currentStatus,
        unit: '',
        highlight: isPhotoelectric && stoppingVoltage < Uc ? 'positive' : 'negative',
      },
    ]

    const formulas: PhysicsPanelData['formulas'] = [
      {
        name: '能级跃迁辐射方程',
        latex: 'h\\nu = E_m - E_n',
        level: 'core',
      },
      {
        name: '爱因斯坦光电效应方程',
        latex: 'E_{\\text{km}} = h\\nu - W_0',
        level: 'core',
      },
      {
        name: '遏止电压关系式',
        latex: 'eU_c = E_{\\text{km}}',
        level: 'core',
      },
      {
        name: '高考综合联立方程',
        latex: 'eU_c = (E_m - E_n) - W_0',
        level: 'important',
      },
    ]

    const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
      { text: '光电效应发生条件：入射光子能量 hν ≥ 逸出功 W₀。', importance: 'gaokao' },
      { text: '能级跃迁产生的光子照射金属板时，跃迁能级差越大，发射光电子初动能越大，遏止电压越高。', importance: 'gaokao' },
      { text: '遏止电压判定：加反向电压 U 时，当 U ≥ Uc，最大初动能的光电子也无法到达阳极，电流为零。', importance: 'core' },
    ]

    const warnings = []
    if (!isPhotoelectric) {
      warnings.push({ text: '光子能量不足以克服金属逸出功，无法发生光电效应！', level: 'warning' as const })
    }

    return {
      quantities,
      formulas,
      gaokaoPoints,
      warnings,
      mnemonic: '跃迁发出高能光，照射金属电子狂；逸出功外是动能，反向电压截止强。',
    }
  }

  return null
}

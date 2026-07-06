import type { PhysicsPanelData } from './types'

export function buildModernPhysicsQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-bohr-theory') return null

  const mode = params.mode ?? 0

  if (mode === 0) {
    // 阶段一：科学探索历程
    const modelType = params.modelType ?? 1
    const impactParameter = params.impactParameter ?? 15

    let scatterResult = ''
    if (modelType === 0) {
      scatterResult = '几乎全部直穿（无明显偏转）'
    } else {
      if (impactParameter < 6) {
        scatterResult = '极少数粒子大角度反弹 (θ > 90°)'
      } else if (impactParameter < 15) {
        scatterResult = '少数粒子发生明显大角度偏转'
      } else {
        scatterResult = '绝大多数粒子沿原方向或极小角度穿过'
      }
    }

    const quantities: PhysicsPanelData['quantities'] = [
      {
        label: '原子模型',
        value: modelType === 0 ? '汤姆孙“枣糕模型”' : '卢瑟福“核式结构模型”',
        unit: '',
      },
      {
        label: '碰撞参数 b',
        value: impactParameter.toString(),
        unit: 'px',
        highlight: impactParameter < 10 ? 'extreme' as const : undefined,
      },
      {
        label: '散射行为预测',
        value: scatterResult,
        unit: '',
        highlight: modelType === 1 && impactParameter < 6 ? 'negative' as const : undefined,
      },
    ]

    const formulas: PhysicsPanelData['formulas'] = [
      {
        name: '库仑定律',
        latex: 'F = k \\frac{q_1 q_2}{r^2}',
        level: 'core',
      },
    ]

    const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
      { text: '卢瑟福金箔散射实验证实了原子核式结构的存在。', importance: 'gaokao' },
      { text: '现象：绝大多数无偏转，少数发生较大偏转，极少数被反弹。', importance: 'gaokao' },
      { text: '经典电磁学困难：原子的稳定性问题与分立的线状光谱。', importance: 'core' },
    ]

    return {
      quantities,
      formulas,
      gaokaoPoints,
      warnings: [],
      mnemonic: '汤姆孙寻得电子，枣糕模型初立；卢瑟福金箔散射，核式结构惊天。',
    }
  }

  if (mode === 1) {
    // 阶段二：玻尔原子模型
    const targetLevel = params.targetLevel ?? 2
    const E1 = -13.6
    const r1 = 0.53 // 0.53 Å (10^-10 m)

    const En = E1 / (targetLevel * targetLevel)
    const rn = targetLevel * targetLevel * r1

    const quantities: PhysicsPanelData['quantities'] = [
      {
        label: '当前能级 n',
        value: targetLevel.toString(),
        unit: '',
      },
      {
        label: '能级能量 En',
        value: En.toFixed(2),
        unit: 'eV',
        highlight: targetLevel === 1 ? 'negative' as const : 'positive' as const,
      },
      {
        label: '轨道半径 rn',
        value: rn.toFixed(2),
        unit: '×10⁻¹⁰ m',
      },
    ]

    const formulas: PhysicsPanelData['formulas'] = [
      {
        name: '能级公式',
        latex: 'E_n = \\frac{E_1}{n^2} = -\\frac{13.6}{n^2} \\text{ eV}',
        level: 'core',
      },
      {
        name: '轨道半径公式',
        latex: 'r_n = n^2 r_1 = n^2 \\cdot 0.53 \\cdot 10^{-10} \\text{ m}',
        level: 'core',
      },
      {
        name: '玻尔跃迁假设',
        latex: 'h\\nu = |E_m - E_n|',
        level: 'core',
      },
    ]

    const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
      { text: '定态假设：在定态中，电子虽有加速度但并不辐射电磁波。', importance: 'core' },
      { text: '激发态（n > 1）不稳定，会自发向低能级跃迁并辐射光子。', importance: 'gaokao' },
      { text: '当原子吸收特定光子或与粒子碰撞时，会从低能级跃迁到高能级。', importance: 'gaokao' },
    ]

    return {
      quantities,
      formulas,
      gaokaoPoints,
      warnings: [],
      mnemonic: '轨道量子化，能级是平方；跃迁看差值，辐射出光芒。',
    }
  }

  if (mode === 2) {
    // 阶段三：跃迁与激发机制
    const atomQuantity = params.atomQuantity ?? 0
    const excitationType = params.excitationType ?? 0
    const incidentEnergy = params.incidentEnergy ?? 10.2

    // 跃迁所需要的能量差
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
      // 光子照射
      if (incidentEnergy >= levelDiffs.ionization) {
        isExcited = true
        finalLevel = 5 // 5 表示电离
        const extraEnergy = incidentEnergy - levelDiffs.ionization
        resultMessage = `彻底电离！光子被完全吸收，电子初动能为 ${extraEnergy.toFixed(2)} eV`
      } else {
        // 必须严格等于能级差
        const matchThreshold = 0.05 // 允许微小数值误差
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
          resultMessage = '激发失败：光子能量不满足任何能级差，未被吸收 (直穿)'
        }
      }
    } else {
      // 电子碰撞
      if (incidentEnergy >= levelDiffs.ionization) {
        isExcited = true
        finalLevel = 5
        const extraEnergy = incidentEnergy - levelDiffs.ionization
        resultMessage = `彻底电离！实物碰撞，出射电子保留能量 ${extraEnergy.toFixed(2)} eV`
      } else if (incidentEnergy >= levelDiffs.n4) {
        isExcited = true
        finalLevel = 4
        const remain = incidentEnergy - levelDiffs.n4
        resultMessage = `激发成功：跃迁至 n=4，碰撞后出射电子携带 ${remain.toFixed(2)} eV`
      } else if (incidentEnergy >= levelDiffs.n3) {
        isExcited = true
        finalLevel = 3
        const remain = incidentEnergy - levelDiffs.n3
        resultMessage = `激发成功：跃迁至 n=3，碰撞后出射电子携带 ${remain.toFixed(2)} eV`
      } else if (incidentEnergy >= levelDiffs.n2) {
        isExcited = true
        finalLevel = 2
        const remain = incidentEnergy - levelDiffs.n2
        resultMessage = `激发成功：跃迁至 n=2，碰撞后出射电子携带 ${remain.toFixed(2)} eV`
      } else {
        isExcited = false
        finalLevel = 1
        resultMessage = '激发失败：入射电子能量低于 10.2 eV，未能激发氢原子'
      }
    }

    // 计算产生的最多光子种类数
    if (isExcited && finalLevel < 5) {
      if (atomQuantity === 0) {
        // 一群氢原子: C_n^2
        totalPhotons = (finalLevel * (finalLevel - 1)) / 2
      } else {
        // 单个氢原子: n-1
        totalPhotons = finalLevel - 1
      }
    }

    const quantities: PhysicsPanelData['quantities'] = [
      {
        label: '激发媒介',
        value: excitationType === 0 ? '光子 (Photon)' : '电子 (Electron)',
        unit: '',
      },
      {
        label: '入射能量',
        value: incidentEnergy.toFixed(1),
        unit: 'eV',
      },
      {
        label: '激发状态',
        value: resultMessage,
        unit: '',
        highlight: isExcited ? ('positive' as const) : ('negative' as const),
      },
    ]

    if (isExcited && finalLevel < 5) {
      quantities.push({
        label: '辐射光子最大种类数',
        value: totalPhotons.toString(),
        unit: '种',
        highlight: 'extreme' as const,
      })
    }

    const formulas: PhysicsPanelData['formulas'] = [
      {
        name: '光子吸收条件',
        latex: 'h\\nu = E_m - E_n \\quad (\\text{或 } h\\nu \\ge |E_1| \\text{ 电离})',
        level: 'core',
      },
      {
        name: '电子碰撞条件',
        latex: 'E_{\\text{k}} \\ge E_m - E_n',
        level: 'core',
      },
      {
        name: '光谱线种数 (一群)',
        latex: 'N = C_n^2 = \\frac{n(n-1)}{2}',
        level: 'important',
      },
      {
        name: '光谱线种数 (一个)',
        latex: 'N_{\\text{max}} = n - 1',
        level: 'important',
      },
    ]

    const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
      { text: '光子激发：入射光子的能量必须“严丝合缝”地等于两个能级的差值。', importance: 'gaokao' },
      { text: '电子激发：入射电子能量只需“大于或等于”能级差，通过非弹性碰撞传递部分能量。', importance: 'gaokao' },
      { text: '注意题目主体：“一个”氢原子向低能级跃迁最多只能发射 (n-1) 种频率的光子。', importance: 'gaokao' },
    ]

    const warnings = []
    if (excitationType === 0 && !isExcited) {
      warnings.push({ text: '光子能量不满足两能级之差，无法激发原子！', level: 'warning' as const })
    }

    return {
      quantities,
      formulas,
      gaokaoPoints,
      warnings,
      mnemonic: '一群氢原子 C(n,2)，一个氢原子 n-1；光子照射必须准，电子碰撞超差行。',
    }
  }

  if (mode === 3) {
    // 阶段四：高考综合应用
    const radiationPhotonIndex = params.radiationPhotonIndex ?? 1
    const workFunction = params.workFunction ?? 2.29
    const stoppingVoltage = params.stoppingVoltage ?? 0

    // 光子能量定义
    // (0:4->3, 1:4->2, 2:4->1, 3:3->2, 4:3->1, 5:2->1)
    const photonEnergies = [0.66, 2.55, 12.75, 1.89, 12.09, 10.20]
    const photonLabels = ['4→3 跃迁', '4→2 跃迁', '4→1 跃迁', '3→2 跃迁', '3→1 跃迁', '2→1 跃迁']

    const hv = photonEnergies[radiationPhotonIndex]
    const isPhotoelectric = hv >= workFunction
    const Ekm = isPhotoelectric ? hv - workFunction : 0
    const Uc = Ekm // 遏止电压 (V)

    let currentStatus = ''
    if (!isPhotoelectric) {
      currentStatus = '未发生光电效应（光子能量小于逸出功）'
    } else if (stoppingVoltage >= Uc) {
      currentStatus = '发生光电效应，但光电流已截止（反向电压 ≥ 遏止电压）'
    } else {
      currentStatus = '发生光电效应，且形成稳定的光电流'
    }

    const quantities: PhysicsPanelData['quantities'] = [
      {
        label: '照射光子来源',
        value: photonLabels[radiationPhotonIndex],
        unit: '',
      },
      {
        label: '光子能量 hν',
        value: hv.toFixed(2),
        unit: 'eV',
      },
      {
        label: '金属逸出功 W₀',
        value: workFunction.toFixed(2),
        unit: 'eV',
      },
      {
        label: '光电子最大初动能 Ekm',
        value: isPhotoelectric ? Ekm.toFixed(2) : '—',
        unit: 'eV',
        highlight: isPhotoelectric ? 'positive' as const : undefined,
      },
      {
        label: '理论遏止电压 Uc',
        value: isPhotoelectric ? Uc.toFixed(2) : '—',
        unit: 'V',
        highlight: isPhotoelectric ? 'extreme' as const : undefined,
      },
      {
        label: '光电管状态',
        value: currentStatus,
        unit: '',
        highlight: isPhotoelectric && stoppingVoltage < Uc ? 'positive' as const : 'negative' as const,
      },
    ]

    const formulas: PhysicsPanelData['formulas'] = [
      {
        name: '能级跃迁公式',
        latex: 'h\\nu = E_m - E_n',
        level: 'core',
      },
      {
        name: '光电效应方程',
        latex: 'E_{\\text{km}} = h\\nu - W_0',
        level: 'core',
      },
      {
        name: '遏止电压关系',
        latex: 'eU_c = E_{\\text{km}}',
        level: 'core',
      },
      {
        name: '综合计算方程',
        latex: 'eU_c = (E_m - E_n) - W_0',
        level: 'important',
      },
    ]

    const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
      { text: '光电效应发生条件：入射光子能量 hν ≥ 逸出功 W₀。', importance: 'gaokao' },
      { text: '遏止电压与入射光频率成线性正比，与光强无关。', importance: 'gaokao' },
      { text: '在反向电压电路中，当加反向电压 U ≥ Uc 时，光电流恰好减小到零。', importance: 'core' },
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

import type { PhysicsPanelData, WarningItem, ParamDefs } from './types'
import { normalizeParams } from './types'
import { calculateThinFilmInterference, calculateWedgeFringeSpacing } from '@/physics'
import { wavelengthToHex } from '@/physics/optics'
import { PHYSICS_COLORS } from '@/theme/physics'

interface ThinFilmParams {
  mode: number
  wavelength: number
  filmThickness: number
  n_film: number
  wedgeAngle_mrad: number
}

const THIN_FILM_DEFAULTS: ParamDefs<ThinFilmParams> = {
  mode: { default: 0 },
  wavelength: { default: 550 },
  filmThickness: { default: 100 },
  n_film: { default: 1.38 },
  wedgeAngle_mrad: { default: 0.3 },
}

export function buildThinFilmInterferenceQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-thin-film-interference') return null

  const p = normalizeParams(params, THIN_FILM_DEFAULTS)
  const wlHex = wavelengthToHex(p.wavelength)

  const tfRes = calculateThinFilmInterference({
    wavelength_nm: p.wavelength,
    filmThickness_nm: p.filmThickness,
    n_film: p.n_film,
    n_substrate: 1.52,
    theta_i_deg: 0,
  })

  const angle_rad = (p.wedgeAngle_mrad || 0.3) * 1e-3
  const wedgeSpacing_mm = calculateWedgeFringeSpacing(p.wavelength, angle_rad, 1.0)

  // 1. 物理量展示
  const quantities: PhysicsPanelData['quantities'] = [
    {
      label: '光波长',
      symbol: 'λ',
      value: p.wavelength,
      unit: 'nm',
      color: wlHex,
      highlight: 'positive',
    },
  ]

  if (p.mode === 0) {
    quantities.push(
      {
        label: '薄膜厚度',
        symbol: 'd',
        value: p.filmThickness,
        unit: 'nm',
        color: PHYSICS_COLORS.displacement,
      },
      {
        label: '薄膜折射率',
        symbol: 'n',
        value: p.n_film,
        unit: '',
        color: PHYSICS_COLORS.referencePoint,
      },
      {
        label: '几何光程差',
        symbol: '2nd',
        value: +(tfRes.opticalPathDiff_nm).toFixed(1),
        unit: 'nm',
        color: PHYSICS_COLORS.amplitude,
      },
      {
        label: '反射光强比',
        symbol: 'R',
        value: +((tfRes.reflectance * 100).toFixed(1)),
        unit: '%',
        color: tfRes.isDestructive ? PHYSICS_COLORS.wavelengthGreen : PHYSICS_COLORS.wavelengthYellow,
        highlight: tfRes.isDestructive ? 'extreme' : undefined,
      },
      {
        label: '理想增透厚度',
        symbol: 'd₀',
        value: +(tfRes.idealCoatingThickness_nm).toFixed(1),
        unit: 'nm',
        color: PHYSICS_COLORS.velocity,
      },
    )
  } else if (p.mode === 1) {
    quantities.push(
      {
        label: '劈尖倾角',
        symbol: 'α',
        value: p.wedgeAngle_mrad,
        unit: 'mrad',
        color: PHYSICS_COLORS.wavelengthYellow,
      },
      {
        label: '直条纹间距',
        symbol: 'Δx',
        value: +(wedgeSpacing_mm).toFixed(3),
        unit: 'mm',
        color: PHYSICS_COLORS.velocity,
        highlight: 'positive',
      },
    )
  } else {
    quantities.push(
      {
        label: '透镜曲率半径',
        symbol: 'R',
        value: 2.0,
        unit: 'm',
        color: PHYSICS_COLORS.referencePoint,
      },
      {
        label: '中心接触点',
        symbol: 'r₀',
        value: 0,
        unit: 'mm (暗斑)',
        color: PHYSICS_COLORS.textMuted,
        highlight: 'extreme',
      },
    )
  }

  // 2. 核心公式
  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '增透膜理想厚度公式',
      latex: 'd = \\frac{\\lambda}{4n}',
      condition: '垂直入射且满足 n_{空气} < n_{膜} < n_{玻璃}（两界面均有半波损失，光程差 2nd = λ/2）',
      level: 'core',
      note: '人眼最敏感的黄绿光 (λ≈550nm) 增透后，剩余反射光呈淡紫色（相机镜头紫蓝色镀膜原理）',
    },
    {
      name: '劈尖等厚干涉条纹间距',
      latex: '\\Delta x = \\frac{\\lambda}{2n\\theta} \\approx \\frac{L}{2nh} \\lambda',
      condition: '小角度空气劈尖 (n=1)，θ 为劈尖夹角，L 为板长，h 为垫片厚度',
      level: 'important',
      note: '条纹向尖端弯曲对应此处凹陷，向厚端弯曲对应此处凸起（等厚线判据）',
    },
    {
      name: '牛顿环暗环半径公式',
      latex: 'r_m = \\sqrt{m R \\lambda} \\quad (m = 0, 1, 2, \\dots)',
      condition: '平凸透镜与平板玻璃接触，垂直入射反射光干涉',
      level: 'derived',
      note: 'm=0 对应中心暗斑；r_m 随 m 开平方增加，由中心向边缘条纹由疏变密',
    },
  ]

  // 3. 高考要点
  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    {
      text: '高考高频：增透膜原理为薄膜前后两表面反射光的干涉相消，反射率极小时透射率最大',
      importance: 'gaokao',
    },
    {
      text: '相机镀膜显色本质：膜厚常按人眼敏感的绿光(550nm)增透，绿光反射被相消抵消，红紫光反射叠加显蓝紫色',
      importance: 'core',
    },
    {
      text: '山东高考真题：同一条纹对应空气膜等厚。凹陷处膜变厚，条纹必向薄端弯；弯曲一个条纹间距对应缺陷深度恰为 λ/2',
      importance: 'hard',
    },
    {
      text: '半波损失判据：光从光疏介质进入光密介质，在界面反射时反射光相位突变 π（相当于光程损失 λ/2）',
      importance: 'gaokao',
    },
    {
      text: '牛顿环中心暗斑本质：玻璃板与透镜接触点空气膜厚度 d=0，但下表面反射有半波损失，光程差恒为 λ/2 导致相消',
      importance: 'core',
    },
  ]

  // 4. 易错警示
  const warnings: WarningItem[] = []
  if (p.mode === 0 && Math.abs(p.filmThickness - tfRes.idealCoatingThickness_nm) < 5) {
    warnings.push({
      text: '当前薄膜厚度精确匹配 λ/(4n) 增透极小点，反射光强近乎为零，透射效率达到峰值。',
      level: 'info',
    })
  }

  // 5. 口诀
  const mnemonic = '增透膜厚四分之一波长，前后反射相消透光强；劈尖条纹向薄弯为凹，牛顿环暗在中央内疏外密。'

  return { quantities, formulas, gaokaoPoints, warnings, mnemonic }
}

import type { PhysicsPanelData, ParamDefs, Formula, WarningItem } from './types'
import { normalizeParams } from './types'
import {
  calculateMultimeterCircuit,
} from '@/physics/experimentMultimeter'
import { PHYSICS_COLORS } from '@/theme/physics'

interface MultimeterParams {
  rangeIndex: number
  zeroOffset: number
  componentType: number
  rxNominal: number
  probesConnected: number
}

const MULTIMETER_DEFAULTS: ParamDefs<MultimeterParams> = {
  rangeIndex: { default: 6 }, // 默认 欧姆挡 ×1
  zeroOffset: { default: 0 },
  componentType: { default: 0 },
  rxNominal: { default: 30 },
  probesConnected: { default: 1 },
}

/** 欧姆挡：欧姆表回路（闭合电路欧姆定律 + 调零 + 中值电阻） */
const OHM_FORMULAS: Formula[] = [
  {
    name: '欧姆表回路欧姆定律',
    latex: 'I = \\frac{E}{R_{\\text{内}} + R_x} = \\frac{E}{R_{\\Omega} + R_x}',
    level: 'core',
    condition: '闭合回路电流与待测电阻呈非线性反比关系',
  },
  {
    name: '欧姆调零满偏电流',
    latex: 'I_g = \\frac{E}{R_{\\Omega}} \\implies R_{\\Omega} = \\frac{E}{I_g}',
    level: 'core',
    condition: '短接红黑表笔时电流达满偏，对应欧姆刻度 0',
  },
  {
    name: '中值电阻与半偏状态',
    latex: 'I = \\frac{1}{2} I_g \\iff R_x = R_{\\Omega} = R_{\\text{中}}',
    level: 'core',
    condition: '指针指正中央刻度时，待测阻值恰好等于内部总内阻',
  },
]

/** 直流电压挡：表头串联分压大电阻（电表改装） */
const DCV_FORMULAS: Formula[] = [
  {
    name: '串联分压电阻',
    latex: 'R_V = \\frac{U}{I_g} - R_g = (n - 1)R_g',
    level: 'core',
    condition: '电压挡 = 表头串联一个大电阻，量程越大串联电阻越大',
  },
  {
    name: '电压表总内阻',
    latex: 'R_{\\text{内}} = R_g + R_V = \\frac{U_{\\text{满}}}{I_g}',
    level: 'important',
    condition: '理想电压表内阻无穷大，实际内阻越大对被测电路影响越小',
  },
  {
    name: '电压扩程倍数',
    latex: 'n = \\frac{U}{U_g} = \\frac{U}{I_g R_g}',
    level: 'core',
    condition: 'U_g = I_g R_g 为表头满偏电压',
  },
]

/** 直流电流挡：表头并联分流小电阻（电表改装） */
const DCA_FORMULAS: Formula[] = [
  {
    name: '并联分流电阻',
    latex: 'R_A = \\frac{I_g R_g}{I - I_g} = \\frac{R_g}{n - 1}',
    level: 'core',
    condition: '电流挡 = 表头并联一个小电阻，量程越大分流电阻越小',
  },
  {
    name: '电流表总内阻',
    latex: 'R_{\\text{内}} = \\frac{R_g R_A}{R_g + R_A}',
    level: 'important',
    condition: '理想电流表内阻为零，实际内阻越小对被测电路影响越小',
  },
  {
    name: '电流扩程倍数',
    latex: 'n = \\frac{I}{I_g} = 1 + \\frac{R_g}{R_A}',
    level: 'core',
    condition: '总电流 = 表头电流 + 分流电阻电流',
  },
]

/**
 * 多用电表的公式体系必须跟随当前挡位。
 *
 * 旧实现把三条欧姆表公式写死：学生切到 DCV / DCA 挡时，右屏仍在讲
 * `I = E/(R_内+R_x)`，与"正在测电压/测电流"完全脱节。
 * 这里按 `calculateMultimeterCircuit()` 返回的 `rangeType` 分派，
 * 电压挡讲串联分压扩程、电流挡讲并联分流扩程——正是高考电表改装的两条主线。
 */
function formulasForRange(rangeType: 'OFF' | 'DCV' | 'DCA' | 'OHM'): Formula[] {
  switch (rangeType) {
    case 'DCV':
      return DCV_FORMULAS
    case 'DCA':
      return DCA_FORMULAS
    case 'OHM':
      return OHM_FORMULAS
    case 'OFF':
    default:
      // 关断挡没有测量回路，硬塞欧姆表公式反而误导；安全规范见「高考要点·用毕归位」
      return []
  }
}

/** 操作规范提示同样随挡位切换 */
function warningsForRange(rangeType: 'OFF' | 'DCV' | 'DCA' | 'OHM'): WarningItem[] {
  switch (rangeType) {
    case 'DCV':
      return [
        {
          text: '易错陷阱：电压挡必须并联在被测元件两端，且红表笔接高电势端；量程应使指针落在满偏的 1/3~2/3 之间，超量程会打表。',
          level: 'warning',
        },
      ]
    case 'DCA':
      return [
        {
          text: '易错陷阱：电流挡必须串联接入电路，红表笔接电流流入端；严禁把电流挡直接并在电源两端（相当于短路，会烧毁表头或保险丝）。',
          level: 'danger',
        },
      ]
    case 'OHM':
      return [
        {
          text: '易错陷阱：测电阻前必须将待测电阻从原电路中断开，严禁带电测量；手握表笔时切勿同时触碰金属针尖，防止人体并联电阻引入测量误差。',
          level: 'danger',
        },
      ]
    case 'OFF':
    default:
      return [
        {
          text: '用毕归位：测量结束后必须把选择开关旋至 OFF 挡或交流电压最高挡，防止两表笔意外短接放电耗尽内部电池。',
          level: 'info',
        },
      ]
  }
}

export function buildExperimentMultimeterQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-multimeter') return null

  const p = normalizeParams(params, MULTIMETER_DEFAULTS)
  const isConnected = p.probesConnected === 1

  const res = calculateMultimeterCircuit({
    rangeIndex: p.rangeIndex,
    zeroOffset: p.zeroOffset,
    componentType: p.componentType,
    rxNominal: p.rxNominal,
    probesConnected: isConnected,
  })

  const deflectionPercent = +(res.deflectionRatio * 100).toFixed(1)
  const rMidText = res.rangeType === 'OHM' ? `${res.rMid} Ω` : '—'

  return {
    quantities: [
      {
        label: '当前选择挡位',
        value: res.rangeName,
        unit: '',
        color: PHYSICS_COLORS.velocity,
        highlight: 'positive',
      },
      {
        label: '仪表当前读数',
        value: res.readingDisplay,
        unit: '',
        color: PHYSICS_COLORS.emf,
        highlight: 'extreme',
      },
      {
        label: '表头指针偏转率',
        value: `${deflectionPercent}%`,
        unit: ' (满偏为100%)',
        color: PHYSICS_COLORS.acceleration,
      },
      {
        label: '当前挡中值电阻 R_中',
        value: rMidText,
        unit: '',
      },
      {
        label: '测量工况与换挡建议',
        value: res.statusText,
        unit: '',
        highlight: res.statusText.includes('建议') || res.statusText.includes('⚠️') ? 'negative' : 'positive',
      },
    ],
    formulas: formulasForRange(res.rangeType),
    gaokaoPoints: [
      {
        text: '【红进黑出铁律】电流始终从红表笔流入多用电表、从黑表笔流出。内部电源正极连接的是黑表笔，负极连接红表笔。测二极管时，黑表笔接二极管正极时指针偏角大（正向导通）。',
        importance: 'gaokao',
      },
      {
        text: '【换挡必调零】欧姆表每次换挡后，回路内阻发生数量级改变，必须重新短接红黑表笔进行欧姆调零，否则测量数据作废。',
        importance: 'gaokao',
      },
      {
        text: '【换挡口诀：大角小挡，小角大挡】若指针偏角太小（指在刻度盘左侧密集区），说明待测电阻过大，读数误差大，应换【更大倍率】挡；反之指针偏角过大接近0，应换【更小倍率】挡。',
        importance: 'gaokao',
      },
      {
        text: '【用毕归位】测量完毕后，选择开关必须旋至 OFF 挡或交流电压最高挡（如 ACV 500V/1000V），防止两表笔意外短接放电耗尽内部电池。',
        importance: 'core',
      },
      {
        text: '【黑箱探测铁律】探测未知黑箱时，第一步必须先用【直流电压挡】测量任意两端子间是否有电压！确认无电源后方可使用欧姆挡，严禁直接用欧姆挡测量含电源电路（防止烧毁表头）。',
        importance: 'gaokao',
      },
      {
        text: '【电表改装】电压挡串联分压电阻、电流挡并联分流电阻，改的是量程不是表头；改装后内阻随之变化，电压表内阻越大越好、电流表内阻越小越好。',
        importance: 'gaokao',
      },
    ],
    warnings: warningsForRange(res.rangeType),
  }
}

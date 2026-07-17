// 物理常量定义
export const MASS_PROTON = 1.007277; // u
export const MASS_NEUTRON = 1.008665; // u
export const MASS_MEV_CONVERSION = 931.5; // MeV/u

// 核种静态数据
export interface NuclideData {
  name: string
  symbol: string
  Z: number
  N: number
  A: number
  mNucleus: number
  eBinding: number // MeV
}

export const NUCLIDES: NuclideData[] = [
  { name: '氕', symbol: '¹₁H', Z: 1, N: 0, A: 1, mNucleus: MASS_PROTON, eBinding: 0 },
  { name: '氘', symbol: '²₁H', Z: 1, N: 1, A: 2, mNucleus: 2.013553, eBinding: 2.22 },
  { name: '氚', symbol: '³₁H', Z: 1, N: 2, A: 3, mNucleus: 3.015500, eBinding: 8.48 },
  { name: '氦-4', symbol: '⁴₂He', Z: 2, N: 2, A: 4, mNucleus: 4.001506, eBinding: 28.30 },
  { name: '碳-12', symbol: '¹²₆C', Z: 6, N: 6, A: 12, mNucleus: 12.000000, eBinding: 89.09 },
  { name: '铁-56', symbol: '⁵⁶₂₆Fe', Z: 26, N: 30, A: 56, mNucleus: 55.920680, eBinding: 492.26 },
  { name: '铀-238', symbol: '²³⁸₉₂U', Z: 92, N: 146, A: 238, mNucleus: 238.000300, eBinding: 1801.7 },
]

// 结合能曲线核心控制点
export const CURVE_POINTS = [
  { x: 1, y: 0 },
  { x: 2, y: 1.11 },
  { x: 3, y: 2.83 },
  { x: 4, y: 7.07 },
  { x: 6, y: 5.33 },
  { x: 12, y: 7.68 },
  { x: 16, y: 7.98 },
  { x: 20, y: 8.03 },
  { x: 30, y: 8.40 },
  { x: 40, y: 8.60 },
  { x: 56, y: 8.79 },
  { x: 80, y: 8.60 },
  { x: 120, y: 8.50 },
  { x: 160, y: 8.20 },
  { x: 200, y: 8.00 },
  { x: 235, y: 7.59 },
  { x: 238, y: 7.57 },
]

// 共享粒子类型
export interface NuclearParticle {
  id: string
  type: 'proton' | 'neutron'
  x: number
  y: number
  vx?: number
  vy?: number
  opacity?: number
}

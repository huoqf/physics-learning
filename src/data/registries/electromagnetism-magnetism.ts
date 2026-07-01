import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

// ===== 电磁学 · 磁场（[M4-1]）=====
export const electromagnetismMagnetismAnimations = defineAnimations({
  'anim-ampere-force': {
    title: '安培力 F=BIL',
    knowledgeId: 'electricity-3-1',
    Component: lazy(() => import('@/features/electromagnetism/magnetism/AmpereForce')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/magnetism/AmpereForceSidebar')),
    defaultParams: {
      mode: 0,
      I: 2.0,
      B: 1.0,
      L: 4.0,
      theta: 30,
      mu: 0.2,
      thetaIB: 90,
      bFieldDir: 0,
      showLeftHand: 1,
      showForceComponents: 1,
    } as const,
    paramMeta: [
      { key: 'I', label: '电流 I', min: -10.0, max: 10.0, step: 0.5, unit: 'A' },
      { key: 'B', label: '磁感应强度 B', min: -2.0, max: 2.0, step: 0.1, unit: 'T' },
      { key: 'L', label: '导轨间距 L', min: 2.0, max: 5.0, step: 0.5, unit: 'm', showIf: 'mode', showIfValue: 0 },
      { key: 'thetaIB', label: '夹角 θ_IB', min: 0, max: 180, step: 5, unit: '°', showIf: 'mode', showIfValue: 0 },
      { key: 'theta', label: '导轨倾角 θ', min: 10, max: 60, step: 5, unit: '°', showIf: 'mode', showIfValue: 1 },
      { key: 'mu', label: '摩擦因数 μ', min: 0.0, max: 0.8, step: 0.05, unit: '', showIf: 'mode', showIfValue: 1 },
    ],
  },
  'anim-lorentz-force': {
    title: '洛伦兹力 F=qvB',
    knowledgeId: 'electricity-3-2',
    Component: lazy(() => import('@/features/electromagnetism/magnetism/VelocitySelector')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/magnetism/VelocitySelectorSidebar')),
    defaultParams: {
      mode: 0,
      q: 1.0,
      m: 1.0,
      v0: 10.0,
      B: 1.0,
      E: 10.0,
      qOverM: 1.0,
      keepTrack: 1,
      showElectricField: 1,
      showHandRule: 1,
    } as const,
    paramMeta: [
      { key: 'v0', label: '入射速度 v', min: 2, max: 20, step: 0.5, unit: 'm/s' },
      { key: 'B', label: '磁感应强度 B', min: 0.2, max: 4.0, step: 0.1, unit: 'T' },
      { key: 'E', label: '电场强度 E', min: 0, max: 40, step: 1, unit: 'V/m', showIf: 'mode', showIfValue: 1 },
      { key: 'qOverM', label: '荷质比 q/m', min: 0.2, max: 3.0, step: 0.1, unit: 'C/kg', showIf: 'mode', showIfValue: 1 },
    ],
  },
  'anim-charge-in-bfield': {
    title: '带电粒子在磁场中运动',
    knowledgeId: 'electricity-3-3',
    Component: lazy(() => import('@/features/electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField')),
    SidebarExtra: lazy(() => import('@/features/electromagnetism/magnetism/BoundaryMagneticField/ChargeInBFieldSidebar')),
    defaultParams: {
      mode: 0,
      boundaryType: 0, // 0: 单边界, 1: 双平行边界, 2: 圆形边界
      dynamicType: 0,  // 0: 旋转圆, 1: 缩放圆, 2: 平移圆
      q: 1,
      m: 1,
      v: 12,
      B: 1.2,
      theta: 60,
      magneticWidth: 5.0,
      magneticRadius: 4.0,
      showGeometry: 1,
      showArc: 1,
      showEnvelope: 0,
    } as const,
    paramMeta: [
      { key: 'v', label: '速度 v', min: 2.0, max: 20.0, step: 0.5, unit: 'm/s' },
      { key: 'B', label: '磁感应强度 B', min: 0.2, max: 3.0, step: 0.1, unit: 'T' },
      { key: 'theta', label: '射入夹角 θ', min: 15, max: 165, step: 5, unit: '°' },
      { key: 'magneticWidth', label: '板状磁场宽 d', min: 2.0, max: 8.0, step: 0.2, unit: 'm', showIf: 'boundaryType', showIfValue: 1 },
      { key: 'magneticRadius', label: '圆形磁场半径 R_b', min: 2.0, max: 8.0, step: 0.2, unit: 'm', showIf: 'boundaryType', showIfValue: 2 },
    ],
  },
})

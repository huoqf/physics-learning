import { useMemo } from 'react'
import {
  solveRefractionExperiment,
  type RefractionExperimentResult,
} from '@/physics/experimentRefraction'
import {
  INCIDENT_POINT_DESIGN,
  PX_PER_MM,
  ExperimentStep,
} from '../refractionExperimentLayout'

export interface UseRefractionExperimentPhysicsParams {
  theta1?: number
  n?: number
  d_mm?: number
  pinDist?: number
  errorOffset?: number
  step?: number
  method?: number
}

export interface RefractionScenePoint {
  x: number
  y: number
}

export interface RefractionExperimentPhysicsResult {
  /** 纯物理计算真源结果 */
  physics: RefractionExperimentResult

  /** 当前实验步骤 */
  step: ExperimentStep
  /** 数据处理方法: 0-量角器法, 1-单位圆法, 2-图像斜率法 */
  method: number

  /** 场景像素设计坐标系点位 */
  design: {
    pointO: RefractionScenePoint
    pointOReal: RefractionScenePoint
    pointODrawn: RefractionScenePoint
    pinP1: RefractionScenePoint
    pinP2: RefractionScenePoint
    pinP3: RefractionScenePoint
    pinP4: RefractionScenePoint

    /** 入射光线起点 (延长至纸张边缘) */
    rayInStart: RefractionScenePoint
    /** 出射光线终点 (延长至纸张边缘) */
    rayOutEnd: RefractionScenePoint

    /** 玻璃砖厚度 (设计像素) */
    glassThicknessPx: number
    drawnThicknessPx: number
    /** 观察者人眼视线位置 */
    eyePos: RefractionScenePoint
    /** 虚像视线指引线 */
    virtualLineStart: RefractionScenePoint
  }
}

export function useRefractionExperimentPhysics({
  theta1 = 45,
  n = 1.5,
  d_mm = 50,
  pinDist = 45,
  errorOffset = 0,
  step = 0,
  method = 0,
}: UseRefractionExperimentPhysicsParams): RefractionExperimentPhysicsResult {
  return useMemo(() => {
    const rawResult = solveRefractionExperiment({
      theta1Deg: Number(theta1) || 45,
      nReal: Number(n) || 1.5,
      dMm: Number(d_mm) || 50,
      pinDistMm: Number(pinDist) || 45,
      errorOffsetMm: Number(errorOffset) || 0,
    })

    const ox = INCIDENT_POINT_DESIGN.x
    const oy = INCIDENT_POINT_DESIGN.y

    // 将物理 mm 坐标转换映射到设计坐标系
    const toDesignPos = (pt: { x: number; y: number }): RefractionScenePoint => ({
      x: ox + pt.x * PX_PER_MM,
      y: oy + pt.y * PX_PER_MM,
    })

    const pointO = { x: ox, y: oy }
    const pointOReal = toDesignPos(rawResult.pointOReal)
    const pointODrawn = toDesignPos(rawResult.pointODrawn)
    const pinP1 = toDesignPos(rawResult.pinP1)
    const pinP2 = toDesignPos(rawResult.pinP2)
    const pinP3 = toDesignPos(rawResult.pinP3)
    const pinP4 = toDesignPos(rawResult.pinP4)

    // 光线两端延伸
    const rayExtendMm = 120
    const sin1 = Math.sin(rawResult.theta1Rad)
    const cos1 = Math.cos(rawResult.theta1Rad)

    const rayInStart: RefractionScenePoint = {
      x: ox - rayExtendMm * sin1 * PX_PER_MM,
      y: oy - rayExtendMm * cos1 * PX_PER_MM,
    }

    const rayOutEnd: RefractionScenePoint = {
      x: pointOReal.x + rayExtendMm * sin1 * PX_PER_MM,
      y: pointOReal.y + rayExtendMm * cos1 * PX_PER_MM,
    }

    // 观察者视线位置 (眼睛在出射光线更远端)
    const eyePos: RefractionScenePoint = {
      x: pointOReal.x + (rayExtendMm + 40) * sin1 * PX_PER_MM,
      y: pointOReal.y + (rayExtendMm + 40) * cos1 * PX_PER_MM,
    }

    // 虚像延长线 (反向延长透过玻璃砖看到的 P1、P2 视线)
    const virtualLineStart: RefractionScenePoint = {
      x: pointOReal.x - 80 * sin1 * PX_PER_MM,
      y: pointOReal.y - 80 * cos1 * PX_PER_MM,
    }

    const currentStep = Math.min(Math.max(Number(step) || 0, 0), 4) as ExperimentStep
    const currentMethod = Math.min(Math.max(Number(method) || 0, 0), 2)

    return {
      physics: rawResult,
      step: currentStep,
      method: currentMethod,
      design: {
        pointO,
        pointOReal,
        pointODrawn,
        pinP1,
        pinP2,
        pinP3,
        pinP4,
        rayInStart,
        rayOutEnd,
        glassThicknessPx: rawResult.dMm * PX_PER_MM,
        drawnThicknessPx: rawResult.dDrawnMm * PX_PER_MM,
        eyePos,
        virtualLineStart,
      },
    }
  }, [theta1, n, d_mm, pinDist, errorOffset, step, method])
}

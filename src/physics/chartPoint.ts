/**
 * @file src/physics/chartPoint.ts
 * 物理图表采样点类型的单一真源。
 *
 * 背景：`blockBoard.ts` 与 `bulletBlock.ts` 各自声明了一份完全相同的 `VTPoint`，
 * 两份同名类型经 `@/physics` barrel 聚合时触发 TS2308（重复导出），导致
 * `bulletBlock` 长期无法从统一入口导入，只能被子文件用 `@/physics/bulletBlock` 直接引用。
 * 现在两份都改为从这里引用并转发，barrel 可安全 `export *` 这两个模块。
 */

/** 速度-时间曲线上的一个采样点 */
export interface VTPoint {
  /** 时间 (s) */
  t: number
  /** 速度 (m/s)，方向同各模型约定 */
  v: number
}

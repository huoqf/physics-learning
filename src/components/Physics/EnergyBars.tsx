import { FC } from 'react'

export interface EnergyBarItem {
  key: string
  label: string
  value: number
  /** 填充颜色，须遵守项目规范引用 ENERGY_COLORS 等 Token */
  color: string
  /** 文字高亮颜色，可选 */
  textColor?: string
}

export interface EnergyBarsProps {
  /** 动态能量柱列表，数量可调整 */
  items: EnergyBarItem[]
  /** 初始总能量参考值（绘制系统总能量虚线），可选 */
  initialEtot?: number
  /** 面板标题，默认“系统机械能实时分配 (J)” */
  title?: string
  /** 响应式字体缩放函数，可选 */
  font?: (size: number) => number
  /** 是否触发碰撞发光闪烁，可选 */
  hasCollision?: boolean
  /** 触发碰撞闪烁高亮的能量柱 key，可选 */
  collisionKey?: string
}

/**
 * 清楚美观的通用物理能量分配柱状图组件
 */
export const EnergyBars: FC<EnergyBarsProps> = ({
  items,
  initialEtot,
  title = '系统机械能实时分配 (J)',
  font,
  hasCollision = false,
  collisionKey,
}) => {
  const values = items.map((item) => item.value)
  const maxVal = Math.max(
    initialEtot ?? 1.0,
    ...values,
    1e-3
  )

  const getPercent = (val: number) => {
    return Math.min(100, Math.max(0, (val / maxVal) * 100))
  }

  const fSize = (s: number) => (font ? font(s) : s)

  return (
    <div className="flex flex-col p-2 bg-white rounded-lg border border-neutral-200/50 select-none w-full">
      {/* 头部标题与数值对齐 */}
      <div 
        className="font-bold text-neutral-700 mb-2 flex justify-between items-center px-0.5"
        style={{ fontSize: fSize(10.5) }}
      >
        <span className="tracking-wide">{title}</span>
        {initialEtot !== undefined && (
          <span className="text-neutral-400 font-medium font-mono" style={{ fontSize: fSize(9) }}>
            初始: {initialEtot.toFixed(2)} J
          </span>
        )}
      </div>

      {/* 柱形主区域：基础高度提升至 48px，使柱子更加伸展可见 */}
      <div className="relative h-14 flex items-end justify-between pt-4 px-1.5 border-b border-neutral-200/80 gap-2">
        {/* 系统总能量参考线：改用更细、更克制的淡灰线 */}
        {initialEtot !== undefined && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-neutral-300 pointer-events-none transition-all duration-300"
            style={{ bottom: `${getPercent(initialEtot)}%`, height: '1px' }}
          />
        )}

        {items.map((item) => {
          const isColliding = hasCollision && collisionKey === item.key
          const itemColor = isColliding ? '#EF4444' : item.color

          return (
            <div key={item.key} className="flex flex-col items-center flex-1 z-10 min-w-0">
              {/* 能量槽轨道 */}
              <div 
                className={`relative w-4.5 bg-transparent rounded-t-[3px] h-12 flex items-end transition-all duration-300 ${
                  isColliding 
                    ? 'border border-red-300 bg-red-50/5' 
                    : ''
                }`}
              >
                {/* 动态起伏的能量柱 */}
                <div
                  className="w-full rounded-t-[2px] transition-all duration-300 ease-out"
                  style={{
                    height: `${getPercent(item.value)}%`,
                    backgroundColor: itemColor,
                  }}
                />
                
                {/* 碰撞时的文字提示 Badge：克制素雅，不带花哨特效 */}
                {isColliding && (
                  <span 
                    className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-50 text-red-600 font-semibold px-1 py-0.5 rounded border border-red-200 shadow-sm"
                    style={{ fontSize: fSize(6.5) }}
                  >
                    损失
                  </span>
                )}
                
                {/* 柱顶数值 */}
                <span 
                  className={`absolute -top-4.5 font-semibold font-mono w-full text-center truncate px-0.5 transition-colors duration-300`}
                  style={{ 
                    fontSize: fSize(8),
                    color: isColliding ? '#EF4444' : (item.textColor || '#525252')
                  }}
                  title={item.value.toFixed(2)}
                >
                  {item.value.toFixed(2)}
                </span>
              </div>
              
              {/* 柱底物理量标签 */}
              <span 
                className={`mt-1 font-bold truncate w-full text-center transition-colors duration-300 ${
                  isColliding ? 'text-red-500 font-extrabold' : 'text-neutral-500'
                }`} 
                style={{ fontSize: fSize(8) }}
                title={item.label}
              >
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default EnergyBars

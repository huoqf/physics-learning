import type { SidebarExtraProps } from '@/data/types'

export default function ManBoatSidebar({
  params,
}: SidebarExtraProps) {
  const manBoatControl = params.manBoatControl ?? 0

  if (manBoatControl !== 1) return null

  return (
    <div className="text-xs text-pink-600 bg-pink-50 rounded p-2 border border-pink-100 mt-1 leading-relaxed">
      💡 <strong>操作提示：</strong>
      <p>请点击主画面使其获取焦点，然后使用键盘 <strong>←（左方向键）</strong> 或 <strong>→（右方向键）</strong> 即可操控小人在船上行走！</p>
    </div>
  )
}

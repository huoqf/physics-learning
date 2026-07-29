import { useState, useMemo } from 'react'
import { Trophy, Search, Filter } from 'lucide-react'
import { masterModels } from '@/data/masterModels'
import { MasterModelCard } from '@/features/master-models/components/MasterModelCard'
import { PageLayout } from '@/components/Layout'
import { colors } from '@/theme/colors'

const CATEGORY_TABS = [
  { key: 'all', label: '全部模型' },
  { key: 'mechanics', label: '力学模型' },
  { key: 'electromagnetism', label: '电磁学模型' },
  { key: 'thermodynamics', label: '热学模型' },
  { key: 'optics', label: '光学模型' },
]

export default function MasterModelsPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredModels = useMemo(() => {
    return masterModels.filter((model) => {
      const matchesCategory = activeCategory === 'all' || model.category === activeCategory
      const matchesSearch =
        model.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.frequencyBadge.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <PageLayout>
        {/* 头部：与 KnowledgePage / WrongPage 保持 100% 结构同构 */}
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-8 h-8" style={{ color: colors.accent[600] }} />
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">高考 18 大 Master 压轴模型专区</h1>
            <p className="text-neutral-600">击破一个模型，通晓一类真题 — 关联知识树、仿真动画与真题秒杀</p>
          </div>
        </div>

        {/* 筛选与搜索卡片：1:1 对齐 WrongPage 筛选区 */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* 分类 Tab */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-neutral-400 w-12">分类</span>
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white font-medium shadow-sm'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* 搜索框 */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索模型、公式、高考题型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* 模型卡片列表：网格分布 */}
        {filteredModels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModels.map((model) => (
              <MasterModelCard key={model.id} model={model} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
            <Filter className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-neutral-700 mb-1">未找到匹配的 Master 模型</h3>
            <p className="text-sm text-neutral-500">请尝试更换分类或调整搜索关键词</p>
          </div>
        )}
      </PageLayout>
    </div>
  )
}

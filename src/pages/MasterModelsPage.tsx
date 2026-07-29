import { useState, useMemo } from 'react'
import { Trophy, Search, Filter } from 'lucide-react'
import { masterModels } from '@/data/masterModels'
import { MasterModelCard } from '@/features/master-models/components/MasterModelCard'
import { PageLayout } from '@/components/Layout'

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <PageLayout maxWidth="1200px" padding={true}>
        {/* Banner 头部 */}
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-sky-950/60 rounded-3xl p-8 border border-amber-500/30 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
            <Trophy className="w-80 h-80 text-amber-400" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold mb-4">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>高考复习压轴神器</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 mb-3">
              高考 18 大 Master 压轴模型专区
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              击破一个模型，通晓一类真题！深度联动知识树与 93 个物理仿真动画，提供秒杀速算公式、高考真实参数一键载入及同源真题变式链。
            </p>
          </div>
        </div>

        {/* 筛选与搜索工具栏 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* 分类 Tab */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all shrink-0 ${
                  activeCategory === tab.key
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-bold'
                    : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索模型、公式、高考题型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>
        </div>

        {/* 模型卡片网格列表 */}
        {filteredModels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModels.map((model) => (
              <MasterModelCard key={model.id} model={model} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-12 text-center">
            <Filter className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-300 mb-1">未找到匹配的 Master 模型</h3>
            <p className="text-xs text-slate-500">请尝试更换分类或调整搜索关键词</p>
          </div>
        )}
      </PageLayout>
    </div>
  )
}

import { KnowledgeTree } from '@/features/knowledge'
import { useProgressStore } from '@/stores'
import { colors } from '@/theme/colors'
import { BookOpen } from 'lucide-react'
import { knowledgeTree } from '@/data/knowledgeTree'
import { animationRegistry } from '@/data/animationRegistry'
import { useEffect } from 'react'

export default function KnowledgePage() {
  const { getProgress, setTotalCounts } = useProgressStore()
  const { knowledgeProgress, animationProgress } = getProgress()

  useEffect(() => {
    setTotalCounts(Object.keys(animationRegistry).length, knowledgeTree.length)
  }, [setTotalCounts])

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8" style={{ color: colors.primary[600] }} />
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">知识树</h1>
              <p className="text-neutral-600">
                探索高中物理知识点，系统学习力学知识
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-2">
                知识点掌握
              </h3>
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: knowledgeProgress + '%',
                    backgroundColor: colors.primary[500]
                  }}
                />
              </div>
              <p className="text-sm text-neutral-600 mt-2">
                {knowledgeProgress.toFixed(0)}% 已掌握
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-2">
                动画学习
              </h3>
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: animationProgress + '%',
                    backgroundColor: colors.accent[500]
                  }}
                />
              </div>
              <p className="text-sm text-neutral-600 mt-2">
                {animationProgress.toFixed(0)}% 已查看
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <KnowledgeTree />
        </div>
      </div>
    </div>
  )
}

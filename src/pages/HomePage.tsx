import { useNavigate } from 'react-router-dom'
import { BookOpen, Play, BookOpenCheck, ClipboardList } from 'lucide-react'
import { useProgressStore } from '../stores'
import { knowledgeTree } from '../data/knowledgeTree'
import { animationRegistry } from '../data/animationRegistry'
import { colors } from '@/theme/colors'
import { useEffect } from 'react'

export default function HomePage() {
  const navigate = useNavigate()
  const { 
    getProgress, lastVisited, setTotalCounts, viewedAnimations, masteredKnowledge } = useProgressStore()
  const { animationProgress, knowledgeProgress } = getProgress()

  useEffect(() => {
    setTotalCounts(Object.keys(animationRegistry).length, knowledgeTree.length)
  }, [setTotalCounts])

  const quickActions = [
    {
      title: '知识树',
      description: '浏览完整物理知识点',
      icon: <BookOpen className="w-6 h-6" />,
      route: '/knowledge',
      color: colors.primary[600],
      bg: colors.primary[50],
    },
    {
      title: '继续学习',
      description: '回到上次学习的地方',
      icon: <Play className="w-6 h-6" />,
      route: lastVisited || '/knowledge',
      color: colors.accent[600],
      bg: colors.accent[50],
    },
    {
      title: '真题练习',
      description: '做题巩固知识',
      icon: <ClipboardList className="w-6 h-6" />,
      route: '/practice',
      color: colors.secondary[600],
      bg: colors.secondary[50],
    },
    {
      title: '错题本',
      description: '回顾错题温故知新',
      icon: <BookOpenCheck className="w-6 h-6" />,
      route: '/wrong',
      color: colors.danger[600],
      bg: colors.danger[100],
    },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            高中物理交互动画学习
          </h1>
          <p className="text-neutral-600">
            通过可视化动画理解抽象物理概念
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full" style={{ backgroundColor: colors.primary[100] }}>
                <BookOpen className="w-6 h-6" style={{ color: colors.primary[600] }} />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-800">学习进度</h3>
                <p className="text-sm text-neutral-500">力学模块</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">知识点掌握</span>
                  <span className="font-medium text-neutral-800">
                    {masteredKnowledge.size} / {knowledgeTree.length}
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: knowledgeProgress + '%',
                      backgroundColor: colors.primary[500],
                    }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {knowledgeProgress.toFixed(0)}%
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">动画学习</span>
                  <span className="font-medium text-neutral-800">
                    {viewedAnimations.size} / {Object.keys(animationRegistry).length}
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: animationProgress + '%',
                      backgroundColor: colors.accent[500],
                    }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {animationProgress.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
            <h3 className="font-semibold text-neutral-800 mb-4">快速开始</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.route)}
                  className="flex flex-col items-start p-4 rounded-lg text-left transition-all hover:bg-neutral-50 active:scale-[0.97]"
                  style={{ backgroundColor: action.bg }}
                >
                  <div className="mb-2">{action.icon}</div>
                  <span className="font-medium text-sm" style={{ color: action.color }}>
                    {action.title}
                  </span>
                  <span className="text-xs text-neutral-500 mt-1">
                    {action.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-800">学习提示</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-lg" style={{ backgroundColor: colors.neutral[50] }}>
              <h4 className="font-medium text-neutral-800 mb-2">📚 循序渐进</h4>
              <p className="text-neutral-600">从基础概念开始学习，逐步深入到高考难点</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: colors.neutral[50] }}>
              <h4 className="font-medium text-neutral-800 mb-2">🎯 互动体验</h4>
              <p className="text-neutral-600">通过参数调整直观理解物理现象</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: colors.neutral[50] }}>
              <h4 className="font-medium text-neutral-800 mb-2">✅ 及时复习</h4>
              <p className="text-neutral-600">通过错题本和真题巩固知识</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

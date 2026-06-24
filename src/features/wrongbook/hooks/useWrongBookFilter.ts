import { useState, useMemo } from 'react'
import { useWrongStore, type WrongRecord, type WrongStatus } from '@/stores'
import { getProblemById } from '@/data/problems'
import { moduleOf } from '@/utils/moduleHelpers'

export type SortKey = 'recent' | 'errors' | 'difficulty'

export function useWrongBookFilter() {
  const records = useWrongStore((s) => s.records)

  const [moduleFilter, setModuleFilter] = useState<Set<string>>(new Set())
  const [difficultyFilter, setDifficultyFilter] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<Set<WrongStatus>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [showMastered, setShowMastered] = useState(false)

  const stats = useMemo(() => {
    const total = records.length
    const notMastered = records.filter((r) => r.status !== 'mastered').length
    const now = Date.now()
    const newThisWeek = records.filter((r) => now - r.createdAt <= 7 * 24 * 60 * 60 * 1000).length
    const masteredThisWeek = records.filter(
      (r) => r.status === 'mastered' && r.masteredAt && now - r.masteredAt <= 7 * 24 * 60 * 60 * 1000
    ).length
    return { total, notMastered, newThisWeek, masteredThisWeek }
  }, [records])

  const filtered = useMemo(() => {
    let list = records.filter((r) => {
      if (moduleFilter.size > 0 && !moduleFilter.has(moduleOf(r.knowledgeIds))) return false
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false
      if (difficultyFilter.size > 0) {
        const d = getProblemById(r.problemId)?.difficulty
        if (d === undefined || !difficultyFilter.has(d)) return false
      }
      return true
    })
    const diffOf = (r: WrongRecord) => getProblemById(r.problemId)?.difficulty ?? 0
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'errors': return b.errorCount - a.errorCount
        case 'difficulty': return diffOf(b) - diffOf(a)
        case 'recent': default: return b.lastAttemptTime - a.lastAttemptTime
      }
    })
    return list
  }, [records, moduleFilter, difficultyFilter, statusFilter, sortKey])

  const activeRecords = filtered.filter((r) => r.status !== 'mastered')
  const masteredRecords = filtered.filter((r) => r.status === 'mastered')

  return {
    records,
    moduleFilter, setModuleFilter,
    difficultyFilter, setDifficultyFilter,
    statusFilter, setStatusFilter,
    sortKey, setSortKey,
    showMastered, setShowMastered,
    stats, filtered, activeRecords, masteredRecords,
  }
}
import { useState, useMemo } from 'react'
import { useWrongStore, type WrongRecord, type WrongStatus } from '@/stores'
import { getProblemById } from '@/data/problems'
import { moduleOf } from '@/utils/moduleHelpers'
import type { WrongReasonId } from '@/data/wrongReasons'

export type SortKey = 'recent' | 'errors' | 'difficulty'

/** 「未归因」伪错因：让没打标的老记录也能被单独筛出来 */
export const UNATTRIBUTED_REASON = 'unattributed'
export type ReasonFilterKey = WrongReasonId | typeof UNATTRIBUTED_REASON

/**
 * 按「数据里真的出现过」裁剪可选 chip 集合，但**已选中的 key 一律保留**。
 *
 * 为什么必须有这一步：错因、模块这两排 chip 都是从 `records` 现算出来的。若筛选器里
 * 还压着一个 key，而带这个 key 的最后一条记录刚被删掉，chip 就会凭空消失——可选中态
 * 依然生效，列表恒空，学生也找不到那个胶囊来取消。页面里再给一个「清除全部筛选」是
 * 兜底，这里是根因：**可见性与选中态必须同源**。
 *
 * @param all       全部候选（如 `WRONG_REASONS`、`MODULE_LABELS` 的键）
 * @param isPresent 该候选当前是否在数据里真的出现
 * @param selected  当前已选中的 key 集合
 * @param keyOf     从候选项取出用于比对选中态的 key
 * 返回值保持 `all` 的声明顺序，避免选中项被挪到末尾造成 chip 位置跳动。
 */
export function filterKeepingSelected<T, K>(
  all: readonly T[],
  isPresent: (item: T) => boolean,
  selected: ReadonlySet<K>,
  keyOf: (item: T) => K,
): T[] {
  return all.filter((item) => selected.has(keyOf(item)) || isPresent(item))
}

export function useWrongBookFilter() {
  const records = useWrongStore((s) => s.records)

  const [moduleFilter, setModuleFilter] = useState<Set<string>>(new Set())
  const [difficultyFilter, setDifficultyFilter] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<Set<WrongStatus>>(new Set())
  const [reasonFilter, setReasonFilter] = useState<Set<ReasonFilterKey>>(new Set())
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
      if (reasonFilter.size > 0) {
        const reasons = r.reasons ?? []
        const hit = reasons.length === 0
          ? reasonFilter.has(UNATTRIBUTED_REASON)
          : reasons.some((id) => reasonFilter.has(id))
        if (!hit) return false
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
  }, [records, moduleFilter, difficultyFilter, statusFilter, reasonFilter, sortKey])

  const activeRecords = filtered.filter((r) => r.status !== 'mastered')
  const masteredRecords = filtered.filter((r) => r.status === 'mastered')

  return {
    records,
    moduleFilter, setModuleFilter,
    difficultyFilter, setDifficultyFilter,
    statusFilter, setStatusFilter,
    reasonFilter, setReasonFilter,
    sortKey, setSortKey,
    showMastered, setShowMastered,
    stats, filtered, activeRecords, masteredRecords,
  }
}
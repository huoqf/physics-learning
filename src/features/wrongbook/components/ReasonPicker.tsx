import { useState } from 'react'
import { X } from 'lucide-react'
import { WRONG_REASONS, type WrongReasonId } from '@/data/wrongReasons'

interface ReasonPickerProps {
  selected: readonly WrongReasonId[]
  onChange: (next: WrongReasonId[]) => void
}

/**
 * 错因胶囊多选组（受控）。
 *
 * 刻意用多选而不是「6 选 1」：一道大题同时踩中「漏判摩擦力突变」和「矢量正负号」
 * 是常态，强制单选会逼学生丢掉一半真实信息，反而降低诊断价值。
 */
export function ReasonPicker({ selected, onChange }: ReasonPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {WRONG_REASONS.map((reason) => {
        const active = selected.includes(reason.id)
        return (
          <button
            key={reason.id}
            type="button"
            aria-pressed={active}
            title={reason.behavior}
            onClick={() =>
              onChange(
                active
                  ? selected.filter((id) => id !== reason.id)
                  : [...selected, reason.id],
              )
            }
            className={`px-3 py-1.5 rounded-full text-sm transition-colors active:scale-[0.97] ${
              active
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {reason.label}
          </button>
        )
      })}
    </div>
  )
}

interface ReasonPickerModalProps {
  /** 标题右侧的问题摘要，帮助学生确认自己在给哪道题归因 */
  problemTitle?: string
  initial: readonly WrongReasonId[]
  onSave: (next: WrongReasonId[]) => void
  onClose: () => void
}

/**
 * 错因归因弹窗。草稿态在弹窗内部，只有「保存」才写回 store，
 * 避免学生点错一下就改了归因却无法反悔。
 */
export function ReasonPickerModal({ problemTitle, initial, onSave, onClose }: ReasonPickerModalProps) {
  const [draft, setDraft] = useState<WrongReasonId[]>([...initial])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-neutral-800">这道题错在哪一步？</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600" aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-4 line-clamp-2">
          {problemTitle ?? '选择导致失分的认知缺陷（可多选），错题本会按错因聚合你的薄弱点。'}
        </p>

        <ReasonPicker selected={draft} onChange={setDraft} />

        <p className="mt-3 text-xs text-neutral-400">
          已选 {draft.length} 个 · 不确定就留空，比乱勾更有价值
        </p>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 active:scale-[0.97]"
          >
            取消
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.97]"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

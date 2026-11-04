import React from 'react'
import { InlineMath } from '@/components/Formula'

/**
 * @deprecated 已统一到 `@/components/Formula` 的 `InlineMath`。
 *
 * 保留这个薄壳有两个原因：① 分析页 5 处调用点用的是 `content` 这个 prop 名，
 * 换成 `text` 要动 5 个文件、且与 `FormattedProblemContent` 的语义无益；
 * ② 分段渲染逻辑只能有一份实现，避免两处各改一半。
 */
export const ContentWithKatex = React.memo(function ContentWithKatex({ content }: { content: string }) {
  return <InlineMath text={content} />
})

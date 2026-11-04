import React from 'react'
import { KatexFormula } from './KatexFormula'

interface InlineMathProps {
  /** 待渲染文本：普通文字 + `$...$` 内联公式 + `$$...$$` 独段公式混排 */
  text: string
  className?: string
}

/**
 * 无 `$` 的字符串，是否整段就是一条公式？
 *
 * 判据分两级，顺序不能换：
 * 1. **出现 TeX 命令**（`\lambda`、`\frac`、`\text{共}`）⇒ 是公式。
 *    这一条**不看有没有汉字**——`masterModels` 里的结论式就长这样：
 *    `t_{\text{共}} = \frac{v_0}{a_1 + a_2}`，带汉字但确是公式；
 * 2. 只有 `_ ^ { }` 这类「像公式的符号」时，**必须没有汉字才算**——
 *    否则「说明 `{注}` 的含义」「变量 current_velocity」这类自然语言会被整句
 *    丢进 KaTeX，中文排版全乱（KaTeX 只认数学模式，汉字会退化成字体回退文本）。
 */
function looksLikeWholeFormula(text: string): boolean {
  if (/\\[a-zA-Z]+/.test(text)) return true
  if (/[\u4e00-\u9fff]/.test(text)) return false
  return /[_^{}]/.test(text)
}

/**
 * 内联公式文本渲染器 —— 把「中文叙述里夹着 `$...$`」的字符串分段渲染。
 *
 * 为什么需要它：项目里大量教学文案（分析页解析、方法论卡片、考点横幅）天然是
 * 「一句话 + 几个符号」，写死在 TSX 里只能是纯文本，`$F_x$` 会连美元符号一起显示。
 * 这个组件按 `$` 把字符串切开，公式段交给 KaTeX，文字段原样输出。
 *
 * 三条约定：
 * 1. **只在含 `$` 时切分**。不含 `$` 的文本默认原样输出，不会因为出现 `x^2` 之类
 *    的写法被误判成公式 —— 唯一的例外是整段本身就是 LaTeX（见 `looksLikeWholeFormula`：
 *    有 `\cmd` 算公式，光有 `_ ^ { }` 还必须没有汉字才算）。
 * 2. **美元符号必须成对**。落单的 `$`（价格、占位符）切不开，会原样保留。
 * 3. **KaTeX 自身不抛错**（`throwOnError: false`），公式写错时退化为源码文本，
 *    所以数据侧的公式仍需靠单测/审计脚本兜住，不能指望这里报错。
 *
 * 根节点恒为 `<span>`、独段公式也用 `<span class="block">` —— 见组件内注释，
 * 原因是调用方会把它放进 `<p>`，块级元素会强制闭合段落。
 *
 * ⚠️ 教学提示卡（`TipCard`）**不走这里**：`ControlPanel` 挂在 `@/components/UI`
 * barrel 下、被 app shell 静态引用，一旦它 import 本组件，`katex.min.css` 的副作用
 * 会把 KaTeX 拖进首屏 entry chunk（见 `components/Formula/index.ts` 的注释）。
 * 提示卡是纯文本面，数据侧不写 `$`（由 `check-control-meta` 守卫）。
 */
export const InlineMath = React.memo(function InlineMath({ text, className }: InlineMathProps) {
  if (!text) return null

  if (!text.includes('$')) {
    if (looksLikeWholeFormula(text)) {
      return <KatexFormula formula={text} mode="inline" as="span" className={className} />
    }
    return <span className={className}>{text}</span>
  }

  const segments = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)
  return (
    <span className={className}>
      {segments.map((seg, i) => {
        // 独段公式也渲染成 **span**（再加 `block` 让它独占一行）：
        // 调用方可能把整段放进 `<p>`（如 `FormattedProblemContent` 的段落），
        // `<p><div>` 会让浏览器提前闭合 `<p>`，把后面的内容挤出去。
        // KaTeX 自己的 display 模式输出的就是 `span.katex-display` + display:block，
        // 所以「块级表现 + 行内元素」是它本来的约定。
        if (seg.startsWith('$$') && seg.endsWith('$$') && seg.length > 4) {
          return (
            <KatexFormula
              key={i}
              formula={seg.slice(2, -2).trim()}
              mode="block"
              as="span"
              className="block"
            />
          )
        }
        if (seg.startsWith('$') && seg.endsWith('$') && seg.length > 2) {
          return <KatexFormula key={i} formula={seg.slice(1, -1).trim()} mode="inline" as="span" />
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {seg}
          </span>
        )
      })}
    </span>
  )
})

import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InlineMath } from '../InlineMath'

/**
 * 契约：`$...$` 分段交给 KaTeX，其余原样输出；落单的 `$` 不得吞掉后面的文字。
 *
 * 这个组件的失败模式很隐蔽 —— `katex.render` 用 `throwOnError: false`，
 * 写错的公式不会抛错，只会静默退化成源码文本，页面看上去"只是没渲染"。
 * 所以这里断言的是**渲染结果**（`.katex` / 可见文字），而不是"没报错"。
 */
describe('InlineMath 内联公式分段', () => {
  it('无 $ 的纯中文原样输出', () => {
    const { container } = render(<InlineMath text="波速等于波长乘频率" />)
    expect(container.textContent).toBe('波速等于波长乘频率')
    expect(container.querySelector('.katex')).toBeNull()
  })

  it('$...$ 段渲染成 KaTeX，文字段保持原文', async () => {
    const { container } = render(<InlineMath text={'波速 $v=\\lambda f$，调节 v 观察'} />)
    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull())
    expect(container.textContent).toContain('波速')
    expect(container.textContent).toContain('调节 v 观察')
    // 美元符号不该残留；反斜杠命令只允许出现在 MathML 的 <annotation>（TeX 原文）里，
    // 可见层 .katex-html 必须是渲染后的字形
    expect(container.textContent).not.toContain('$')
    const visual = container.querySelector('.katex-html')?.textContent ?? ''
    expect(visual).not.toContain('\\lambda')
    expect(visual).toContain('λ')
    // KaTeX 的 TeX 原文注解可用于确认这条公式确实被解析了
    expect(container.querySelector('annotation')?.textContent).toBe('v=\\lambda f')
  })

  it('一段文字里多个公式各自渲染', async () => {
    const { container } = render(<InlineMath text={'大小为 $F$、夹角 $\\theta$ 的共点力'} />)
    await waitFor(() => expect(container.querySelectorAll('.katex').length).toBe(2))
    expect(container.textContent).not.toContain('$')
  })

  it('落单的 $ 不切分（价格、占位符不会被当成公式）', () => {
    const { container } = render(<InlineMath text="单价 $5，共 3 件" />)
    expect(container.querySelector('.katex')).toBeNull()
    expect(container.textContent).toBe('单价 $5，共 3 件')
  })

  it('空文本渲染为空，不挂空 KaTeX 节点', () => {
    const { container } = render(<InlineMath text="" />)
    expect(container.innerHTML).toBe('')
  })

  it('行内公式渲染成 span，便于嵌进 <p>（不产生 p > div 非法嵌套）', async () => {
    const { container } = render(<InlineMath text={'$v=\\lambda f$'} />)
    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull())
    expect(container.querySelector('span.katex')).not.toBeNull()
    expect(container.querySelector('div.katex')).toBeNull()
  })

  it('$$ 独段公式也是 span（display:block），整棵子树不含 div', async () => {
    const { container } = render(<InlineMath text={'结论：$$v=\\lambda f$$以上'} />)
    await waitFor(() => expect(container.querySelector('.katex-display')).not.toBeNull())
    expect(container.querySelectorAll('div')).toHaveLength(0)
    expect(container.textContent).not.toContain('$')
  })

  it('className 透传到整段公式分支（否则外部样式失效）', async () => {
    const { container } = render(<InlineMath text={'v=\\lambda f'} className="text-xs text-neutral-500" />)
    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull())
    const node = container.querySelector('.katex')?.parentElement
    expect(node?.className).toContain('text-xs')
    expect(node?.className).toContain('text-neutral-500')
  })

  it('含汉字的文本即使有 { } _ 也不当公式（避免整句进数学模式）', () => {
    const { container } = render(<InlineMath text="说明 {注} 的含义与 x_1 的写法" />)
    expect(container.querySelector('.katex')).toBeNull()
    expect(container.textContent).toBe('说明 {注} 的含义与 x_1 的写法')
  })

  it('带汉字的整段公式仍按公式渲染（\\text{共} 这类）', async () => {
    const { container } = render(<InlineMath text={'v_{\\text{共}} = \\frac{v_0}{a_1 + a_2}'} />)
    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull())
    expect(container.querySelector('.katex-html')?.textContent).toContain('共')
  })
})

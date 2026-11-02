/**
 * check-single-source.mjs 的解析层单测。
 *
 * 为什么单独立一份：这个守卫是全仓唯一能判定「物理事实是否被算了两遍」的机制，
 * 而它的判定完全建立在 import 说明符解析上。2026-11 之前它只匹配 `from '@/physics'`，
 * 于是 38 个用相对路径复用的构建器被反向判成「未复用」，报出「复用率 39%、70 个真风险」
 * 的相反结论 —— 因为当时没有任何测试保护，缺陷一直没人发现。
 *
 * 这里用磁盘 fixture（真文件、真目录）验证四类场景：
 *   ① 别名导入（`@/physics`、`@/physics/constants`）
 *   ② 相对路径导入（`../../physics`、`../../../physics/sub/file`）
 *   ③ 注释过滤（单行/块注释里的 import 必须不算数）
 *   ④ 间接依赖穿透与深度上限（Scene → hook → model → physics）
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import {
  importSpecs,
  importsPhysics,
  isPhysicsSpec,
  resolveModule,
  resolveSpecifier,
  stripComments,
  touchesPhysics,
  TOUCH_DEPTH,
} from '../../scripts/check-single-source.mjs'

/** 被测函数统一返回 posix 分隔符的绝对路径，断言也用 posix 形式比较 */
const px = (abs: string) => abs.split(sep).join('/')

let root: string

/** 在 fixture 根下写一个文件（自动建目录） */
function w(relPath: string, content = ''): string {
  const abs = join(root, relPath)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
  return abs
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'single-source-'))

  // 物理层与主题层的目标文件（解析成不存在的路径也能判定，但 existsSync 路径要真实）
  w('src/physics/index.ts')
  w('src/physics/constants.ts')
  w('src/physics/dynamics/index.ts')
  w('src/theme/index.ts')

  // ① 别名
  w('src/features/alias/Direct.tsx', "import { GRAVITY } from '@/physics/constants'\n")
  w('src/features/alias/Barrel.ts', "import { f } from '@/physics'\n")
  w('src/features/alias/Dynamic.tsx', "const m = () => import('@/physics/dynamics')\n")
  w('src/features/alias/Clean.ts', "import { colors } from '@/theme'\n")
  // ③ 只有注释里的 import
  w(
    'src/features/alias/CommentedOnly.ts',
    [
      "// import { g } from '@/physics'",
      "/* import { f } from '@/physics/dynamics' */",
      "import { colors } from '@/theme'",
      '',
    ].join('\n'),
  )
  // 单行注释里出现 `http://`，不能被 stripComments 当成注释起点
  w('src/features/alias/UrlLiteral.ts', "export const u = 'http://example.com/a'\n")

  // ② 相对路径
  w('src/features/rel/model.ts', "import { GRAVITY } from '../../physics/constants'\n")
  w('src/features/rel/deep/file.ts', "import { f } from '../../../physics/dynamics'\n")
  w('src/features/rel/far/file.ts', "import { f } from '../../../../physics'\n")
  w('src/features/rel/off-topic.ts', "import { colors } from '../../theme'\n")

  // ④ 链式穿透：Scene → hook → model → @/physics
  w('src/features/chain/Scene.tsx', "import { useThing } from './hook'\n")
  w('src/features/chain/hook.ts', "import { build } from './model'\n")
  w('src/features/chain/model.ts', "import { f } from '@/physics'\n")

  // ④ 超过深度上限：Deep1 → Deep2 → … → Deep6 → physics
  for (let i = 1; i <= 5; i += 1) {
    w(`src/features/deep/Deep${i}.ts`, `import { f } from './Deep${i + 1}'\n`)
  }
  w('src/features/deep/Deep6.ts', "import { f } from '@/physics'\n")

  // 循环 import 不得死循环
  w('src/features/cycle/A.ts', "import { b } from './B'\n")
  w('src/features/cycle/B.ts', "import { a } from './A'\n")

  // 分支：第一个 import 不碰物理层，第二个才碰
  w('src/features/branch/Scene.tsx', "import { c } from '@/theme'\nimport { f } from '@/physics'\n")
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('stripComments', () => {
  it('删除单行注释', () => {
    expect(stripComments("const a = 1 // from '@/physics'")).not.toContain('@/physics')
  })

  it('删除多行块注释', () => {
    const code = "/*\n * import { f } from '@/physics'\n */\nconst a = 1"
    expect(stripComments(code)).not.toContain('@/physics')
    expect(stripComments(code)).toContain('const a = 1')
  })

  it('不把 URL 里的 `//` 当注释（保留 http:// 之后的内容）', () => {
    expect(stripComments("const u = 'http://example.com/a'")).toContain('example.com/a')
  })

  it('注释外的代码原样保留', () => {
    expect(stripComments("import { a } from '@/physics'")).toBe(
      "import { a } from '@/physics'",
    )
  })
})

describe('importSpecs', () => {
  it('取出静态 import / export-from / 动态 import() 的说明符', () => {
    const code = [
      "import { a } from '@/physics'",
      "export { b } from './b'",
      "const m = () => import('@/physics/dynamics')",
    ].join('\n')
    expect(importSpecs(code)).toEqual(['@/physics', './b', '@/physics/dynamics'])
  })

  it('说明符原样返回（不做 @/ 解析，解析是 resolveSpecifier 的职责）', () => {
    expect(importSpecs("import x from '@/physics/constants'\n")).toEqual(['@/physics/constants'])
  })

  it('没有 import 时返回空数组', () => {
    expect(importSpecs('const a = 1\n')).toEqual([])
  })
})

describe('resolveSpecifier', () => {
  const from = () => join(root, 'src/features/alias/Direct.tsx')

  it('别名 @/physics → <root>/src/physics', () => {
    expect(resolveSpecifier('@/physics', from(), root)).toBe(px(join(root, 'src/physics')))
  })

  it('别名 @/physics/constants → <root>/src/physics/constants', () => {
    expect(resolveSpecifier('@/physics/constants', from(), root)).toBe(px(join(root, 'src/physics/constants')))
  })

  it('相对路径 ../.. 按发起文件所在目录解析', () => {
    const f = join(root, 'src/features/rel/model.ts')
    expect(resolveSpecifier('../../physics/constants', f, root)).toBe(px(join(root, 'src/physics/constants')))
  })

  it('相对路径 ../../.. 按发起文件所在目录解析', () => {
    const f = join(root, 'src/features/rel/deep/file.ts')
    expect(resolveSpecifier('../../../physics/dynamics', f, root)).toBe(px(join(root, 'src/physics/dynamics')))
  })

  it('显式带 .ts 扩展名时去掉扩展名', () => {
    const f = join(root, 'src/features/rel/model.ts')
    expect(resolveSpecifier('../../physics/index.ts', f, root)).toBe(
      px(join(root, 'src/physics/index')),
    )
  })

  it('裸包名返回 null', () => {
    expect(resolveSpecifier('react', from(), root)).toBeNull()
    expect(resolveSpecifier('node:fs', from(), root)).toBeNull()
  })
})

describe('isPhysicsSpec', () => {
  const from = () => join(root, 'src/features/alias/Direct.tsx')

  it('物理层根与子模块都算', () => {
    expect(isPhysicsSpec('@/physics', from(), root)).toBe(true)
    expect(isPhysicsSpec('@/physics/dynamics', from(), root)).toBe(true)
    expect(isPhysicsSpec('@/physics/constants', from(), root)).toBe(true)
  })

  it('前缀相同但不是子路径的不算', () => {
    expect(isPhysicsSpec('@/physicsLab', from(), root)).toBe(false)
  })

  it('其他层不算', () => {
    expect(isPhysicsSpec('@/theme', from(), root)).toBe(false)
    expect(isPhysicsSpec('react', from(), root)).toBe(false)
  })

  it('相对路径写法同样能判定', () => {
    expect(
      isPhysicsSpec('../../physics', join(root, 'src/features/rel/model.ts'), root),
    ).toBe(true)
    expect(
      isPhysicsSpec('../../theme', join(root, 'src/features/rel/off-topic.ts'), root),
    ).toBe(false)
  })
})

describe('importsPhysics', () => {
  it('别名直接 import 物理层 → true', () => {
    expect(importsPhysics(join(root, 'src/features/alias/Direct.tsx'), root)).toBe(true)
    expect(importsPhysics(join(root, 'src/features/alias/Barrel.ts'), root)).toBe(true)
    expect(importsPhysics(join(root, 'src/features/alias/Dynamic.tsx'), root)).toBe(true)
  })

  it('相对路径 import 物理层 → true', () => {
    expect(importsPhysics(join(root, 'src/features/rel/model.ts'), root)).toBe(true)
    expect(importsPhysics(join(root, 'src/features/rel/deep/file.ts'), root)).toBe(true)
  })

  it('只 import 其他层 → false', () => {
    expect(importsPhysics(join(root, 'src/features/alias/Clean.ts'), root)).toBe(false)
  })

  it('★ 被注释掉的 import 不算数（防止整段注掉物理实现后仍判合规）', () => {
    expect(importsPhysics(join(root, 'src/features/alias/CommentedOnly.ts'), root)).toBe(false)
  })

  it('文件里出现 http:// 字面量不影响判定', () => {
    expect(importsPhysics(join(root, 'src/features/alias/UrlLiteral.ts'), root)).toBe(false)
  })
})

describe('touchesPhysics', () => {
  it('多层穿透：Scene → hook → model → @/physics → true', () => {
    expect(touchesPhysics(join(root, 'src/features/chain/Scene.tsx'), root)).toBe(true)
  })

  it('第二个 import 才碰物理层也能抓到', () => {
    expect(touchesPhysics(join(root, 'src/features/branch/Scene.tsx'), root)).toBe(true)
  })

  it('完全不碰物理层的链路 → false', () => {
    expect(touchesPhysics(join(root, 'src/features/rel/off-topic.ts'), root)).toBe(false)
  })

  it(`★ 超过 ${TOUCH_DEPTH} 层不再下钻（防止误报，也防止深链拖慢全仓扫描）`, () => {
    expect(touchesPhysics(join(root, 'src/features/deep/Deep1.ts'), root)).toBe(false)
  })

  it('循环 import 不死循环', () => {
    expect(touchesPhysics(join(root, 'src/features/cycle/A.ts'), root)).toBe(false)
  })
})

describe('resolveModule', () => {
  it('解析到真实存在的 .ts 文件', () => {
    const from = join(root, 'src/features/alias/Barrel.ts')
    expect(resolveModule('@/physics/constants', from, root)).toBe(px(join(root, 'src/physics/constants.ts')))
  })

  it('解析到目录下的 index.ts', () => {
    const from = join(root, 'src/features/alias/Barrel.ts')
    expect(resolveModule('@/physics/dynamics', from, root)).toBe(px(join(root, 'src/physics/dynamics/index.ts')))
  })

  it('解析不到时返回 null', () => {
    const from = join(root, 'src/features/alias/Barrel.ts')
    expect(resolveModule('@/physics/not-exist', from, root)).toBeNull()
    expect(resolveModule('react', from, root)).toBeNull()
  })
})

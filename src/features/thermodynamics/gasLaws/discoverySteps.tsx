import { Question, ScratchMask } from './DiscoveryStepComponents'

// ─── 发现模式步骤定义 ──────────────────────────────────────────────────────────
const steps = [
  {
    title: '玻意耳定律 (等温变化) 探究',
    description: '控制温度 T 恒定。请在左侧面板调节体积 V (例如减小体积)，观察气缸内粒子的撞击频率变化及压强 P 的响应，想一想为什么体积减小时压强会增大？',
    hint: '微观上：温度不变，分子的平均动能不变，但体积减小导致分子数密度增大，使单位时间撞击器壁的分子数增多，从而宏观压强增大。',
    content: (
      <Question
        questionText="一定质量的理想气体发生等温压缩时，下列关于压强增大的微观原因解释正确的是："
        options={[
          { key: 'A', text: '气体分子的平均动能增大' },
          { key: 'B', text: '分子的碰撞频率不变，每个分子对器壁的撞击力变大' },
          { key: 'C', text: '每个分子撞击器壁的平均冲力不变，但分子的数密度增大，单位时间内撞击器壁的次数增多' },
          { key: 'D', text: '气体分子在单位时间内与器壁发生碰撞的总次数减少' },
        ]}
        correctAnswer="C"
        explanation="温度不变说明分子的平均动能不变，故每个分子撞击器壁的平均冲力不变（排除 A、B）。体积变小说明分子的数密度（单位体积内的分子数）增大，因此单位时间内分子撞击单位面积器壁的频数增多，从而导致宏观上气体的压强增大（选 C）。"
      />
    ),
  },
  {
    title: '盖-吕萨克定律 (等压变化) 探究',
    description: '控制压强 P 恒定。请调节温度 T (例如升高温度)，观察活塞位置 (体积 V) 的膨胀过程。为什么温度升高，气体体积必须增大才能维持压强恒定？',
    hint: '温度升高使分子运动变快，每次撞击壁面力矩变大。要使压强（单位面积碰撞总力）不变，气体必须膨胀使分子数密度降低，以此减少撞击频数。',
    content: (
      <Question
        questionText="一定质量的理想气体发生等压膨胀时，随着温度的升高，气体分子撞击器壁的平均冲力变大，为了维持压强不变，则："
        options={[
          { key: 'A', text: '气体分子的平均动能应当减小' },
          { key: 'B', text: '单位体积内的分子数（数密度）应该减少，从而降低撞击频率' },
          { key: 'C', text: '气体分子与器壁碰撞的频数应当保持恒定' },
          { key: 'D', text: '气体分子的总数应当减少' },
        ]}
        correctAnswer="B"
        explanation="温度升高，气体分子的平均动能变大，每个分子撞击器壁的平均冲力变大。为了让压强（单位时间单位面积撞击的总冲力）保持恒定，必须通过增大体积以降低分子的数密度（单位体积内分子数），使单位时间碰撞器壁的次数变少。这两种效应互相抵消，从而维持压强不变。故选 B。"
      />
    ),
  },
  {
    title: '查理定律 (等容变化) 探究',
    description: '控制体积 V 恒定。请调节温度 T (例如升高温度)，观察压强 P 读数。温度从 27℃ 升高到 127℃，压强会如何变化？',
    hint: '切记：公式中 T 必须使用热力学温度 (开尔文 K)。换算公式为 T(K) = t(℃) + 273.15。不能直接拿摄氏度进行比值计算！',
    content: (
      <Question
        questionText="一定质量的理想气体发生等容变化。若气体的温度从 27℃ 升高到 127℃，其压强变为原来的："
        options={[
          { key: 'A', text: '127/27 倍' },
          { key: 'B', text: '3/4 倍' },
          { key: 'C', text: '4/3 倍' },
          { key: 'D', text: '27/127 倍' },
        ]}
        correctAnswer="C"
        explanation="气体状态公式中的温度必须换算为热力学温度 T。初态 T1 = 27 + 273 = 300 K，末态 T2 = 127 + 273 = 400 K。根据等容变化的查理定律，P1 / T1 = P2 / T2，所以末态压强 P2 / P1 = T2 / T1 = 400 / 300 = 4/3 倍。故选 C。一定要注意，若直接用摄氏度计算（127/27）在高中物理中是典型易错点。"
      />
    ),
  },
  {
    title: '气体实验三定律公式默记',
    description: '恭喜你完成了三定律的探究与练习。现在我们来强化核心公式的记忆。请在脑海中默背，点击下方卡片中的灰色“?”遮罩可刮开核对答案。',
    content: (
      <div className="grid gap-3 mt-3">
        {/* 卡片 1: 玻意耳定律 */}
        <div className="p-3 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-neutral-800 mb-1.5 flex items-center justify-between">
            <span>玻意耳定律 (等温过程)</span>
            <span className="text-[10px] text-neutral-400 font-medium font-mono">Constant T</span>
          </div>
          <div className="grid gap-2 border-t border-neutral-100 pt-2 text-xs">
            <div>
              <span className="text-neutral-500">适用条件：</span>
              <span>一定质量的理想气体，且</span>
              <ScratchMask answer="温度 T" />
              <span>保持恒定。</span>
            </div>
            <div>
              <span className="text-neutral-500">核心公式：</span>
              <span className="font-mono">
                <ScratchMask answer="PV = C" />
                <span>或</span>
                <ScratchMask answer="P1 V1 = P2 V2" />
              </span>
            </div>
            <div>
              <span className="text-neutral-500">宏观关系：</span>
              <span>压强 P 与体积 V 成</span>
              <ScratchMask answer="反比" />
              <span>。</span>
            </div>
          </div>
        </div>

        {/* 卡片 2: 查理定律 */}
        <div className="p-3 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-neutral-800 mb-1.5 flex items-center justify-between">
            <span>查理定律 (等容过程)</span>
            <span className="text-[10px] text-neutral-400 font-medium font-mono">Constant V</span>
          </div>
          <div className="grid gap-2 border-t border-neutral-100 pt-2 text-xs">
            <div>
              <span className="text-neutral-500">适用条件：</span>
              <span>一定质量的理想气体，且</span>
              <ScratchMask answer="体积 V" />
              <span>保持恒定。</span>
            </div>
            <div>
              <span className="text-neutral-500">核心公式：</span>
              <span className="font-mono">
                <ScratchMask answer="P/T = C" />
                <span>或</span>
                <ScratchMask answer="P1/T1 = P2/T2" />
              </span>
            </div>
            <div>
              <span className="text-neutral-500">宏观关系：</span>
              <span>压强 P 与热力学温度 T 成</span>
              <ScratchMask answer="正比" />
              <span>。</span>
            </div>
          </div>
        </div>

        {/* 卡片 3: 盖-吕萨克定律 */}
        <div className="p-3 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-neutral-800 mb-1.5 flex items-center justify-between">
            <span>盖-吕萨克定律 (等压过程)</span>
            <span className="text-[10px] text-neutral-400 font-medium font-mono">Constant P</span>
          </div>
          <div className="grid gap-2 border-t border-neutral-100 pt-2 text-xs">
            <div>
              <span className="text-neutral-500">适用条件：</span>
              <span>一定质量 of 理想气体，且</span>
              <ScratchMask answer="压强 P" />
              <span>保持恒定。</span>
            </div>
            <div>
              <span className="text-neutral-500">核心公式：</span>
              <span className="font-mono">
                <ScratchMask answer="V/T = C" />
                <span>或</span>
                <ScratchMask answer="V1/T1 = V2/T2" />
              </span>
            </div>
            <div>
              <span className="text-neutral-500">宏观关系：</span>
              <span>体积 V 与热力学温度 T 成</span>
              <ScratchMask answer="正比" />
              <span>。</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
]

export default steps

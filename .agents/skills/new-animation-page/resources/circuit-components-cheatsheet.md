# 电学实验与电路图标准组件速查表 (Circuit Components Cheatsheet)

> **按需调用原则**：当任务涉及直流电路、电学实验（测电动势内阻、伏安法测电阻、电表改装、多用电表等）时加载本指南。

---

## ⚡ 核心物理原则（高中物理严谨性）

1. **电流是标量**：
   - 严禁在导线上绘制“速度/力矢量箭头”（`PhysicsVectorArrow`），严禁使用带箭头标注的流动电荷粒子。
   - 标注方向仅可用小型文字或简单三角形指引标记（如 `I →`），不得误导为矢量。
2. **开关具有物理真实通断响应**：
   - 开关断开（Open）：回路电流为 0，串联电流表读数为 0，电压表若并联在电源两端则测得路端开路电压（接近电动势 $E$）。
   - 开关接通（Closed）：闭合电路欧姆定律生效。
3. **真实拓扑连接（严禁伪造）**：
   - 严禁“一条通线贯穿到底 + 元件背后垫白色小矩形遮挡”的伪接法。
   - 必须基于“端子到端子（Terminal-to-Terminal）”进行分段直角走线；T 型并联节点必须明确标注实心连接点（`r = 3.5`）。

---

## 🔌 核心电学组件调用规约（严格对齐底层 Props）

所有电学实验原理图必须复用 `@/components/Physics`，并统一声明 `variant="symbolic"`。

### 1. 电表组件 (`DialMeter`)

```tsx
import { DialMeter } from '@/components/Physics'

// 电流表 (A)
<DialMeter
  type="A"
  variant="symbolic"
  value={physics.current}
  x={pos.am.x}
  y={pos.am.y}
  r={28}
  font={font}
/>

// 电压表 (V)
<DialMeter
  type="V"
  variant="symbolic"
  value={physics.terminalVoltage}
  x={pos.vm.x}
  y={pos.vm.y}
  r={28}
  font={font}
/>
```
- **真实入参**：
  - `type`: `'V' | 'A'`
  - `x`, `y`: 表盘中心点坐标
  - `r`: 表盘外圈半径（默认 28）
  - `value`: 当前读数值
  - `variant`: `'symbolic'`
  - `labelPosition`: `'bottom'`（默认下方）| `'top'`（表盘上方）| `'none'`（不显示，用于外层统一定义）。**当跨接在被测元件上方时，必须设置 `labelPosition="top"` 彻底避免示数与下方元件滑轨碰撞**。
- **端子锚点**：
  - 左端子：`{ x: x - r, y: y }`
  - 右端子：`{ x: x + r, y: y }`
  - 上端子：`{ x: x, y: y - r }`
  - 下端子：`{ x: x, y: y + r }`

---

### 2. 滑动变阻器 (`Rheostat`)

```tsx
import { Rheostat } from '@/components/Physics'

<Rheostat
  x={pos.rh.x}
  y={pos.rh.y}
  width={140}
  value={resistance}
  min={0}
  max={maxResistance}
  variant="symbolic"
  font={font}
  label="滑动变阻器 R"
  showLabel={true}
/>
```
- **真实入参**：
  - `x`, `y`: 变阻器中心坐标
  - `width`: 宽度（基准尺寸 140，`scale = width / 140`）
  - `value`, `min`, `max`: 电阻阻值与量程
  - `variant`: `'symbolic'`
- **端子锚点**（`scale = width / 140`）：
  - 左引出端口（已内置连至上方滑轨）：`{ x: x - 73 * scale, y: y }`
  - 右引出端口（连至右侧电阻端）：`{ x: x + 73 * scale, y: y }`
  - 外部导线直接连至上述两引出点即可，严禁私自跨越。

---

### 3. 电路开关 (`CircuitSwitch`)

```tsx
import { CircuitSwitch } from '@/components/Physics'

<CircuitSwitch
  x={pos.sw.x}
  y={pos.sw.y}
  closed={isSwitchClosed}
  onToggle={() => setIsSwitchClosed(!isSwitchClosed)}
  label="S"
  variant="symbolic"
  font={font}
/>
```
- **真实入参**：
  - `x`, `y`: 开关中心点坐标
  - `closed`: 是否闭合导通（`boolean`）
  - `onToggle`: 点击切换回调（自带透明点击热区）
  - `label`: 标签文本（默认 `'S'`）
  - `variant`: `'symbolic'`
- **端子锚点**（水平放置）：
  - 左接线端子：`{ x: x - 18, y: y }`
  - 右接线端子：`{ x: x + 18, y: y }`

---

### 4. 直流电源组件 (`DCSource`)

```tsx
import { DCSource, getDCSourceTerminals, DC_SOURCE_SYMBOL_OFFSET } from '@/components/Physics'

// 原理图符号（垂直干路标准接入：长正极在上，短粗负极在下）
const dcTerms = getDCSourceTerminals(pos.dc.x, pos.dc.y, 'right-positive')

<DCSource
  x={pos.dc.x}
  y={pos.dc.y}
  voltage={E}
  type="symbol"
  polarity="right-positive"
  label={`E=${E}V, r=${r}Ω`}
/>
```
- **真实入参**：
  - `type`: `'symbol'`（标准原理图长正短负符号）或 `'battery'`（拟物干电池外观）
  - `voltage`: 电压标称值
  - `polarity`: `'right-positive'`（垂直放置时正极在上）或 `'left-positive'`
  - `label`: 标注文本
- **端子锚点计算**（统一调用 `getDCSourceTerminals`，严禁外部私自硬编码）：
  - 导出辅助函数：`const { posTerm, negTerm } = getDCSourceTerminals(x, y, polarity)`
  - 导出偏移常量：`DC_SOURCE_SYMBOL_OFFSET = 20`（上下引脚延伸值）
  - 外部导线由 `posTerm` / `negTerm` 直接正交接入，组件内部与外部引脚强绑定，杜绝因组件尺寸改动导致的飞线断连。

---

## ⚡ 高中物理电路图绘制关键铁律（适用于所有页面）

1. **红进黑出（电表正负接线柱规约）**：
   - 电流由电源正极流出，沿顺时针或指定闭合回路流动；
   - 电流表、电压表不是电源（无正负极之说），只有**正接线柱（红表笔，标 `+`）**与**负接线柱（黑表笔，标 `-`）**；
   - 电流必须由电表的**正接线柱（`+`）流入**，由**负接线柱（`-`）流出**；
   - `DialMeter` 外层自定义读数标签时，建议显式设置 `showLabel={false}`，彻底杜绝外层文字与组件内部文字在同坐标重叠。
2. **横平竖直矩形骨架**：
   - 任何电路图主回路必须以清晰的矩形框架布线，导线横平竖直，拐角为 90° 直角；
   - 严禁斜向飞线，严禁元件与导线交叉穿插；
   - 严禁“一条通线穿到底 + 元件背后垫白色假矩形遮挡”，必须端子到端子分段连接；
   - 任何 T 型并联分流或汇流节点，必须绘制实心圆点（`r = 3.5`，`fill={CIRCUIT_COLORS.node}`）。
3. **外接法与内接法标准拓扑**：
   - **外接法**（测小电阻）：电压表仅跨接在待测负载两端，电流表串联在测量区外部干路上；
   - **内接法**（测大电阻）：电流表与待测负载直接紧密串联，电压表跨接在“电流表 + 待测负载”串联总段两端。

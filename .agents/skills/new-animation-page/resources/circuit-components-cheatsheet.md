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

### 4. 直流电源符号标准实现

SVG 中标准电池符号（长正短负）：
```tsx
// 居中于 (cx, cy)
<g>
  {/* 正极：较长、细线 */}
  <line x1={cx - 6} y1={cy - 20} x2={cx - 6} y2={cy + 20} stroke="#0F172A" strokeWidth={1.5} />
  {/* 负极：较短、稍粗 */}
  <line x1={cx + 6} y1={cy - 12} x2={cx + 6} y2={cy + 12} stroke="#0F172A" strokeWidth={3.5} />
  {/* 标注 */}
  <text x={cx} y={cy - 26} fill={CANVAS_COLORS.label} fontSize={font(12)} textAnchor="middle" fontWeight="bold">
    E, r
  </text>
</g>
```
- 左接线点（正极）：`{ x: cx - 6, y: cy }`
- 右接线点（负极）：`{ x: cx + 6, y: cy }`

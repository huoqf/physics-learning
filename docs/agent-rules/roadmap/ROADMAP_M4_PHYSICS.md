# [M4] 电磁学 / 热学 / 光学 / 原子物理模块

&gt; 依赖：[M2] ✅ | 最后更新：2026-05-29

---

## 执行说明

- 各子模块（M4-1 ~ M4-4）可独立并行开发
- 每个模块开发前先补充对应纯函数库（src/physics/）和知识点数据
- 完成全部子模块后更新 roadmap/ROADMAP_PROGRESS.md 中 [M4] 状态 → ✅
- PixiJS 在 M4-1（电磁场粒子）时申报引入，在 process/PROCESS_LOG.md 中记录

---

## M4-1 电磁学模块

### 纯函数库 src/physics/electromagnetism.ts

- [x] calculateCoulombForce(k, q1, q2, r) → { F }   // ⚠️ 已在 src/physics/dynamics.ts 实现，直接复用，禁止重复定义
- [x] calculateElectricField(k, q, r) → { E }
- [x] calculateElectricPotential(k, q, r) → { V }
- [x] calculateCapacitor(epsilon, S, d) → { C }
- [x] calculateOhmLaw(U, R) → { I }
- [x] calculateSeriesResistance(Rs: number[]) → { R_total }
- [x] calculateParallelResistance(Rs: number[]) → { R_total }   // 空数组/含0电阻返回 0
- [x] calculateClosedCircuit(EMF, r, R_ext) → { I, U_terminal, P_output, P_total, eta }
- [x] calculateAmpereForce(B, I, L, angleDeg) → { F }
- [x] calculateLorentzForce(q, v, B, angleDeg) → { F }
- [x] calculateChargeInMagField(q, m, v, B) → { r, T, omega }   // 带电粒子圆周，含除零保护
- [x] calculateFaradayEMF(N, dPhi_dt) → { EMF }
- [x] calculateTransformer(n1, n2, U1, I1) → { U2, I2 }
- [x] calculateACRMS(V_peak) → { V_rms, I_rms }

> ✅ 2026-05-30：电磁学纯函数库 `src/physics/electromagnetism.ts` 完成（13 个新函数 + 复用库仑力），
> 16 项单测通过。组件实现待后续分步推进。

### 知识点 + 组件

#### 静电场（⭐⭐⭐⭐⭐ 高考重点）

| 知识点 | 频率 | 组件 |
|--------|------|------|
| 库仑定律 | ⭐⭐⭐⭐ | CoulombLaw |
| 电场强度 E=F/q | ⭐⭐⭐⭐⭐ | ElectricField |
| 电场线（匀强/点电荷） | ⭐⭐⭐⭐⭐ | FieldLines |
| 电势与电势差 | ⭐⭐⭐⭐⭐ | ElectricPotential |
| 等势面与电场线关系 | ⭐⭐⭐⭐ | ElectricPotential |
| 带电粒子在匀强电场中运动 | ⭐⭐⭐⭐⭐ | ChargeInEField |
| 电容器（C=Q/U） | ⭐⭐⭐⭐ | Capacitor |

- [x] **CoulombLaw.tsx** — 两点电荷间引力/斥力，距离/电量可调，同号斥/异号吸，F 实时计算（复用 calculateCoulombForce）
- [x] **ElectricField.tsx** — 点电荷电场线（放射状，正向外/负向内）+ 试探点 P 场强，平方反比说明（calculateElectricField）
- [x] **FieldLines.tsx** — 电场线+等势面，同种/异种电荷对，可交互放置试探电荷
- [x] **ElectricPotential.tsx**
  - 电势分布三维色图，等势面与电场线垂直关系
  - 高考要点：沿电场线方向电势降低；等势面上移动电荷电场力不做功
- [x] **ChargeInEField.tsx**
  - 带电粒子进入匀强电场（类平抛）：水平匀速+竖直加速，平行板模型 + 轨迹 + 速度分量，到达板端自动暂停
  - 参数：电场强度E、粒子质量m、电荷量q、初速度v0；a=qE/m
  - 高考要点：与平抛运动类比，水平方向匀速，竖直方向匀加速
- [x] **Capacitor.tsx**
  - 平行板电容器：C=εS/d（含相对介电常数 εᵣ），改变S/d/介质时 C 与 Q=CU 实时变化（calculateCapacitor）
  - 高考要点：d↑→C↓；S↑→C↑；插入电介质 εᵣ↑→C↑

> ✅ 2026-05-30：静电场高频 4 组件完成（CoulombLaw/ElectricField/ChargeInEField/Capacitor），
> 注册表 + 知识点（electricity-1-1~1-4）+ 参数面板 + 物理量看板均接线，按需懒加载。
> FieldLines / ElectricPotential 留待后续（电场线密集可视化将评估是否引入 PixiJS）。

#### 恒定电流（⭐⭐⭐⭐⭐ 高考必考）

| 知识点 | 频率 | 组件 |
|--------|------|------|
| 欧姆定律 I=U/R | ⭐⭐⭐⭐⭐ | OhmLaw |
| 电阻定律 R=ρL/S | ⭐⭐⭐⭐ | ResistivityLaw |
| 串并联电路 | ⭐⭐⭐⭐⭐ | CircuitAnalysis |
| 闭合电路欧姆定律 | ⭐⭐⭐⭐⭐ | ClosedCircuit |
| 电功与电功率 | ⭐⭐⭐⭐⭐ | ElectricPower |
| 安培表/电压表内外接法 | ⭐⭐⭐⭐ | MeterConnection |

- [x] **OhmLaw.tsx** — U-I 图像（过原点直线，斜率 1/R），工作点投影，calculateOhmLaw
- [ ] **ResistivityLaw.tsx** — R=ρL/S，改变长度/截面积/材料，实时显示电阻值
- [x] **CircuitAnalysis.tsx**
  - 串联：I相同，U按R分配，R总=ΣR；并联：U相同，I按1/R分配，1/R总=Σ(1/R)
  - 串/并联可切换（mode 参数），电路示意图 + 各元件 I/U 实时标注
- [x] **ClosedCircuit.tsx**
  - 闭合电路：I=EMF/(R+r)，路端电压U=EMF-Ir，效率 η=P出/P总（含效率条）
  - calculateClosedCircuit；高考要点：短路时I最大U=0
- [ ] **ElectricPower.tsx** — P=UI=I²R=U²/R，焦耳热Q=I²Rt，额定功率vs实际功率
- [ ] **MeterConnection.tsx** — 安培表内接/外接误差分析，选择方法（R被测大用外接）

> ✅ 2026-05-30：恒定电流高频 3 组件完成（OhmLaw/CircuitAnalysis/ClosedCircuit），
> 知识点 electricity-2-1~2-3 + 注册表 + 参数面板 + 物理量看板全接线。
> ResistivityLaw / ElectricPower / MeterConnection 留待后续。

#### 磁场（⭐⭐⭐⭐⭐ 高考重点）

| 知识点 | 频率 | 组件 |
|--------|------|------|
| 磁感线与磁场方向 | ⭐⭐⭐⭐ | MagneticField |
| 安培力 F=BIL | ⭐⭐⭐⭐⭐ | AmpereForce |
| 洛伦兹力 F=qvB | ⭐⭐⭐⭐⭐ | LorentzForce |
| 带电粒子在磁场中圆周运动 | ⭐⭐⭐⭐⭐ | ChargeInBField |
| 质谱仪/回旋加速器原理 | ⭐⭐⭐⭐ | ChargeInBField |

- [ ] **MagneticField.tsx** — 直导线/圆环/螺线管磁场可视化，右手定则演示

> ✅ 2026-05-31：磁场高频 3 组件完成（AmpereForce/LorentzForce/ChargeInBField），
> 知识点 electricity-3-1~3-3 + 注册表 + 参数面板 + 物理量看板全接线。
> 审查修复：LorentzForce angle 参数视觉反映 + 力线段比例计算，AmpereForce 力/电流颜色区分（electricCurrent→翡翠绿）。
> MagneticField 留待后续。

- [x] **AmpereForce.tsx** — 通电导线在磁场中受力，F=BILsinθ，左手定则交互
- [x] **LorentzForce.tsx** — 洛伦兹力方向（左手定则），F=qvBsinθ，不做功原理
- [x] **ChargeInBField.tsx**
  - 带电粒子进入匀强磁场做圆周运动：r=mv/(qB)，T=2πm/(qB)
  - 质谱仪模型（速度选择器→磁场偏转）
  - 回旋加速器工作原理（半圆加速，T与速度无关）
  - 高考要点：r=mv/(qB)；T与速度无关（非相对论）

#### 电磁感应（⭐⭐⭐⭐⭐ 高考必考难点）

| 知识点 | 频率 | 组件 |
|--------|------|------|
| 电磁感应现象 | ⭐⭐⭐⭐ | InductionPhenomenon |
| 楞次定律（感应电流方向） | ⭐⭐⭐⭐⭐ | LenzsLaw |
| 法拉第电磁感应定律 EMF=ΔΦ/Δt | ⭐⭐⭐⭐⭐ | FaradayLaw |
| 导线切割磁力线 EMF=BLv | ⭐⭐⭐⭐⭐ | CuttingEMF |
| 自感与互感 | ⭐⭐⭐ | SelfInductance |

- [ ] **InductionPhenomenon.tsx** — 磁通量变化→感应电流，各种改变磁通量方式

> ✅ 2026-05-31：电磁感应高频 3 组件完成（LenzsLaw/FaradayLaw/CuttingEMF），
> 知识点 electricity-4-1~4-3 + 注册表 + 参数面板 + 物理量看板全接线。
> 审查修复：LenzsLaw 感应磁场线方向修正、CuttingEMF EMF箭头方向修正、
> FaradayLaw Mode1 omega 修正+线圈旋转视觉、硬编码颜色/线宽→主题 token、
> 新增 magnetNorth/magnetSouth 颜色 token、导体棒 ping-pong 循环。
> InductionPhenomenon/SelfInductance 留待后续。

- [x] **LenzsLaw.tsx**
  - 磁铁插入/拔出线圈，感应电流方向可视化（楞次定律：阻碍磁通量变化）
  - 高考要点：感应电流产生的磁场与原磁场关系；楞次定律判断方向
- [x] **FaradayLaw.tsx** — EMF=NΔΦ/Δt，磁通量变化率可调，感应电动势实时计算
- [x] **CuttingEMF.tsx**
  - 导线在匀强磁场中切割：EMF=BLv，导轨模型（含电阻）
  - 安培力 vs 驱动力，达到匀速时安培力=驱动力
  - 高考要点：导轨问题能量守恒（电能=热能=安培力做的功）
- [ ] **SelfInductance.tsx** — 通断电时电感的延迟效应，日光灯启动原理

#### 交变电流（⭐⭐⭐⭐ 高考重点）

| 知识点 | 频率 | 组件 |
|--------|------|------|
| 交变电流产生与图像 | ⭐⭐⭐⭐ | ACGeneration |
| 有效值与峰值关系 | ⭐⭐⭐⭐⭐ | ACValues |
| 变压器原理 | ⭐⭐⭐⭐⭐ | Transformer |
| 远距离输电 | ⭐⭐⭐⭐ | PowerTransmission |

- [ ] **ACGeneration.tsx** — 线圈在匀强磁场中转动，EMF-t图像，从最大值/零开始区别
- [ ] **ACValues.tsx** — 峰值与有效值关系（正弦波：V_rms=V_peak/√2，热效应等效
- [ ] **Transformer.tsx**
  - n1/n2可调，U1:U2=n1:n2，I1:I2=n2:n1（理想变压器）
  - 高考要点：升压变压器n2&gt;n1；匝数比决定电压，功率守恒决定电流
- [ ] **PowerTransmission.tsx**
  - 升压→长途输电→降压全流程，线路电阻热损耗计算
  - 高考要点：提高输电电压→减小电流→减少线路损耗

---

## M4-2 热学模块

### 纯函数库 src/physics/thermodynamics.ts

- [ ] calculateIdealGas(p1, V1, T1, p2?, V2?) → { result }  // 盖-吕萨克/查理/玻意耳
- [ ] calculateInternalEnergy(deltaQ, deltaW) → { deltaU }  // 热力学第一定律

### 知识点 + 组件

| 知识点 | 频率 | 组件 |
|--------|------|------|
| 分子热运动与布朗运动 | ⭐⭐⭐ | BrownianMotion |
| 分子间作用力（引力+斥力） | ⭐⭐⭐⭐ | MolecularForce |
| 温度与内能 | ⭐⭐⭐ | InternalEnergy |
| 气体实验三定律 | ⭐⭐⭐⭐⭐ | GasLaws |
| 理想气体状态方程 | ⭐⭐⭐⭐⭐ | IdealGasState |
| 热力学第一定律 | ⭐⭐⭐⭐ | FirstLawThermo |
| 热力学第二定律（方向性） | ⭐⭐⭐ | SecondLawThermo |

- [ ] **BrownianMotion.tsx** — 粒子随机游走模拟，温度越高运动越剧烈；区分布朗运动（花粉）vs分子热运动
- [ ] **MolecularForce.tsx** — 分子间F-r曲线（斥力+引力），平衡距离r0，引力斥力共存
- [ ] **GasLaws.tsx**
  - 玻意耳定律（T恒定，pV=常数）：p-V图（等温线双曲线）
  - 查理定律（V恒定，p/T=常数）：p-T图（正比直线）
  - 盖-吕萨克定律（p恒定，V/T=常数）：V-T图（正比直线）
  - 高考要点：T必须用开尔文（K=℃+273）
- [ ] **IdealGasState.tsx** — pV/T=常数，三变量联动，气柱问题模拟（封闭气体变化过程）
- [ ] **FirstLawThermo.tsx** — ΔU=Q+W，吸热做功符号规定，各种热力学过程能量分析
- [ ] **SecondLawThermo.tsx** — 热量自发从高温到低温，永动机不可能，熵增方向性演示

---

## M4-3 光学模块

### 纯函数库 src/physics/optics.ts

- [ ] calculateRefraction(theta1_deg, n1, n2) → { theta2_deg }
- [ ] calculateCriticalAngle(n1, n2) → { theta_c_deg }
- [ ] calculateThinLens(f, u) → { v, magnification, type }   // 实像/虚像

### 知识点 + 组件

#### 几何光学（⭐⭐⭐⭐⭐ 高考必考）

| 知识点 | 频率 | 组件 |
|--------|------|------|
| 光的反射定律 | ⭐⭐⭐ | Reflection |
| 光的折射定律（n=sinθ1/sinθ2） | ⭐⭐⭐⭐⭐ | Refraction |
| 全反射与临界角 | ⭐⭐⭐⭐⭐ | TotalInternalReflection |
| 薄透镜成像规律（1/u+1/v=1/f） | ⭐⭐⭐⭐⭐ | ThinLens |
| 透镜作图（三条特殊光线） | ⭐⭐⭐⭐⭐ | ThinLens |

- [ ] **Reflection.tsx** — 入射角/反射角相等，平面镜成像（等大虚像），逆光路原理
- [ ] **Refraction.tsx**
  - 折射定律n1sinθ1=n2sinθ2，折射率n=c/v
  - 光从密→疏偏离法线，从疏→密靠近法线
  - 高考要点：折射率越大光速越小；折射率=真空光速/介质光速
- [ ] **TotalInternalReflection.tsx**
  - 临界角sinC=n2/n1（n1&gt;n2时），光纤原理演示
  - 入射角逐渐增大→折射光线偏折→消失→全反射
  - 高考要点：只有从密介质射向疏介质时才可能发生全反射
- [ ] **ThinLens.tsx**
  - 凸透镜/凹透镜可切换，物距u可拖动调节
  - 实时显示：像距v，放大率m=v/u，像的性质（实/虚，正/倒，大/小）
  - 三条特殊光线作图（平行→过焦点/过光心不折/过焦点→平行）
  - 成像规律口诀可视化：u&gt;2f实倒缩，u=2f实倒等，f&lt;u&lt;2f实倒放，u&lt;f虚正放
  - 高考要点：实像在透镜异侧，虚像在同侧；实像倒立，虚像正立

#### 波动光学（⭐⭐⭐ 中频）

| 知识点 | 频率 | 组件 |
|--------|------|------|
| 光的干涉（双缝） | ⭐⭐⭐⭐ | LightInterference |
| 光的衍射 | ⭐⭐⭐ | LightDiffraction |

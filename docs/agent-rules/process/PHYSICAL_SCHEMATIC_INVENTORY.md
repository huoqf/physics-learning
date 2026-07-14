# physical-schematic 矢量清单与优化分析

> 日期：2026-07-14
> 统计：129 个 `arrowType="physical-schematic"` 实例（含 5 个辅助函数），全部使用 `pixelLength`

---

## pixelLength 模式分类与迁移评估

| 类别 | 实例数 | 占比 | 代表公式 | 可否迁移 | 原因 |
|------|:------:|:----:|----------|:--------:|------|
| **A 固定值** | 14 | 11% | `40`、`28`、`vertFixedLen` | ❌ | 长度刻意不编码物理量，refMagnitudes 按比例缩放语义相反 |
| **B 线性缩放** | 28 | 22% | `F*2.5`、`v*26`、`F*fs` | ✅ | `F*k` → `refMag≈maxVL*weight/k`，注意下限对齐和视觉权重 |
| **C 夹住上限** | 34 | 26% | `Math.min(F*0.008,60)` | ✅ | 与 calculateVectorPixelLength 同构，最契合 refMagnitudes |
| **D 几何距离** | 42 | 33% | `Math.hypot(终点-起点)` | ❌ | 长度由端点几何约束，迁移会破坏平行四边形/三角形闭合 |
| **E 参数传入** | 2 | 1.5% | `length`、`len`（函数参数） | ❌ | 通用渲染函数对外参数，迁移破坏抽象 |
| **F 速度分解** | 9 | 7% | `totalPxLen` + `total×(vx/v)` | ⚠️ 部分 | total 3 个冗余可移除；vx/vy 6 个须保留维持闭合 |

**可迁移约 62 个**（B 28 + C 32 + F.total 3 - GravityAnimation 对数 2），**67 个保留 pixelLength 是合理设计**。

### 不可迁移的典型场景

1. **受力分析图中等长力**（A 类）：高中物理教学中，受力分析图经常用等长箭头表示不同力（重点在方向和标注），而非按比例
2. **矢量化几何图形**（D 类）：平行四边形/三角形/正交分解图，箭头尖端必须落在几何端点上
3. **速度分解闭合**（F 类 vx/vy）：分量必须与总量成比例，否则分解三角形不闭合
4. **对数缩放**（GravityAnimation）：`Math.log10(F+1)` 是非线性，refMagnitudes 仅支持线性
5. **通用渲染函数**（E 类）：pixelLength 是接口参数

---

## 分类概览

| 模块 | 文件数 | 实例数 | 典型 pixelLength 模式 |
|------|:------:|:------:|----------------------|
| 力学-动力学 | 13 | 73 | Math.hypot() / forceScale / 固定值 |
| 力学-运动学 | 3 | 9 | vxPxLen / vyPxLen / totalPxLen |
| 力学-能量 | 7 | 20 | Math.min(value, max) / arrowPx |
| 力学-圆周 | 1 | 6 | velocityLength / gForceLength |
| 力学-万有引力 | 1 | 12 | 固定 40 / v×26 |
| 电磁学-静电 | 5 | 10 | pixelLenE / pixelLenF / vxPxLen |
| 电磁学-感应 | 1 | 4 | iLength / vLength / faLength |
| 电磁学-安培力 | 1 | 5 | G_mag / N×forceScale |
| 电磁学-组合场 | 1 | 1 | len（参数传入） |
| 热学 | 1 | 1 | forceArrowLen |
| 振动 | 1 | 1 | length（参数传入） |

---

## 详细清单

### 力学-动力学 (73 实例)

#### BlockBoardAnimation (8)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 159 | gravity | FgBlock * fs | 木块重力 |
| 167 | normalForce | FN1 * fs | 木块支持力 |
| 176 | friction | Ff1 * fs | 木块摩擦力 |
| 187 | gravity | FgBoard * fs | 木板重力 |
| 196 | normalForce | FN1 * fs | 木板支持力1 |
| 205 | normalForce | FN2 * fs | 木板支持力2 |
| 214 | appliedForce | Ff1 * fs | 木板外力 |
| 224 | friction | Ff2 * fs | 木板摩擦力 |

#### ConnectedBodiesAnimation (5)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 208 | appliedForce | arrowLength | 拉力 |
| 231 | friction | 28 | A摩擦力 |
| 247 | friction | 28 | B摩擦力 |
| 266 | tension | 28 | A绳张力 |
| 282 | tension | 28 | B绳张力 |

#### EarthGravityScene (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 134 | gravity | Math.hypot(Fx_grav, Fy_grav) | 万有引力 |
| 153 | forceComponent | Math.hypot(Fx_centrifugal, Fy_centrifugal) | 离心力分量 |
| 174 | gravity | Math.hypot(Gx, Gy) | 表观重力 |

#### EquilibriumAnimation (11)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 165 | gravity | Math.hypot(gDisplayEnd-gStart) | 重力 |
| 174 | tension | Math.hypot(t1DisplayEnd-t1Start) | 张力1 |
| 189 | tension | Math.hypot(t2DisplayEnd-t2Start) | 张力2 |
| 209 | force | Math.hypot(fNetDisplayEnd-ballCenter) | 合力 |
| 232 | forceComponent | Math.hypot(t1xDisplayEnd-ballCenter) | T1x分量 |
| 236 | forceComponent | Math.hypot(t1yDisplayEnd-ballCenter) | T1y分量 |
| 247 | forceComponent | Math.hypot(t2xDisplayEnd-ballCenter) | T2x分量 |
| 251 | forceComponent | Math.hypot(t2yDisplayEnd-ballCenter) | T2y分量 |
| 305 | gravity | Math.hypot(triGDisplayEnd-triOrigin) | 重力（三角形模式） |
| 314 | tension | Math.hypot(triT1DisplayEnd-triGDisplayEnd) | T1（三角形模式） |
| 329 | tension | Math.hypot(triT2DisplayEnd-triT1DisplayEnd) | T2（三角形模式） |

#### InclinedPlaneAnimation (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 222 | gravity | G_px | 重力 |
| 238 | normalForce | FN_px | 支持力 |
| 255 | friction | Ff_px | 摩擦力 |

#### NewtonSecondAnimation (5)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 199 | appliedForce | Math.max(15, F_applied * 2.5) | 拉力F |
| 223 | friction | Math.max(15, f * 2.5) | 摩擦力f |
| 246 | gravity | 45（固定） | 重力G |
| 266 | normalForce | 45（固定） | 支持力FN |
| 288 | force | Math.max(25, F_net * 2.5) | 合力 |

#### OrthogonalDecompositionAnimation (13)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 194 | forceComponent | Math.hypot(xProjEnd-origin) | 力的x投影 |
| 202 | forceComponent | Math.hypot(yProjEnd-origin) | 力的y投影 |
| 226 | force | Math.hypot(end-origin) | 力 |
| 252 | force | Math.hypot(netForce.end-origin) | 合力 |
| 321 | forceComponent | Math.hypot(G.xProjEnd) | 重力x投影 |
| 329 | forceComponent | Math.hypot(G.yProjEnd) | 重力y投影 |
| 348 | forceComponent | Math.hypot(FN.xProjEnd) | 支持力x投影 |
| 356 | forceComponent | Math.hypot(FN.yProjEnd) | 支持力y投影 |
| 370 | forceComponent | Math.hypot(f.xProjEnd) | 摩擦力x投影 |
| 378 | forceComponent | Math.hypot(f.yProjEnd) | 摩擦力y投影 |
| 393 | force | Math.hypot(G.end-origin) | 重力 |
| 400 | force | Math.hypot(FN.end-origin) | 支持力 |
| 407 | force | Math.hypot(f.end-origin) | 摩擦力 |

#### VectorDecomposition (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 20 | forceComponent | Math.hypot(fxEnd-origin) | x分量 |
| 30 | forceComponent | Math.hypot(fyEnd-origin) | y分量 |
| 46 | force | Math.hypot(fResultantEnd-origin) | 合力 |

#### VectorParallelogram (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 20 | appliedForce | Math.hypot(f1End-origin) | 力F1 |
| 32 | tension | Math.hypot(f2End-origin) | 力F2 |
| 54 | force | Math.hypot(fResultantEnd-origin) | 合力 |

#### VectorTriangle (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 21 | appliedForce | Math.hypot(f1End-origin) | 力F1 |
| 36 | tension | Math.hypot(f2Shifted) | 力F2 |
| 53 | force | Math.hypot(fResultantEnd-origin) | 合力 |

#### GravityAnimation (2)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 402 | gravity | arrowLen | 重力1 |
| 422 | gravity | arrowLen | 重力2 |

### 力学-运动学 (9 实例)

#### ProjectileAnimation (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 397 | velocityX | vxPxLen | 水平速度分量 |
| 410 | velocityY | vyPxLen | 竖直速度分量 |
| 423 | velocity | totalPxLen | 合速度 |

#### ObliqueThrowAnimation (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 311 | velocityX | vxPxLen | 水平速度分量 |
| 317 | velocityY | vyPxLen | 竖直速度分量 |
| 323 | velocity | totalPxLen | 合速度 |

#### AccelerationCenterExtra (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| — | velocity | (参数传入) | 速度 |
| — | acceleration | (参数传入) | 加速度 |
| — | force | (参数传入) | 力 |

### 力学-能量 (20 实例)

#### ElasticScene (2)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 74 | elasticForce | Math.min(Math.abs(pos)*15+10, 45) | 弹力 |
| 84 | velocity | Math.min(Math.abs(v)*5+10, 45) | 速度 |

#### SpringCompositeAnimation (5)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| — | elasticForce | (多个模式) | 弹力 |
| — | velocity | (多个模式) | 速度 |
| — | gravity | (多个模式) | 重力 |
| — | normalForce | (多个模式) | 支持力 |
| — | friction | (多个模式) | 摩擦力 |

#### WorkAnimation (5)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 278 | appliedForce | Math.sqrt(forceDx^2+forceDy^2) | 力 |
| 301 | velocity | Math.abs(projEndX) | 速度 |
| 351 | gravity | Math.min(weight*1.5, 50) | 重力 |
| 368 | normalForce | Math.min(F_N*1.5, 40) | 支持力 |
| 387 | friction | Math.min(f*3, 40) | 摩擦力 |

#### ValleyScene (4)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 107 | velocity | arrowPx | 速度 |
| 123 | gravity | Math.min(G*2, max*0.9) | 重力 |
| 140 | normalForce | Math.min(N*2, max*0.9) | 支持力 |
| 158 | friction | Math.min(f*2, max*0.9) | 摩擦力 |

#### PendulumScene (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 101 | gravity | Math.min(mg*2, max*0.9) | 重力 |
| 114 | tension | Math.min(T*2, max*0.9) | 张力 |
| 130 | velocity | arrowPx | 速度 |

#### PowerScene (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 236 | appliedForce | Math.min(F*0.008, 60) | 力 |
| 247 | friction | Math.min(f*0.008, 30) | 摩擦力 |
| 258 | velocity | Math.min(v*3.5, 70) | 速度 |

#### GravityScene (2)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 62 | velocity | Math.min(Math.abs(v)*3.5, 45)+4 | 速度 |
| 69 | gravity | Math.min(mg*1.2, 45)+4 | 重力 |

### 力学-圆周 (6 实例)

#### CircularModelsAnimation (6)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 262 | velocity | velocityLength | 速度 |
| 274 | gravity | gForceLength | 重力 |
| 289 | tension | tensionLength | 张力 |
| 322 | force | centripLength | 向心力 |
| 341 | normalForce | normalLength | 支持力 |
| 355 | friction | frictionLength | 摩擦力 |

### 力学-万有引力 (12 实例)

#### BinaryStarsAnimation (12)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 130 | force | 40（固定） | 星1引力 |
| 141 | velocity | Math.max(12, v1*26) | 星1速度 |
| 154 | force | 40（固定） | 星2引力 |
| 165 | velocity | Math.max(12, v2*26) | 星2速度 |
| 181 | force | 40（固定） | 质心引力 |
| 192 | velocity | Math.max(12, v*26) | 质心速度 |
| 204 | forceComponent | 25（固定） | 引力x分量 |
| 215 | forceComponent | 25（固定） | 引力y分量 |
| 228 | force | 40（固定） | 星1引力(变质量) |
| 239 | velocity | Math.max(12, v*26) | 星1速度(变质量) |
| 252 | force | 40（固定） | 星2引力(变质量) |
| 263 | velocity | Math.max(12, v*26) | 星2速度(变质量) |

### 电磁学-静电 (10 实例)

#### FieldLines (1)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 334 | electricForce | Math.sqrt(forceArrow^2) | 电场力 |

#### ChargeInEField (3)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 345 | velocityX | vxPxLen | 水平速度 |
| 366 | velocityY | vyPxLen | 竖直速度 |
| 388 | velocity | totalPxLen | 合速度 |

#### ElectricFieldBasicScene (2)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 115 | electricField | pixelLenE | 电场 |
| 137 | electricForce | pixelLenF | 电场力 |

#### ElectricFieldAdvancedScene (4)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 97 | electricField | lenE1 | 电场1 |
| 115 | electricField | lenE2 | 电场2 |
| 146 | electricField | lenEnet | 合电场 |
| 169 | electricForce | lenF | 电场力 |

### 电磁学-感应 (4 实例)

#### SingleRodAnimation (4)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 136 | currentDirection | iLength | 电流方向 |
| 160 | velocity | vLength | 速度 |
| 170 | lorentzForce | faLength | 安培力 |
| 181 | appliedForce | fLength | 外力 |

### 电磁学-安培力 (5 实例)

#### InclineForceVectors (5)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 71 | gravity | G_mag | 重力 |
| 91 | normalForce | N * forceScale | 支持力 |
| 113 | lorentzForce | Math.hypot(Fa) * forceScale | 安培力 |
| 138 | friction | Math.abs(f * forceScale) | 摩擦力 |
| 165 | acceleration | 2.5 * forceScale | 加速度 |

### 电磁学-组合场 (1 实例)

#### renderVectorArrow (1)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 40 | (参数传入) | len | 通用矢量 |

### 热学 (1 实例)

#### BrownianMotion (1)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 264 | force | forceArrowLen | 分子力 |

### 振动 (1 实例)

#### renderSceneVector (1)
| 行 | type | pixelLength | 矢量内容 |
|----|------|------------|---------|
| 26 | (参数传入) | length | 通用矢量 |

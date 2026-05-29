# [M1] 力学模块 — 完整知识点与组件任务

&gt; 依赖：[M0] ✅ | 完成后解锁：[M2] [M3]
&gt; 最后更新：2026-05-29

---

## 执行说明

- 按 M1-0 → M1-8 顺序执行，**M1-0 基础设施必须最先完成**
- 每完成一个组件：① 本文件打 `[x]` ② 注册到 `animationRegistry.ts` ③ 记录到 `process/PROCESS_LOG.md`
- 知识点覆盖目标：高考全覆盖（必考 + 高频考点 + 近10年真题场景）
- ⭐频率说明：⭐=低频 ⭐⭐⭐=中频 ⭐⭐⭐⭐⭐=高频必考

---

## M1-0 物理计算基础设施（全模块共用）

### 纯函数库 src/physics/

- [ ] **kinematics.ts** — 运动学
  - calculateUniformMotion(v, t) → { s }
  - calculateAcceleratedMotion(v0, a, t) → { v, s }
  - calculateFreeFall(v0, g, t) → { v, y }  // v0=0自由落体，v0&gt;0上抛
  - calculateProjectileMotion(v0x, g, t) → { x, y, vx, vy, v, angle }
  - calculateObliqueThrow(v0, angleDeg, g, t) → { x, y, vx, vy }
  - calculateObliqueThrowRange(v0, angleDeg, g) → { range, maxHeight, totalTime }
  - calculateCircularMotion(r, omega, t) → { x, y, v, a_c, period }
  - calculateCircularFromPeriod(r, T) → { omega, v, a_c }

- [ ] **dynamics.ts** — 动力学
  - calculateNewtonSecond(F_net, m) → { a }
  - calculateFriction(mu, N, isKinetic) → { f }
  - calculateElasticForce(k, x) → { F }
  - calculateCoulombForce(k, q1, q2, r) → { F }
  - calculateGravitation(G, m1, m2, r) → { F }
  - calculateInclinedPlane(m, angleDeg, mu, g) → { N, f, a, F_parallel, F_vertical }
  - calculateConnectedBody(m1, m2, F, mu, g) → { a, T }

- [ ] **energy.ts** — 能量与动量
  - calculateWork(F, s, angleDeg) → { W }
  - calculateKineticEnergy(m, v) → { Ek }
  - calculateGravityPotential(m, g, h) → { Ep }
  - calculateMechanicalEnergy(m, v, g, h) → { E, Ek, Ep }
  - calculateMomentum(m, v) → { p }
  - calculateImpulse(F, t) → { I }
  - calculateElasticCollision(m1, v1, m2, v2) → { v1f, v2f, deltaEk }
  - calculateInelasticCollision(m1, v1, m2, v2) → { vf, deltaEk }

- [ ] **celestial.ts** — 天体与卫星
  - calculateOrbitalSpeed(M, r, G) → { v, T, a_c }
  - calculateKeplerThird(r1, T1, r2) → { T2 }
  - calculateCentralMass(r, T, G) → { M }
  - calculatePlanetDensity(T_surface, G) → { rho }
  - calculateEscapeSpeed(M, R, G) → { v1, v2, v3 }

### Zustand Store

- [ ] **扩展 `src/stores/useAnimationStore.ts`**（在 M0-4 骨架基础上补充字段，**禁止另建 `usePhysicsState.ts`**）
  > ⚠️ `usePhysicsState` 与 `useAnimationStore` 职责完全重叠（都管 animationType/params/time/isPlaying/speed），统一使用 `useAnimationStore`

```ts
// 在 M0-4 useAnimationStore 基础上新增以下字段：
interface AnimationStoreExtension {
  showVectors: boolean   // 是否显示矢量箭头
  showFormulas: boolean  // 是否显示公式标注
  showGrid: boolean      // 是否显示网格
}
// 新增 actions: toggleVectors / toggleFormulas / toggleGrid
// 原有 actions（来自 M0-4）: setParams / setTime / togglePlay / setSpeed / reset
```
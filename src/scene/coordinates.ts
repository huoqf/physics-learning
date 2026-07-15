/**
 * Branded Coordinate Types —— 场景坐标系的类型安全封装
 *
 * 本模块通过 TypeScript 的 branded type 模式，在编译期区分不同坐标系下的点与矢量，
 * 防止以下常见错误：
 *
 *   1. 将物理坐标（PhysicsCoord，单位 m，y↑ 正）直接当作设计坐标（DesignCoord，单位 px，y↓ 正）使用；
 *   2. 将容器像素坐标（ContainerPixelCoord，经 viewport transform 后的屏幕坐标）与中间设计坐标混淆；
 *   3. 将表示位置的点与表示方向/长度的矢量混用；
 *   4. 在需要翻转 Y 轴的转换中忘记翻转，导致物体在场景中上下漂移。
 *
 * 使用方式：
 *   - 构造：通过 `asPhysicsCoord({ x: 5, y: 10 })` 等工厂函数生成 branded 值；
 *   - 转换：始终使用本模块提供的纯函数（如 `physicsToDesign`）进行跨坐标系转换，
 *     禁止在业务代码中手写 `x * scaleX` 等裸公式；
 *   - 消费： branded type 的运行时值与普通对象完全一致，可直接解构 `{ x, y }`。
 *
 * 坐标系层级（自上而下）：
 *   PhysicsCoord ──physicsToDesign──→ DesignCoord ──designToContainer──→ ContainerPixelCoord
 *   PhysicsVector ──physicsVectorToDesignVector──→ DesignVector
 *
 * 注意：
 *   - 所有转换函数均为纯函数，无 React/DOM/Window 依赖，符合 `src/physics/` 层的可序列化约束；
 *   - __brand 字段仅存在于类型层面，运行时无开销。
 */

import type { Vector2 } from '../physics/Vector2';
import type { SceneScale } from './SceneScale';

// ─────────────────────────────────────────────────────────────────────────────
// Branded Types
// ─────────────────────────────────────────────────────────────────────────────

/** 物理坐标系中的点：单位 m，y 轴向上为正（与物理课本一致） */
export type PhysicsCoord = Vector2 & { readonly __brand: 'PhysicsCoord' };

/** 设计坐标系中的点：单位 px（设计稿像素），y 轴向下为正（与 SVG/Canvas 一致） */
export type DesignCoord = { x: number; y: number } & { readonly __brand: 'DesignCoord' };

/** 容器像素坐标系中的点：经 viewport transform 缩放/平移后的最终屏幕像素 */
export type ContainerPixelCoord = { x: number; y: number } & { readonly __brand: 'ContainerPixelCoord' };

/** 物理坐标系中的矢量：单位 m，y 轴向上为正，仅表示方向与长度，不含位置信息 */
export type PhysicsVector = Vector2 & { readonly __brand: 'PhysicsVector' };

/** 设计坐标系中的矢量：单位 px，y 轴向下为正，仅表示方向与长度，不含位置信息 */
export type DesignVector = { x: number; y: number } & { readonly __brand: 'DesignVector' };

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions（类型安全的构造器）
// ─────────────────────────────────────────────────────────────────────────────

/** 将普通 Vector2 提升为 PhysicsCoord（物理坐标点） */
export function asPhysicsCoord(v: Vector2): PhysicsCoord {
  return v as PhysicsCoord;
}

/** 将普通 {x,y} 提升为 DesignCoord（设计坐标点） */
export function asDesignCoord(v: { x: number; y: number }): DesignCoord {
  return v as DesignCoord;
}

/** 将普通 {x,y} 提升为 ContainerPixelCoord（容器像素坐标点） */
export function asContainerPixelCoord(v: { x: number; y: number }): ContainerPixelCoord {
  return v as ContainerPixelCoord;
}

/** 将普通 Vector2 提升为 PhysicsVector（物理坐标矢量） */
export function asPhysicsVector(v: Vector2): PhysicsVector {
  return v as PhysicsVector;
}

/** 将普通 {x,y} 提升为 DesignVector（设计坐标矢量） */
export function asDesignVector(v: { x: number; y: number }): DesignVector {
  return v as DesignVector;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate Transform Functions（纯函数，无 React 依赖）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 物理坐标 → 设计坐标（含 Y 轴翻转）
 *
 * 公式：
 *   designX = scene.originX + physicsX * scene.scaleX
 *   designY = scene.originY - physicsY * scene.scaleY   // 翻转 Y 轴
 */
export function physicsToDesign(p: PhysicsCoord, scene: SceneScale): DesignCoord {
  return asDesignCoord({
    x: scene.originX + p.x * scene.scaleX,
    y: scene.originY - p.y * scene.scaleY,
  });
}

/**
 * 设计坐标 → 容器像素坐标
 *
 * 公式：
 *   containerX = designX * vp.scale + vp.tx
 *   containerY = designY * vp.scale + vp.ty
 */
export function designToContainer(
  p: DesignCoord,
  vp: { tx: number; ty: number; scale: number },
): ContainerPixelCoord {
  return asContainerPixelCoord({
    x: p.x * vp.scale + vp.tx,
    y: p.y * vp.scale + vp.ty,
  });
}

/**
 * 容器像素坐标 → 设计坐标
 *
 * 公式（designToContainer 的逆运算）：
 *   designX = (containerX - vp.tx) / vp.scale
 *   designY = (containerY - vp.ty) / vp.scale
 */
export function containerToDesign(
  p: ContainerPixelCoord,
  vp: { tx: number; ty: number; scale: number },
): DesignCoord {
  return asDesignCoord({
    x: (p.x - vp.tx) / vp.scale,
    y: (p.y - vp.ty) / vp.scale,
  });
}

/**
 * 物理矢量 → 设计矢量（含 Y 轴翻转，无平移）
 *
 * 公式：
 *   designVx = physicsVx * scene.scaleX
 *   designVy = -physicsVy * scene.scaleY   // 翻转 Y 轴
 */
export function physicsVectorToDesignVector(v: PhysicsVector, scene: SceneScale): DesignVector {
  return asDesignVector({
    x: v.x * scene.scaleX,
    y: -v.y * scene.scaleY,
  });
}

/**
 * 设计矢量 → 物理矢量（含 Y 轴翻转，无平移）
 *
 * 公式（physicsVectorToDesignVector 的逆运算）：
 *   physicsVx = designVx / scene.scaleX
 *   physicsVy = -designVy / scene.scaleY   // 翻转 Y 轴
 */
export function designVectorToPhysicsVector(v: DesignVector, scene: SceneScale): PhysicsVector {
  return asPhysicsVector({
    x: v.x / scene.scaleX,
    y: -v.y / scene.scaleY,
  });
}

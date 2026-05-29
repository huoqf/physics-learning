import { describe, it, expect } from 'vitest';
import {
  vectorAdd,
  vectorSub,
  vectorScale,
  vectorDot,
  vectorCross,
  vectorMagnitude,
  vectorNormalize,
  vectorAngle,
  type Vector2,
} from '@/math/vector';

describe('向量运算', () => {
  describe('vectorAdd', () => {
    it('应该正确计算两个向量的和', () => {
      const a: Vector2 = { x: 1, y: 2 };
      const b: Vector2 = { x: 3, y: 4 };
      const result = vectorAdd(a, b);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('应该正确处理负向量', () => {
      const a: Vector2 = { x: -1, y: -2 };
      const b: Vector2 = { x: 3, y: -4 };
      const result = vectorAdd(a, b);
      expect(result.x).toBe(2);
      expect(result.y).toBe(-6);
    });
  });

  describe('vectorSub', () => {
    it('应该正确计算两个向量的差', () => {
      const a: Vector2 = { x: 5, y: 7 };
      const b: Vector2 = { x: 3, y: 4 };
      const result = vectorSub(a, b);
      expect(result.x).toBe(2);
      expect(result.y).toBe(3);
    });
  });

  describe('vectorScale', () => {
    it('应该正确缩放向量', () => {
      const v: Vector2 = { x: 2, y: 3 };
      const result = vectorScale(v, 2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('应该正确处理负缩放', () => {
      const v: Vector2 = { x: 2, y: 3 };
      const result = vectorScale(v, -1);
      expect(result.x).toBe(-2);
      expect(result.y).toBe(-3);
    });

    it('零缩放应该返回零向量', () => {
      const v: Vector2 = { x: 2, y: 3 };
      const result = vectorScale(v, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('vectorDot', () => {
    it('应该正确计算点积', () => {
      const a: Vector2 = { x: 1, y: 2 };
      const b: Vector2 = { x: 3, y: 4 };
      const result = vectorDot(a, b);
      expect(result).toBe(1 * 3 + 2 * 4);
    });

    it('垂直向量的点积应该为零', () => {
      const a: Vector2 = { x: 1, y: 0 };
      const b: Vector2 = { x: 0, y: 1 };
      const result = vectorDot(a, b);
      expect(result).toBe(0);
    });
  });

  describe('vectorCross', () => {
    it('应该正确计算2D叉积', () => {
      const a: Vector2 = { x: 1, y: 2 };
      const b: Vector2 = { x: 3, y: 4 };
      const result = vectorCross(a, b);
      expect(result).toBe(1 * 4 - 2 * 3);
    });
  });

  describe('vectorMagnitude', () => {
    it('应该正确计算向量模长', () => {
      const v: Vector2 = { x: 3, y: 4 };
      const result = vectorMagnitude(v);
      expect(result).toBe(5);
    });

    it('零向量的模长应该为零', () => {
      const v: Vector2 = { x: 0, y: 0 };
      const result = vectorMagnitude(v);
      expect(result).toBe(0);
    });
  });

  describe('vectorNormalize', () => {
    it('应该正确归一化向量', () => {
      const v: Vector2 = { x: 3, y: 4 };
      const result = vectorNormalize(v);
      const mag = vectorMagnitude(result);
      expect(mag).toBeCloseTo(1);
    });

    it('归一化零向量应该返回零向量', () => {
      const v: Vector2 = { x: 0, y: 0 };
      const result = vectorNormalize(v);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('vectorAngle', () => {
    it('应该正确计算两个向量之间的夹角', () => {
      const a: Vector2 = { x: 1, y: 0 };
      const b: Vector2 = { x: 0, y: 1 };
      const result = vectorAngle(a, b);
      expect(result).toBeCloseTo(Math.PI / 2);
    });

    it('同方向向量的夹角应该为零', () => {
      const a: Vector2 = { x: 1, y: 0 };
      const b: Vector2 = { x: 2, y: 0 };
      const result = vectorAngle(a, b);
      expect(result).toBeCloseTo(0);
    });

    it('与零向量的夹角应该为零', () => {
      const a: Vector2 = { x: 1, y: 0 };
      const b: Vector2 = { x: 0, y: 0 };
      const result = vectorAngle(a, b);
      expect(result).toBe(0);
    });
  });
});

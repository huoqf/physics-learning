import { describe, it, expect } from 'vitest';
import { physicsToCanvas, canvasToPhysics } from '@/utils/coordinate';

describe('坐标转换', () => {
  const canvasWidth = 800;
  const canvasHeight = 600;
  const scale = 10;

  describe('physicsToCanvas', () => {
    it('应该将物理坐标系原点转换为Canvas中心', () => {
      const result = physicsToCanvas(0, 0, canvasWidth, canvasHeight, scale);
      expect(result.cx).toBe(400);
      expect(result.cy).toBe(300);
    });

    it('应该正确转换物理坐标到Canvas坐标（Y轴向上）', () => {
      const result = physicsToCanvas(10, 20, canvasWidth, canvasHeight, scale);
      expect(result.cx).toBe(500);
      expect(result.cy).toBe(100);
    });

    it('应该正确转换负坐标', () => {
      const result = physicsToCanvas(-10, -20, canvasWidth, canvasHeight, scale);
      expect(result.cx).toBe(300);
      expect(result.cy).toBe(500);
    });
  });

  describe('canvasToPhysics', () => {
    it('应该将Canvas中心转换为物理坐标系原点', () => {
      const result = canvasToPhysics(400, 300, canvasWidth, canvasHeight, scale);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('应该正确转换Canvas坐标到物理坐标', () => {
      const result = canvasToPhysics(500, 100, canvasWidth, canvasHeight, scale);
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });
  });

  describe('双向转换', () => {
    it('应该是可逆的 - 转换后再转换回来应该得到原始值', () => {
      const testCases = [
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: -15, y: 25 },
        { x: 30, y: -40 },
        { x: -50, y: -60 },
      ];

      testCases.forEach(({ x, y }) => {
        const canvas = physicsToCanvas(x, y, canvasWidth, canvasHeight, scale);
        const physics = canvasToPhysics(canvas.cx, canvas.cy, canvasWidth, canvasHeight, scale);
        expect(physics.x).toBeCloseTo(x);
        expect(physics.y).toBeCloseTo(y);
      });
    });
  });

  describe('边界条件', () => {
    it('应该正确处理零缩放', () => {
      const result = physicsToCanvas(100, 100, canvasWidth, canvasHeight, 0);
      expect(result.cx).toBe(400);
      expect(result.cy).toBe(300);
    });

    it('应该正确处理零尺寸Canvas', () => {
      const result = physicsToCanvas(10, 10, 0, 0, scale);
      expect(result.cx).toBe(0);
      expect(result.cy).toBe(0);
    });
  });
});

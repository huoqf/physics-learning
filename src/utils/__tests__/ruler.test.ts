import { describe, it, expect } from 'vitest';
import { calculateNiceStep, createRulerTicks } from '../ruler';

describe('Nice-Step Ruler Utilities', () => {
  describe('calculateNiceStep', () => {
    it('should handle standard positive domains with different widths', () => {
      // 0 - 5 米，宽 500 像素，预期最大 tick 数约为 500 / 60 = 8
      const res1 = calculateNiceStep([0, 5], 500);
      expect(res1.tickInterval).toBeGreaterThan(0);
      expect(res1.tickInterval).toBe(1); // 5 / (8-1) = 0.71 -> nice step = 1

      // 0 - 50 米，宽 500 像素
      const res2 = calculateNiceStep([0, 50], 500);
      expect(res2.tickInterval).toBe(10); // 50 / (8-1) = 7.14 -> nice step = 10

      // 0 - 500 米，宽 500 像素
      const res3 = calculateNiceStep([0, 500], 500);
      expect(res3.tickInterval).toBe(100);
    });

    it('should handle domains containing negative values', () => {
      // -10 到 10，宽 400 像素，预期 ticks = 400/60 = 6
      // 20 / 5 = 4 -> nice step = 5
      const res1 = calculateNiceStep([-10, 10], 400);
      expect(res1.tickInterval).toBe(5);

      // -120 到 20，宽 600 像素，范围跨度 140
      const res2 = calculateNiceStep([-120, 20], 600);
      expect(res2.tickInterval).toBe(20); // 140 / 9 = 15.5 -> nice step = 20
    });

    it('should handle reversed domains (start > end)', () => {
      const res1 = calculateNiceStep([50, 0], 500);
      expect(res1.tickInterval).toBe(10);

      const res2 = calculateNiceStep([100, -100], 600);
      expect(res2.tickInterval).toBe(20);
    });

    it('should handle zero or extremely small domains', () => {
      const res1 = calculateNiceStep([0, 0], 500);
      expect(res1.tickInterval).toBe(1);

      const res2 = calculateNiceStep([5, 5], 300);
      expect(res2.tickInterval).toBe(1);
    });
  });

  describe('createRulerTicks', () => {
    it('should generate correct major and minor ticks for standard positive domain', () => {
      const ticks = createRulerTicks([0, 10], 2, 1);
      // step = 2, minorTicks = 1 (每个主刻度中间有 1 个次刻度，步长 = 1)
      // 预期刻度值: 0(major), 1(minor), 2(major), 3(minor), ..., 10(major)
      expect(ticks.length).toBe(11);
      
      expect(ticks[0]).toEqual({ value: 0, isMinor: false, label: '0' });
      expect(ticks[1]).toEqual({ value: 1, isMinor: true, label: '' });
      expect(ticks[2]).toEqual({ value: 2, isMinor: false, label: '2' });
      expect(ticks[10]).toEqual({ value: 10, isMinor: false, label: '10' });
    });

    it('should handle non-zero start alignments', () => {
      // 2 - 8，步长 2
      const ticks = createRulerTicks([2, 8], 2, 0);
      expect(ticks.map(t => t.value)).toEqual([2, 4, 6, 8]);
      expect(ticks.every(t => !t.isMinor)).toBe(true);
    });

    it('should handle domain bounds not perfectly divisible by interval', () => {
      // 1 到 5，步长 2
      const ticks = createRulerTicks([1, 5], 2, 0);
      // 会对齐到 2, 4
      expect(ticks.map(t => t.value)).toEqual([2, 4]);
    });

    it('should handle reversed domain correctly (order of ticks is always sorted ascending for rendering)', () => {
      const ticks = createRulerTicks([10, 0], 5, 0);
      expect(ticks.map(t => t.value)).toEqual([0, 5, 10]);
    });

    it('should handle empty results when interval is non-positive', () => {
      expect(createRulerTicks([0, 10], 0)).toEqual([]);
      expect(createRulerTicks([0, 10], -2)).toEqual([]);
    });
  });
});

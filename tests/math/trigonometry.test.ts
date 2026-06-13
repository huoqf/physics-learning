import { describe, it, expect } from 'vitest';
import {
  degToRad,
  radToDeg,
  sinDeg,
  cosDeg,
  tanDeg,
} from '@/math/trigonometry';

describe('三角函数工具', () => {
  describe('degToRad', () => {
    it('应该将 0° 转换为 0 rad', () => {
      expect(degToRad(0)).toBe(0);
    });

    it('应该将 180° 转换为 π rad', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI, 12);
    });

    it('应该将 90° 转换为 π/2 rad', () => {
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 12);
    });

    it('应该正确处理负角度', () => {
      expect(degToRad(-45)).toBeCloseTo(-Math.PI / 4, 12);
    });

    it('应该正确处理大于 360° 的角度', () => {
      expect(degToRad(450)).toBeCloseTo(5 * Math.PI / 2, 12);
    });
  });

  describe('radToDeg', () => {
    it('应该将 0 rad 转换为 0°', () => {
      expect(radToDeg(0)).toBe(0);
    });

    it('应该将 π rad 转换为 180°', () => {
      expect(radToDeg(Math.PI)).toBeCloseTo(180, 12);
    });

    it('degToRad 和 radToDeg 应互为逆运算', () => {
      const angles = [0, 30, 45, 60, 90, 120, 180, 270, 360];
      for (const deg of angles) {
        expect(radToDeg(degToRad(deg))).toBeCloseTo(deg, 10);
      }
    });
  });

  describe('sinDeg', () => {
    it('sin(0°) = 0', () => {
      expect(sinDeg(0)).toBeCloseTo(0, 10);
    });

    it('sin(30°) = 0.5', () => {
      expect(sinDeg(30)).toBeCloseTo(0.5, 10);
    });

    it('sin(90°) = 1', () => {
      expect(sinDeg(90)).toBeCloseTo(1, 10);
    });

    it('sin(180°) = 0', () => {
      expect(sinDeg(180)).toBeCloseTo(0, 10);
    });

    it('sin(270°) = -1', () => {
      expect(sinDeg(270)).toBeCloseTo(-1, 10);
    });

    it('sin(-30°) = -0.5', () => {
      expect(sinDeg(-30)).toBeCloseTo(-0.5, 10);
    });
  });

  describe('cosDeg', () => {
    it('cos(0°) = 1', () => {
      expect(cosDeg(0)).toBeCloseTo(1, 10);
    });

    it('cos(60°) = 0.5', () => {
      expect(cosDeg(60)).toBeCloseTo(0.5, 10);
    });

    it('cos(90°) = 0', () => {
      expect(cosDeg(90)).toBeCloseTo(0, 10);
    });

    it('cos(180°) = -1', () => {
      expect(cosDeg(180)).toBeCloseTo(-1, 10);
    });

    it('cos(-60°) = 0.5（偶函数）', () => {
      expect(cosDeg(-60)).toBeCloseTo(0.5, 10);
    });
  });

  describe('tanDeg', () => {
    it('tan(0°) = 0', () => {
      expect(tanDeg(0)).toBeCloseTo(0, 10);
    });

    it('tan(45°) = 1', () => {
      expect(tanDeg(45)).toBeCloseTo(1, 10);
    });

    it('tan(60°) = √3', () => {
      expect(tanDeg(60)).toBeCloseTo(Math.sqrt(3), 10);
    });

    it('tan(-45°) = -1（奇函数）', () => {
      expect(tanDeg(-45)).toBeCloseTo(-1, 10);
    });

    it('tan(135°) = -1', () => {
      expect(tanDeg(135)).toBeCloseTo(-1, 10);
    });
  });

  describe('恒等式验证', () => {
    it('sin²θ + cos²θ = 1', () => {
      const angles = [0, 30, 45, 60, 90, 120, 180, 270, 330];
      for (const deg of angles) {
        const sum = sinDeg(deg) ** 2 + cosDeg(deg) ** 2;
        expect(sum).toBeCloseTo(1, 10);
      }
    });

    it('tanθ = sinθ / cosθ（cosθ ≠ 0）', () => {
      const angles = [0, 30, 45, 60, 120, 135, 150];
      for (const deg of angles) {
        const ratio = sinDeg(deg) / cosDeg(deg);
        expect(tanDeg(deg)).toBeCloseTo(ratio, 10);
      }
    });
  });
});

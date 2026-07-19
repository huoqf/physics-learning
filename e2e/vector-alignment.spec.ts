import { test, expect } from '@playwright/test';

/**
 * 矢量箭头对齐测试
 *
 * 验证 PhysicsVectorArrow / VectorArrow 的起点(origin)与被标注物体的位置一致。
 * 这些页面曾经存在 originDesign 被误传入物理坐标的问题，导致矢量箭头偏离物体。
 */

const FIXED_ANIMATIONS = [
  { id: 'anim-binary-stars', name: '双星与多星系统', objects: ['star1', 'star2'] },
  { id: 'anim-man-boat', name: '人船模型', objects: ['person1', 'boat'] },
  { id: 'anim-spring-blocks', name: '弹簧滑块', objects: ['blockA', 'blockB'] },
  { id: 'anim-momentum-conservation', name: '动量守恒', objects: ['ballA', 'ballB'] },
  { id: 'anim-vertical-circular', name: '竖直圆周运动', objects: ['ball'] },
  { id: 'anim-centripetal', name: '向心力', objects: ['ball'] },
  { id: 'anim-satellite', name: '卫星运动', objects: ['satellite'] },
  { id: 'anim-collision', name: '碰撞', objects: ['ballA', 'ballB'] },
];

for (const anim of FIXED_ANIMATIONS) {
  test.describe(`${anim.name} (${anim.id})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`http://localhost:5173/#/animation/${anim.id}`);
      // 等待动画加载：SVG 画布出现且包含物体
      await page.waitForSelector('svg', { timeout: 15000 });
      // 额外等待动画帧渲染
      await page.waitForTimeout(2000);
    });

    test('截图：矢量箭头应与标注物体对齐', async ({ page }) => {
      // 截图中屏画布区域，用于人工或视觉回归核对
      const canvas = page.locator('svg').first();
      await expect(canvas).toHaveScreenshot(`${anim.id}-vector-alignment.png`, {
        maxDiffPixels: 100,
      });
    });
  });
}

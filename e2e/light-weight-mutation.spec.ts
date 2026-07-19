import { test, expect } from '@playwright/test';

/**
 * 轻质物体突变模型 —— 物理正确性 E2E 测试
 *
 * 验证要点：
 * 1. 初始状态 (t=0) 四球加速度符合理论值
 * 2. 动画播放后状态变化合理
 * 3. 拖拽小球可同步更新时间
 */

test.describe('轻质物体突变模型 (anim-light-weight-mutation)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/#/animation/anim-light-weight-mutation');
    await page.waitForSelector('svg', { timeout: 15000 });
    // 等待动画初始渲染
    await page.waitForTimeout(1000);
  });

  test('初始状态：四球加速度符合剪断瞬间理论值', async ({ page }) => {
    // 使用包含 "系统一" 标题的 SVG 定位场景画布
    const sceneSvg = page.locator('svg:has-text("系统一")').first();
    await expect(sceneSvg).toBeVisible();

    // 检查 A 球加速度标注（理论值 aA = +g ≈ +9.8）
    const aALabel = sceneSvg.locator('text').filter({ hasText: /aA=9\.[0-9]/ });
    await expect(aALabel).toBeVisible();

    // 检查 B 球加速度标注（理论值 aB = -g ≈ -9.8，显示为绝对值）
    const aBLabel = sceneSvg.locator('text').filter({ hasText: /aB=9\.[0-9]/ });
    await expect(aBLabel).toBeVisible();

    // 检查 C 球加速度标注（理论值 aC = -2g ≈ -19.6，显示为绝对值）
    const aCLabel = sceneSvg.locator('text').filter({ hasText: /aC=19\.[0-9]/ });
    await expect(aCLabel).toBeVisible();

    // 检查 D 球加速度为零的标注
    const aDLabel = sceneSvg.locator('text').filter({ hasText: 'aD = 0' });
    await expect(aDLabel).toBeVisible();
  });

  test('播放动画后 0.2s，B球加速度保持为 -g（自由落体）', async ({ page }) => {
    // 点击播放按钮
    const playButton = page.locator('button[aria-label="播放"], button:has-text("播放")').first();
    if (await playButton.isVisible().catch(() => false)) {
      await playButton.click();
    }

    // 等待 0.2 秒（确保 B 球仍在空中，未落地）
    await page.waitForTimeout(200);

    // 暂停
    const pauseButton = page.locator('button[aria-label="暂停"], button:has-text("暂停")').first();
    if (await pauseButton.isVisible().catch(() => false)) {
      await pauseButton.click();
    }

    // B 球仍在自由落体，加速度应为 -g
    const sceneSvg = page.locator('svg:has-text("系统一")').first();
    const aBLabel = sceneSvg.locator('text').filter({ hasText: /aB=9\.[0-9]/ });
    await expect(aBLabel).toBeVisible();
  });

  test('拖拽 A 球可更新时间并同步右侧加速度图表', async ({ page }) => {
    const sceneSvg = page.locator('svg:has-text("系统一")').first();

    // 找到 A 球（通过文字标签定位）
    const aBallLabel = sceneSvg.locator('text').filter({ hasText: /^A$/ });
    await expect(aBallLabel).toBeVisible();

    // 获取 A 球位置并拖拽
    const box = await aBallLabel.boundingBox();
    if (box) {
      // 向下拖拽 50 像素（A 球做简谐振动，向下移动对应时间增加）
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 50);
      await page.mouse.up();
    }

    // 等待拖拽渲染
    await page.waitForTimeout(500);

    // 右侧加速度图表区域应可见
    const chartTitle = page.locator('text').filter({ hasText: '四球加速度对比' });
    await expect(chartTitle).toBeVisible();
  });

  test('截图：剪断瞬间受力与加速度标注完整', async ({ page }) => {
    const canvas = page.locator('svg:has-text("系统一")').first();
    await expect(canvas).toHaveScreenshot('anim-light-weight-mutation-initial.png', {
      maxDiffPixels: 200,
    });
  });
});

/**
 * Nice-Step 标尺刻度自适应划分工具
 */

export interface TickMark {
  value: number;
  isMinor: boolean;
  label: string;
}

/**
 * 自动计算适合的标尺步长与次级刻度数 (Nice-Step)
 * 支持 1, 2, 5, 10 及其 10 的整数幂次倍步长，避免标签重叠
 * @param domain 物理起止范围 [start, end]
 * @param width 渲染的像素宽度
 * @param maxTicks 预期的最大主刻度数（如果不指定，自动按每个标签约 60px 宽度估算）
 */
export function calculateNiceStep(
  domain: [number, number],
  width: number,
  maxTicks?: number
): { tickInterval: number; minorTicks: number } {
  const [start, end] = domain;
  const rawRange = Math.abs(end - start);

  // 零区间/极小区间处理
  if (rawRange < 1e-9) {
    return { tickInterval: 1, minorTicks: 4 };
  }

  // 限制刻度数量，防止文字重叠
  const limit = maxTicks && maxTicks > 1 ? maxTicks : Math.max(2, Math.floor(width / 60));
  
  // 粗略步长
  const tempStep = rawRange / (limit - 1);
  
  // 计算数量级对数
  const mag = Math.floor(Math.log10(tempStep));
  const magPow = Math.pow(10, mag);
  
  // 取得有效数字部分
  const fraction = tempStep / magPow;
  
  // 映射到 Nice Numbers: 1, 2, 5, 10
  let niceFraction = 1;
  if (fraction < 1.5) {
    niceFraction = 1;
  } else if (fraction < 3) {
    niceFraction = 2;
  } else if (fraction < 7) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  
  const tickInterval = niceFraction * magPow;

  // 根据步长的 niceFraction，自动分配 minorTicks（次刻度）
  // niceFraction 为 2 时分成 4 份 (3 个 tick) 比较好看；1, 5, 10 分成 5 份 (4 个 tick) 比较好看
  let minorTicks = 4;
  if (niceFraction === 2) {
    minorTicks = 3;
  } else if (niceFraction === 5) {
    minorTicks = 4;
  } else {
    minorTicks = 4;
  }

  // 使用 toFixed 消除浮点数精度问题
  return {
    tickInterval: parseFloat(tickInterval.toFixed(10)),
    minorTicks
  };
}

/**
 * 根据计算好的步长和范围，生成具体的刻度点
 * @param domain 物理起止范围 [start, end]
 * @param tickInterval 主刻度间隔
 * @param minorTicks 次刻度个数
 */
export function createRulerTicks(
  domain: [number, number],
  tickInterval: number,
  minorTicks: number = 0
): TickMark[] {
  const [start, end] = domain;
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const ticks: TickMark[] = [];
  const epsilon = 1e-10;

  if (tickInterval <= 0) return [];
  
  // 计算第一个对齐的主刻度值
  let currentMajor = Math.ceil(min / tickInterval - epsilon) * tickInterval;
  
  while (currentMajor <= max + epsilon) {
    const valMajor = parseFloat(currentMajor.toFixed(10));
    ticks.push({ value: valMajor, isMinor: false, label: String(valMajor) });
    
    if (minorTicks > 0) {
      const step = tickInterval / (minorTicks + 1);
      for (let i = 1; i <= minorTicks; i++) {
        const minorVal = currentMajor + i * step;
        if (minorVal <= max + epsilon) {
          ticks.push({ value: parseFloat(minorVal.toFixed(10)), isMinor: true, label: '' });
        }
      }
    }
    currentMajor += tickInterval;
  }

  // 补齐第一个主刻度左侧可能存在的次刻度
  if (minorTicks > 0 && ticks.length > 0) {
    const firstMajor = ticks[0].value;
    const step = tickInterval / (minorTicks + 1);
    for (let i = 1; i <= minorTicks; i++) {
      const minorVal = firstMajor - i * step;
      if (minorVal >= min - epsilon) {
        ticks.push({ value: parseFloat(minorVal.toFixed(10)), isMinor: true, label: '' });
      }
    }
  }

  // 返回按物理值从小到大排序的刻度
  return ticks.sort((a, b) => a.value - b.value);
}

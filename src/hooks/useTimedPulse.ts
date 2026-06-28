import { useState, useEffect } from 'react';

/**
 * 控制临界瞬时动效闪烁的自定义 Hook
 * @param trigger 触发源（例如 isAtPeak, isCollision 等状态布尔值）
 * @param durationMs 闪烁持续时间，默认 3000ms
 */
export function useTimedPulse(trigger: boolean, durationMs: number = 3000): boolean {
  const [shouldPulse, setShouldPulse] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShouldPulse(true);
      const timer = setTimeout(() => {
        setShouldPulse(false);
      }, durationMs);
      return () => clearTimeout(timer);
    } else {
      setShouldPulse(false);
    }
  }, [trigger, durationMs]);

  return shouldPulse;
}

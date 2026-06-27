import type { ModeResult } from '../types'
import { rk4Step } from '@/math/numerical'

/** 模式9: 收尾变力运动 — 恒定功率启动(F=P/v - f) 或 电磁感应单杆(F_dirve - kf*v) */
export function calcTerminalVariableForce(
  t: number,
  v0: number,
  m: number,
  firstParam: number,
  secondParam: number,
  mode: 'power' | 'drag'
): ModeResult {
  const dt = 0.005
  const steps = Math.floor(t / dt)

  let y = 0
  let vy = v0

  if (mode === 'power') {
    for (let i = 0; i < steps; i++) {
      const deriv = (_tStep: number, state: number[]) => {
        const v = Math.max(Math.abs(state[1]), 0.01)
        const F = firstParam / v - secondParam
        return [state[1], F / m]
      }
      const state = [y, vy]
      const next = rk4Step(deriv, i * dt, state, dt)
      y = next[0]
      vy = next[1]
    }
    const rem = t - steps * dt
    if (rem > 0) {
      const deriv = (_tStep: number, state: number[]) => {
        const v = Math.max(Math.abs(state[1]), 0.01)
        const F = firstParam / v - secondParam
        return [state[1], F / m]
      }
      const state = [y, vy]
      const next = rk4Step(deriv, steps * dt, state, rem)
      y = next[0]
      vy = next[1]
    }
  } else {
    for (let i = 0; i < steps; i++) {
      const deriv = (_tStep: number, state: number[]) => {
        const F = firstParam - secondParam * state[1]
        return [state[1], F / m]
      }
      const state = [y, vy]
      const next = rk4Step(deriv, i * dt, state, dt)
      y = next[0]
      vy = next[1]
    }
    const rem = t - steps * dt
    if (rem > 0) {
      const deriv = (_tStep: number, state: number[]) => {
        const F = firstParam - secondParam * state[1]
        return [state[1], F / m]
      }
      const state = [y, vy]
      const next = rk4Step(deriv, steps * dt, state, rem)
      y = next[0]
      vy = next[1]
    }
  }

  const v = Math.abs(vy)
  const terminalVelocity = firstParam / secondParam

  const isTerminal = Math.abs(v - terminalVelocity) < 0.05

  const ay = (mode === 'power')
    ? (firstParam / Math.max(v, 0.01) - secondParam * (vy >= 0 ? 1 : -1)) / m
    : (firstParam - secondParam * vy) / m

  const Fy = m * ay

  return {
    x: 0,
    y,
    vx: 0,
    vy,
    ax: 0,
    ay,
    Fx: 0,
    Fy,
    work: 0.5 * m * vy * vy - 0.5 * m * v0 * v0,
    impulse: m * (vy - v0),
    terminalVelocity,
    isTerminal,
    pauseReason: isTerminal ? 'terminal' : undefined,
  }
}

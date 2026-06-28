import { AnimationConfig } from './types'

export function defineAnimations<T extends Record<string, AnimationConfig>>(
  configs: { [K in keyof T]: Omit<T[K], 'id'> }
): { [K in keyof T]: T[K] & { id: K & string } } {
  return Object.fromEntries(
    Object.entries(configs).map(([id, config]) => [id, { ...config, id }])
  ) as { [K in keyof T]: T[K] & { id: K & string } }
}

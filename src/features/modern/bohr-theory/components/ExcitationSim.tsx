import type { ExcitationSimProps } from './types'
import { useExcitationSimulation } from '../hooks/useExcitationSimulation'

export default function ExcitationSim(props: ExcitationSimProps) {
  const { containerRef, canvasRef } = useExcitationSimulation(props)

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      <div className="absolute top-3 left-4 z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-100/50 shadow-sm">
        <span className="text-sm font-medium text-neutral-700">激发与退激辐射物理对比仿真</span>
      </div>
      <div ref={containerRef} className="flex-1 w-full min-h-0 bg-neutral-50 rounded-xl overflow-hidden relative">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
    </div>
  )
}

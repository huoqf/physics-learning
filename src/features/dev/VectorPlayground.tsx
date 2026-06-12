import { VectorArrow } from '../../components/Physics/VectorArrow';
import { VectorDefs } from '../../components/Physics/VectorDefs';
import { createSceneScale } from '../../scene/SceneScale';
import type { SceneConfig } from '../../scene/SceneConfig';
import { VECTOR_COLORS, type VectorType } from '../../theme/physics/vectorStyle';

const TEST_SCENE: SceneConfig = {
  worldWidth: 20,
  worldHeight: 12,
  vectorBounds: { x: 50, y: 50, width: 600, height: 350 },
  originX: 100,
  originY: 250,
};

interface TestCase {
  type: VectorType;
  vector: { x: number; y: number };
  label: string;
}

const TEST_CASES: TestCase[] = [
  { type: 'velocity', vector: { x: 5, y: 0 }, label: 'v=5m/s →' },
  { type: 'velocity', vector: { x: -3, y: 3 }, label: 'v=3√2 ↖' },
  { type: 'force', vector: { x: 20, y: 0 }, label: 'F=20N →' },
  { type: 'gravity', vector: { x: 0, y: -9.8 }, label: 'G=9.8N ↓' },
  { type: 'acceleration', vector: { x: 3, y: 4 }, label: 'a=5m/s² ↗' },
  { type: 'electricField', vector: { x: 0, y: 6 }, label: 'E=6 ↑' },
];

const USED_COLORS = [...new Set(TEST_CASES.map((tc) => VECTOR_COLORS[tc.type]))];

export default function VectorPlayground() {
  const sceneScale = createSceneScale(TEST_SCENE);

  return (
    <div style={{ padding: 20 }}>
      <h2 className="text-lg font-bold mb-4">Vector Rendering Playground</h2>
      <svg
        width={700}
        height={450}
        style={{ border: '1px solid #ccc', background: '#fafafa' }}
      >
        <VectorDefs colors={USED_COLORS} />

        {/* coordinate axes */}
        <line x1={TEST_SCENE.originX} y1={20} x2={TEST_SCENE.originX} y2={430}
          stroke="#999" strokeWidth={1} strokeDasharray="4" />
        <line x1={20} y1={TEST_SCENE.originY} x2={680} y2={TEST_SCENE.originY}
          stroke="#999" strokeWidth={1} strokeDasharray="4" />

        {TEST_CASES.map((tc, i) => (
          <VectorArrow
            key={i}
            origin={{ x: 2 + i * 2.5, y: 0 }}
            vector={tc.vector}
            type={tc.type}
            sceneScale={sceneScale}
          />
        ))}

        {/* legend */}
        {TEST_CASES.map((tc, i) => (
          <text key={`label-${i}`}
            x={520} y={80 + i * 25}
            fontSize={13} fill="#333">
            {tc.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

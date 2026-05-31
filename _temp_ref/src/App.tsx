import { useRef, useEffect, useState, useCallback } from "react";

// ─── Physics helpers ───────────────────────────────────────────────────────────

interface Charge {
  x: number;   // canvas coords (pixels)
  y: number;
  q: number;   // sign * magnitude  (e.g. +2, -1)
}

function electricField(charges: Charge[], px: number, py: number) {
  let ex = 0,
    ey = 0;
  for (const c of charges) {
    const dx = px - c.x;
    const dy = py - c.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1) continue;
    const r = Math.sqrt(r2);
    const mag = c.q / r2;
    ex += mag * (dx / r);
    ey += mag * (dy / r);
  }
  return { ex, ey };
}

function potential(charges: Charge[], px: number, py: number) {
  let v = 0;
  for (const c of charges) {
    const dx = px - c.x;
    const dy = py - c.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < 1) continue;
    v += c.q / r;
  }
  return v;
}

// ─── Drawing helpers ───────────────────────────────────────────────────────────

const FIELD_LINE_STEP = 3;        // px per RK4 step
const MAX_FIELD_STEPS = 3000;
const ARROW_INTERVAL = 60;        // px between arrowheads
const CHARGE_RADIUS = 18;

/**
 * Trace one field line from (sx, sy) using RK4 integration.
 * direction: +1 follows E, -1 reverses (used for negative charge starts).
 */
function traceFieldLine(
  charges: Charge[],
  sx: number,
  sy: number,
  direction: 1 | -1,
  width: number,
  height: number
): { points: [number, number][]; arrowAt: [number, number, number][] } {
  const points: [number, number][] = [[sx, sy]];
  const arrowAt: [number, number, number][] = []; // [x, y, angle]
  let x = sx,
    y = sy;
  let distSinceArrow = 0;

  const step = (px: number, py: number) => {
    const { ex, ey } = electricField(charges, px, py);
    const mag = Math.sqrt(ex * ex + ey * ey);
    if (mag === 0) return { dx: 0, dy: 0 };
    return {
      dx: (direction * ex) / mag,
      dy: (direction * ey) / mag,
    };
  };

  for (let i = 0; i < MAX_FIELD_STEPS; i++) {
    const k1 = step(x, y);
    const k2 = step(x + 0.5 * FIELD_LINE_STEP * k1.dx, y + 0.5 * FIELD_LINE_STEP * k1.dy);
    const k3 = step(x + 0.5 * FIELD_LINE_STEP * k2.dx, y + 0.5 * FIELD_LINE_STEP * k2.dy);
    const k4 = step(x + FIELD_LINE_STEP * k3.dx, y + FIELD_LINE_STEP * k3.dy);

    const dx = (FIELD_LINE_STEP / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
    const dy = (FIELD_LINE_STEP / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);

    x += dx;
    y += dy;

    // Stop if out of bounds
    if (x < -20 || x > width + 20 || y < -20 || y > height + 20) break;

    // Stop if too close to any charge
    let nearCharge = false;
    for (const c of charges) {
      const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2);
      if (d < CHARGE_RADIUS * 0.85) {
        nearCharge = true;
        break;
      }
    }
    if (nearCharge) break;

    points.push([x, y]);
    distSinceArrow += FIELD_LINE_STEP;
    if (distSinceArrow >= ARROW_INTERVAL) {
      arrowAt.push([x, y, Math.atan2(dy, dx)]);
      distSinceArrow = 0;
    }
  }
  return { points, arrowAt };
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size = 7
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.45);
  ctx.lineTo(-size, size * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── Main component ────────────────────────────────────────────────────────────

interface ChargeConfig {
  sign: 1 | -1;
  magnitude: number; // 1–5
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Controls
  const [charge1, setCharge1] = useState<ChargeConfig>({ sign: 1, magnitude: 2 });
  const [charge2, setCharge2] = useState<ChargeConfig>({ sign: -1, magnitude: 2 });
  const [separation, setSeparation] = useState(220); // px between charges
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showEquipotential, setShowEquipotential] = useState(true);
  const [numLines, setNumLines] = useState(16); // field lines per unit charge

  // ── Draw ────────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(1, "#1e293b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid (faint)
    ctx.strokeStyle = "rgba(148,163,184,0.07)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Charge positions
    const cx = W / 2;
    const cy = H / 2;
    const charges: Charge[] = [
      { x: cx - separation / 2, y: cy, q: charge1.sign * charge1.magnitude },
      { x: cx + separation / 2, y: cy, q: charge2.sign * charge2.magnitude },
    ];

    // ── Equipotential lines ────────────────────────────────────────────────
    if (showEquipotential) {
      // Sample potential values across the canvas to determine range
      const samplePots: number[] = [];
      const sampleStep = 20;
      for (let sx = 0; sx < W; sx += sampleStep) {
        for (let sy = 0; sy < H; sy += sampleStep) {
          let skip = false;
          for (const c of charges) {
            if (Math.sqrt((sx - c.x) ** 2 + (sy - c.y) ** 2) < CHARGE_RADIUS * 1.5) {
              skip = true; break;
            }
          }
          if (!skip) samplePots.push(potential(charges, sx, sy));
        }
      }
      samplePots.sort((a, b) => a - b);
      const pMin = samplePots[Math.floor(samplePots.length * 0.05)];
      const pMax = samplePots[Math.floor(samplePots.length * 0.95)];

      // Draw marching-squares-style equipotential lines at evenly spaced V levels
      const numContours = 20;
      const equipColors = [
        "#22d3ee", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa",
        "#c084fc", "#e879f9", "#f472b6", "#fb7185", "#fbbf24",
      ];

      const gridStep = 6;
      const cols = Math.floor(W / gridStep);
      const rows = Math.floor(H / gridStep);

      // Pre-compute potential grid
      const potGrid: number[][] = [];
      for (let r = 0; r <= rows; r++) {
        potGrid[r] = [];
        for (let c2 = 0; c2 <= cols; c2++) {
          potGrid[r][c2] = potential(charges, c2 * gridStep, r * gridStep);
        }
      }

      for (let ci = 0; ci < numContours; ci++) {
        const t = (ci + 0.5) / numContours;
        const targetV = pMin + t * (pMax - pMin);
        const color = equipColors[Math.floor((t * (equipColors.length - 1)))];

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([6, 5]);

        // Simple marching squares: find edges where potential crosses targetV
        for (let r = 0; r < rows; r++) {
          for (let c2 = 0; c2 < cols; c2++) {
            const v00 = potGrid[r][c2];
            const v10 = potGrid[r][c2 + 1];
            const v01 = potGrid[r + 1][c2];
            const v11 = potGrid[r + 1][c2 + 1];

            // Skip cells near charges
            const cellCx = (c2 + 0.5) * gridStep;
            const cellCy = (r + 0.5) * gridStep;
            let nearAny = false;
            for (const ch of charges) {
              if (Math.sqrt((cellCx - ch.x) ** 2 + (cellCy - ch.y) ** 2) < CHARGE_RADIUS * 2) {
                nearAny = true; break;
              }
            }
            if (nearAny) continue;

            const interp = (a: number, b: number) =>
              gridStep * ((targetV - a) / (b - a));

            const x0 = c2 * gridStep;
            const y0 = r * gridStep;

            // Collect crossing points on each edge
            const pts: [number, number][] = [];
            if ((v00 < targetV) !== (v10 < targetV)) pts.push([x0 + interp(v00, v10), y0]);
            if ((v10 < targetV) !== (v11 < targetV)) pts.push([x0 + gridStep, y0 + interp(v10, v11)]);
            if ((v01 < targetV) !== (v11 < targetV)) pts.push([x0 + interp(v01, v11), y0 + gridStep]);
            if ((v00 < targetV) !== (v01 < targetV)) pts.push([x0, y0 + interp(v00, v01)]);

            if (pts.length === 2) {
              ctx.beginPath();
              ctx.moveTo(pts[0][0], pts[0][1]);
              ctx.lineTo(pts[1][0], pts[1][1]);
              ctx.stroke();
            }
          }
        }
      }

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // ── Field lines ────────────────────────────────────────────────────────
    if (showFieldLines) {
      // For each positive charge, emit lines outward
      // For each negative charge, lines are attracted inward
      // Strategy: emit from positive charges, attract into negatives.
      // If both same sign, emit from both.

      const allLines: {
        points: [number, number][];
        arrowAt: [number, number, number][];
        color: string;
      }[] = [];

      const posColor = "rgba(255,100,80,0.92)";
      const negColor = "rgba(80,160,255,0.92)";

      const emitFromCharge = (
        charge: Charge,
        dir: 1 | -1,
        lineCount: number,
        color: string
      ) => {
        const startR = CHARGE_RADIUS + 2;
        for (let i = 0; i < lineCount; i++) {
          const angle = (2 * Math.PI * i) / lineCount;
          const sx = charge.x + startR * Math.cos(angle);
          const sy = charge.y + startR * Math.sin(angle);
          const result = traceFieldLine(charges, sx, sy, dir, W, H);
          allLines.push({ ...result, color });
        }
      };

      charges.forEach((ch) => {
        const lineCount = Math.round((Math.abs(ch.q) / Math.max(...charges.map(c => Math.abs(c.q)))) * numLines);
        const lc = Math.max(4, lineCount);
        if (ch.q > 0) {
          emitFromCharge(ch, 1, lc, posColor);
        } else {
          emitFromCharge(ch, -1, lc, negColor);
        }
      });

      for (const line of allLines) {
        if (line.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(line.points[0][0], line.points[0][1]);
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i][0], line.points[i][1]);
        }
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.85;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Arrow heads
        ctx.fillStyle = line.color;
        for (const [ax, ay, angle] of line.arrowAt) {
          drawArrowHead(ctx, ax, ay, angle, 7);
        }
      }
    }

    // ── Draw charges ────────────────────────────────────────────────────────
    charges.forEach((ch, idx) => {
      const isPos = ch.q > 0;
      const color = isPos ? "#ef4444" : "#3b82f6";
      const glowColor = isPos ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.5)";

      // Glow
      const grd = ctx.createRadialGradient(ch.x, ch.y, 2, ch.x, ch.y, CHARGE_RADIUS * 2.5);
      grd.addColorStop(0, glowColor);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(ch.x, ch.y, CHARGE_RADIUS * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(ch.x, ch.y, CHARGE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Symbol (+/−)
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isPos ? "+" : "−", ch.x, ch.y);

      // Label
      const label = `q${idx + 1} = ${ch.q > 0 ? "+" : ""}${ch.q}μC`;
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = isPos ? "#fca5a5" : "#93c5fd";
      ctx.fillText(label, ch.x, ch.y + CHARGE_RADIUS + 16);
    });

    // ── Legend ──────────────────────────────────────────────────────────────
    const lx = 14, ly = 14;
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.beginPath();
    ctx.roundRect(lx, ly, 200, showFieldLines && showEquipotential ? 76 : 52, 8);
    ctx.fill();

    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    if (showFieldLines) {
      ctx.fillStyle = "#f87171";
      ctx.fillRect(lx + 10, ly + 14, 22, 3);
      ctx.fillStyle = "#fff";
      ctx.fillText("电场线（箭头示方向）", lx + 38, ly + 15);
    }
    if (showEquipotential) {
      const oy = showFieldLines ? 36 : 14;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(lx + 10, ly + oy + 1);
      ctx.lineTo(lx + 32, ly + oy + 1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff";
      ctx.fillText("等势面（虚线）", lx + 38, ly + oy);
    }

    const ruleY = showFieldLines && showEquipotential ? ly + 58 : ly + 36;
    ctx.fillStyle = "rgba(148,163,184,0.6)";
    ctx.font = "11px sans-serif";
    ctx.fillText("垂直相交：电场线 ⊥ 等势面", lx + 10, ruleY);
  }, [charge1, charge2, separation, showFieldLines, showEquipotential, numLines]);

  // Resize & redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement!;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const SliderRow = ({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    unit = "",
    color = "violet",
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    unit?: string;
    color?: string;
  }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-mono text-white font-semibold">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer accent-${color}-400`}
        style={{ accentColor: color === "red" ? "#f87171" : color === "blue" ? "#60a5fa" : "#a78bfa" }}
      />
    </div>
  );

  const SignToggle = ({
    sign,
    onChange,
  }: {
    sign: 1 | -1;
    onChange: (s: 1 | -1) => void;
  }) => (
    <div className="flex gap-1">
      <button
        onClick={() => onChange(1)}
        className={`flex-1 py-1 rounded-md text-sm font-bold transition-all ${
          sign === 1
            ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
        }`}
      >
        正电荷 +
      </button>
      <button
        onClick={() => onChange(-1)}
        className={`flex-1 py-1 rounded-md text-sm font-bold transition-all ${
          sign === -1
            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
        }`}
      >
        负电荷 −
      </button>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-white overflow-hidden">
      {/* ── Control Panel ── */}
      <aside className="md:w-72 w-full flex-shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4 flex flex-col gap-5">
        {/* Title */}
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">
            ⚡ 电场线与等势面
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">高中物理交互演示</p>
        </div>

        <hr className="border-slate-700" />

        {/* Charge 1 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <span className="inline-flex w-6 h-6 rounded-full bg-red-500 items-center justify-center text-xs font-bold">
              q₁
            </span>
            电荷 1
          </h2>
          <SignToggle
            sign={charge1.sign}
            onChange={(s) => setCharge1((c) => ({ ...c, sign: s }))}
          />
          <SliderRow
            label="电量大小"
            value={charge1.magnitude}
            min={1}
            max={5}
            onChange={(v) => setCharge1((c) => ({ ...c, magnitude: v }))}
            unit=" μC"
            color="red"
          />
        </section>

        <hr className="border-slate-700" />

        {/* Charge 2 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
            <span className="inline-flex w-6 h-6 rounded-full bg-blue-500 items-center justify-center text-xs font-bold">
              q₂
            </span>
            电荷 2
          </h2>
          <SignToggle
            sign={charge2.sign}
            onChange={(s) => setCharge2((c) => ({ ...c, sign: s }))}
          />
          <SliderRow
            label="电量大小"
            value={charge2.magnitude}
            min={1}
            max={5}
            onChange={(v) => setCharge2((c) => ({ ...c, magnitude: v }))}
            unit=" μC"
            color="blue"
          />
        </section>

        <hr className="border-slate-700" />

        {/* Separation */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-violet-400">间距设置</h2>
          <SliderRow
            label="两电荷间距"
            value={separation}
            min={80}
            max={400}
            step={10}
            onChange={setSeparation}
            unit=" px"
            color="violet"
          />
        </section>

        <hr className="border-slate-700" />

        {/* Display */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-emerald-400">显示设置</h2>
          <SliderRow
            label="电场线数量"
            value={numLines}
            min={6}
            max={28}
            step={2}
            onChange={setNumLines}
            unit=" 条"
            color="violet"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFieldLines}
              onChange={(e) => setShowFieldLines(e.target.checked)}
              className="w-4 h-4 rounded accent-red-400"
            />
            <span className="text-sm text-slate-200">显示电场线</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showEquipotential}
              onChange={(e) => setShowEquipotential(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-400"
            />
            <span className="text-sm text-slate-200">显示等势面</span>
          </label>
        </section>

        <hr className="border-slate-700" />

        {/* Physics notes */}
        <section className="flex flex-col gap-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300 text-sm">物理知识点</p>
          <div className="bg-slate-800 rounded-lg p-3 space-y-2 leading-relaxed">
            <p>📌 <span className="text-yellow-300">电场线</span>从正电荷出发，终止于负电荷（或延伸到无穷远）</p>
            <p>📌 <span className="text-cyan-300">等势面</span>上各点电势相等，相邻等势面之间电势差相等</p>
            <p>📌 电场线与等势面处处<span className="text-green-300">垂直相交</span></p>
            <p>📌 电场线密集处电场强，稀疏处电场弱</p>
            <p>📌 带正电荷顺着电场线方向移动，<span className="text-orange-300">电势能减小</span></p>
          </div>
        </section>
      </aside>

      {/* ── Canvas ── */}
      <main className="flex-1 relative min-h-0">
        <canvas ref={canvasRef} className="w-full h-full block" />
        {/* Floating info */}
        <div className="absolute bottom-3 right-3 text-xs text-slate-500 select-none">
          点击左侧控制面板调整参数
        </div>
      </main>
    </div>
  );
}

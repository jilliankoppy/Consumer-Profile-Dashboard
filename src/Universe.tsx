import { useEffect, useRef, useState } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  type SimulationNodeDatum,
} from "d3-force";
import type { RecordEntry } from "./analysis";
import { summarize, domain } from "./analysis";
type Node = SimulationNodeDatum & {
  id: string;
  label: string;
  color: string;
  size: number;
  records: RecordEntry[];
};
export function Universe({
  records,
  onSelect,
  search = "",
  large = false,
}: {
  records: RecordEntry[];
  onSelect: (records: RecordEntry[], label: string) => void;
  search?: string;
  large?: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<
    { source: Node; target: Node; weight: number }[]
  >([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ node?: Node; x: number; y: number } | null>(null);
  useEffect(() => {
    const s = summarize(records);
    const ns: Node[] = [
      {
        id: "you",
        label: records.length ? "YOUR ACTIVITY" : "YOUR UNIVERSE",
        color: "#e0ddf7",
        size: 27,
        records,
        x: 400,
        y: 245,
      },
    ];
    const ls: any[] = [];
    s.interests.forEach((c, i) => {
      ns.push({
        id: c.name,
        label: c.name.toUpperCase(),
        color: c.color,
        size: 12 + Math.min(15, c.records.length),
        records: c.records,
        x: 400 + Math.cos(i * 1.05) * 160,
        y: 245 + Math.sin(i * 1.05) * 150,
      });
      ls.push({ source: "you", target: c.name, weight: c.records.length });
      const ds = [
        ...new Set(c.records.filter((r) => r.url).map((r) => domain(r.url))),
      ].slice(0, 8);
      ds.forEach((d) => {
        const id = c.name + d;
        ns.push({
          id,
          label: d,
          color: c.color,
          size:
            5 +
            Math.min(6, c.records.filter((r) => domain(r.url) === d).length),
          records: c.records.filter((r) => domain(r.url) === d),
        });
        ls.push({
          source: c.name,
          target: id,
          weight: c.records.filter((r) => domain(r.url) === d).length,
        });
      });
    });
    const sim = forceSimulation(ns)
      .force(
        "link",
        forceLink(ls)
          .id((n: any) => n.id)
          .distance((l: any) => (l.source.id === "you" ? 140 : 70)),
      )
      .force("charge", forceManyBody().strength(-160))
      .force("center", forceCenter(400, 245))
      .force("collide", forceCollide(32))
      .on("tick", () => {
        setNodes([...ns]);
        setLinks([...ls]);
      });
    return () => {
      sim.stop();
    };
  }, [records]);
  return (
    <div className={"universe " + (large ? "large" : "")}>
      <div className="graph-grid" />
      <svg
        ref={svg}
        viewBox="0 0 800 490"
        role="img"
        aria-label="Interest network. Drag nodes to explore, use buttons to zoom."
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx =
            ((e.clientX - drag.current.x) * 800) /
            (svg.current?.clientWidth || 800) /
            zoom;
          const dy =
            ((e.clientY - drag.current.y) * 490) /
            (svg.current?.clientHeight || 490) /
            zoom;
          if (drag.current.node) {
            drag.current.node.fx = (drag.current.node.x ?? 400) + dx;
            drag.current.node.fy = (drag.current.node.y ?? 245) + dy;
            drag.current.node.x = drag.current.node.fx;
            drag.current.node.y = drag.current.node.fy;
            setNodes([...nodes]);
          } else setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
          drag.current.x = e.clientX;
          drag.current.y = e.clientY;
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        onPointerDown={(e) => {
          if (e.target === svg.current) {
            drag.current = { x: e.clientX, y: e.clientY };
            svg.current.setPointerCapture(e.pointerId);
          }
        }}
      >
        <defs>
          <radialGradient id="aura">
            <stop stopColor="#a899ff" stopOpacity=".14" />
            <stop offset="1" stopColor="#a899ff" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <g
          transform={`translate(${400 + pan.x},${245 + pan.y}) scale(${zoom}) translate(-400,-245)`}
        >
          <circle cx="400" cy="245" r="220" fill="url(#aura)" />
          {[90, 160, 225].map((r) => (
            <circle
              key={r}
              cx="400"
              cy="245"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeOpacity=".07"
              strokeDasharray="3 7"
            />
          ))}
          {links.map((l, i) => (
            <line
              key={i}
              x1={l.source.x}
              y1={l.source.y}
              x2={l.target.x}
              y2={l.target.y}
              stroke={l.target.color}
              strokeOpacity=".25"
              strokeWidth={Math.min(4, 0.6 + Math.sqrt(l.weight) * 0.3)}
            />
          ))}
          {nodes.map((n) => (
            <g
              key={n.id}
              tabIndex={0}
              role="button"
              aria-label={n.label}
              style={{
                cursor: "pointer",
                opacity:
                  search &&
                  !n.label.toLowerCase().includes(search.toLowerCase())
                    ? 0.18
                    : 1,
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && onSelect(n.records, n.label)
              }
              onClick={() => onSelect(n.records, n.label)}
              onPointerDown={(e) => {
                e.stopPropagation();
                drag.current = { node: n, x: e.clientX, y: e.clientY };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
            >
              <title>
                {n.label} · {n.records.length} records
              </title>
              <circle
                cx={n.x}
                cy={n.y}
                r={n.size + 7}
                fill={n.color}
                opacity=".06"
              />
              <circle
                cx={n.x}
                cy={n.y}
                r={n.size}
                fill={n.id === "you" ? "#27233c" : n.color}
                fillOpacity={n.id === "you" ? 1 : 0.75}
                stroke={n.color}
                strokeWidth={n.id === "you" ? 1 : 0.5}
              />
              {n.id === "you" && (
                <text
                  x={n.x}
                  y={(n.y ?? 0) + 5}
                  textAnchor="middle"
                  fill="#dbd4ff"
                  fontSize="18"
                >
                  ✦
                </text>
              )}
              <text
                x={n.x}
                y={(n.y ?? 0) + n.size + 18}
                fill={n.color}
                fontSize={n.id === "you" ? 9 : 8}
                letterSpacing={n.id === "you" ? 2 : 1}
                textAnchor="middle"
              >
                {n.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <div className="graph-tools">
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
        >
          +
        </button>
        <button
          aria-label="Reset graph view"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          ↺
        </button>
      </div>
      {records.length === 0 && (
        <div className="graph-empty">
          <span>Possibilities, waiting to connect.</span>
          <p>Your real activity will bring this universe to life.</p>
        </div>
      )}
      <div className="graph-caption">
        <span className="live-dot" /> {nodes.length - 1} connected nodes{" "}
        <span>•</span> LOCAL ANALYSIS
      </div>
    </div>
  );
}

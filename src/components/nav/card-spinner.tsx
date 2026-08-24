import { useEffect, useRef, useState } from "react";
import type { SpinnerNode } from "@/lib/nav-tree";
import { cn } from "@/lib/utils";

type Props = {
  nodes: SpinnerNode[];
  activeId?: string;
  sub?: boolean;
  onPick: (node: SpinnerNode) => void;
  onInteract?: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function frontDistance(angle: number) {
  const n = normalizeAngle(angle);
  return Math.min(n, 360 - n);
}

export function CardSpinner({ nodes, activeId, sub, onPick, onInteract }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rotation = useRef(0);
  const velocity = useRef(0);
  const tilt = useRef(-8);
  const dragging = useRef(false);
  const dragged = useRef(false);
  const start = useRef({ x: 0, y: 0, rot: 0, tilt: -8, t: 0, prevRot: 0 });
  const [front, setFront] = useState(0);
  const downIndex = useRef<number | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ring = ringRef.current;
    if (!ring) return;
    let last = performance.now();
    let raf = 0;

    const render = () => {
      ring.style.transform = `rotateX(${tilt.current}deg) rotateY(${rotation.current}deg)`;
      const count = nodes.length || 1;
      let best = 0;
      let closest = Infinity;
      nodes.forEach((_, index) => {
        const visual = (360 / count) * index + rotation.current;
        const d = frontDistance(visual);
        if (d < closest - 0.5) {
          closest = d;
          best = index;
        }
      });
      setFront((prev) => (prev === best ? prev : best));
    };

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (!dragging.current && !reduced.current) {
        if (Math.abs(velocity.current) > 0.001) {
          rotation.current += velocity.current * delta;
          velocity.current *= 0.94;
        } else {
          velocity.current = 0;
          rotation.current += delta * 0.012;
        }
        render();
      }
      raf = requestAnimationFrame(tick);
    };

    render();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [nodes.length]);

  function bump() {
    onInteract?.();
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    dragged.current = false;
    const card = (event.target as HTMLElement | null)?.closest(".orbit-card");
    const label = card?.getAttribute("aria-label");
    downIndex.current = label ? nodes.findIndex((n) => n.label === label) : null;
    if (downIndex.current === -1) downIndex.current = null;
    start.current = {
      x: event.clientX,
      y: event.clientY,
      rot: rotation.current,
      tilt: tilt.current,
      t: event.timeStamp || performance.now(),
      prevRot: rotation.current,
    };
    velocity.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
    bump();
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    const threshold = event.pointerType === "mouse" ? 16 : 10;
    if (Math.hypot(dx, dy) > threshold) dragged.current = true;
    rotation.current = start.current.rot + dx * 0.35;
    const now = event.timeStamp || performance.now();
    const elapsed = Math.max(1, now - start.current.t);
    velocity.current = clamp((rotation.current - start.current.prevRot) / elapsed, -0.18, 0.18);
    start.current.prevRot = rotation.current;
    start.current.t = now;
    tilt.current = clamp(start.current.tilt - dy * 0.15, -18, -2);
    if (ringRef.current) {
      ringRef.current.style.transform = `rotateX(${tilt.current}deg) rotateY(${rotation.current}deg)`;
    }
    bump();
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!dragged.current && downIndex.current != null) {
      const index = downIndex.current;
      const node = nodes[index];
      if (node) activate(index, node);
    }
    downIndex.current = null;
  }

  function activate(index: number, node: SpinnerNode) {
    if (dragged.current) return;
    const count = nodes.length || 1;
    const base = (360 / count) * index;
    rotation.current = -base;
    velocity.current = 0;
    if (ringRef.current) {
      ringRef.current.style.transform = `rotateX(${tilt.current}deg) rotateY(${rotation.current}deg)`;
    }
    setFront(index);
    onPick(node);
    bump();
  }

  const count = nodes.length || 1;

  return (
    <div
      ref={stageRef}
      className={cn("orbit-stage", sub && "orbit-stage--sub")}
      aria-label={sub ? "Folder spinner" : "Table spinner"}
    >
      {!sub ? <p className="orbit-guidance">Drag the deck</p> : null}
      <button
        type="button"
        className="orbit-hub"
        aria-label="Penny"
        onClick={() => {
          bump();
          if (sub) return;
          const penny = nodes.find((n) => n.penny);
          if (penny) onPick(penny);
        }}
      >
        <img src="/brand/penny.jpg" alt="" />
      </button>
      <div
        className="orbit-drag"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div ref={ringRef} className="orbit-ring">
          {nodes.map((node, index) => {
            const angle = (360 / count) * index;
            const isFront = index === front || node.id === activeId;
            return (
              <button
                key={node.id}
                type="button"
                className={cn("orbit-card", node.penny && "penny", isFront && "is-front")}
                style={{
                  transform: `translate(-50%, -50%) rotateY(${angle}deg) translateZ(var(--orbit-depth))`,
                }}
                aria-label={node.label}
                onClick={(event) => {
                  event.preventDefault();
                  if (!dragged.current) activate(index, node);
                }}
              >
                {node.penny ? (
                  <img src="/brand/penny-still.jpg" alt="" className="orbit-card-media" />
                ) : (
                  <span className="orbit-card-face" data-suit={node.id.split("-")[0] ?? node.id} />
                )}
                <span className="card-corner card-corner--top">
                  <span>{node.rank}</span>
                  <img src="/brand/penny-mark.png" alt="" />
                </span>
                <span className="card-corner card-corner--bottom">
                  <span>{node.rank}</span>
                  <img src="/brand/penny-mark.png" alt="" />
                </span>
                <span className="orbit-label">{node.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { create as createQr } from "qrcode";
import { EASY_QR, PUBLIC_MEETINGS_URL } from "@/lib/easy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/penny-spade.jpg";
const EXPORT_PX = 1600;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo"));
    img.src = src;
  });
}

function drawSpadePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / 64;
  ctx.save();
  ctx.translate(cx - 32 * s, cy - 34 * s);
  ctx.scale(s, s);
  ctx.fillStyle = "#f472b6";
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.bezierCurveTo(40, 16, 54, 24, 54, 38);
  ctx.bezierCurveTo(54, 46, 48, 52, 40, 52);
  ctx.bezierCurveTo(36, 52, 33, 50.5, 32, 48);
  ctx.bezierCurveTo(32, 54, 35, 60, 40, 64);
  ctx.lineTo(24, 64);
  ctx.bezierCurveTo(29, 60, 32, 54, 32, 48);
  ctx.bezierCurveTo(31, 50.5, 28, 52, 24, 52);
  ctx.bezierCurveTo(16, 52, 10, 46, 10, 38);
  ctx.bezierCurveTo(10, 24, 24, 16, 32, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export async function paintEasyQr(
  canvas: HTMLCanvasElement,
  url: string,
  logo: HTMLImageElement | null,
) {
  const size = canvas.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const qr = createQr(url, { errorCorrectionLevel: EASY_QR.errorCorrection });
  const n = qr.modules.size;
  const quiet = 3;
  const total = n + quiet * 2;
  const cell = Math.floor(size / total);
  const shift = Math.floor((size - cell * total) / 2);
  const holeR = (n * EASY_QR.holeRatio) / 2;
  const mid = (n - 1) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#07060c";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.modules.get(r, c)) continue;
      const dx = r - mid;
      const dy = c - mid;
      const finder = (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
      if (!finder && dx * dx + dy * dy < holeR * holeR) continue;
      const x = shift + (c + quiet) * cell;
      const y = shift + (r + quiet) * cell;
      ctx.fillRect(x, y, cell, cell);
    }
  }

  const badge = holeR * 2 * cell * 1.08;
  const cx = size / 2;
  const cy = size / 2;

  ctx.beginPath();
  ctx.arc(cx, cy, badge / 2 + cell * 1.2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const g = ctx.createRadialGradient(cx - badge * 0.18, cy - badge * 0.22, badge * 0.1, cx, cy, badge / 2);
  g.addColorStop(0, "#ff9ad4");
  g.addColorStop(0.45, "#f472b6");
  g.addColorStop(1, "#9d174d");
  ctx.beginPath();
  ctx.arc(cx, cy, badge / 2, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, badge / 2 - cell * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = "#07060c";
  ctx.fill();

  const inner = badge * 0.62;
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy - cell * 0.4, inner / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, cx - inner / 2, cy - inner / 2 - cell * 0.4, inner, inner);
    ctx.restore();
  } else {
    drawSpadePath(ctx, cx, cy - cell, inner * 0.85);
  }

  ctx.fillStyle = "#f472b6";
  ctx.font = `700 ${Math.max(18, Math.floor(badge * 0.11))}px "Outfit", "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EASY", cx, cy + badge * 0.32);
}

function saveHref(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

type Props = {
  url?: string;
  className?: string;
};

export function EasyButtonQr({ url = PUBLIC_MEETINGS_URL, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = EXPORT_PX;
      canvas.height = EXPORT_PX;
      let logo: HTMLImageElement | null = null;
      try {
        logo = await loadImage(LOGO_SRC);
      } catch {
        logo = null;
      }
      if (cancelled) return;
      try {
        await paintEasyQr(canvas, url, logo);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError("Could not draw the code.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "the-spade-easy-button.png";
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  }

  function printPoster() {
    window.print();
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="easy-bezel mx-auto grid size-[min(92vw,640px)] place-items-center p-[14%] print:size-[5.2in] print:p-[0.85in]">
        <div className="grid size-full place-items-center bg-white p-[3%]">
          <canvas
            ref={canvasRef}
            width={EXPORT_PX}
            height={EXPORT_PX}
            className={cn("size-full", !ready && "opacity-0")}
            aria-label={`QR code to ${url}`}
          />
        </div>
      </div>
      {error ? <p className="text-center text-sm text-danger">{error}</p> : null}
      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <Button onClick={download} disabled={!ready} variant="pink">
          Download QR
        </Button>
        <Button onClick={() => saveHref("/brand/easy-button-mock.jpg", "the-spade-easy-mock.jpg")} variant="outline">
          Download mock-up
        </Button>
        <Button onClick={() => saveHref("/brand/easy-poster.jpg", "the-spade-easy-poster.jpg")} variant="outline">
          Download poster
        </Button>
        <Button onClick={printPoster} disabled={!ready} variant="ghost">
          Print
        </Button>
      </div>
    </div>
  );
}

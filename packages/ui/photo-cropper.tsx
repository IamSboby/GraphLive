"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Scan, X, Check, Crop } from "lucide-react";
import { useTranslation } from "react-i18next";
type Frame = { x: number; y: number; size: number };
type Corner = "nw" | "ne" | "sw" | "se";
const limit = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export function PhotoCropper({
  bitmap,
  onApply,
  onCancel,
}: {
  bitmap: ImageBitmap;
  onApply: (value: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const initial = (): Frame => {
    const size = Math.min(bitmap.width, bitmap.height);
    return {
      x: (bitmap.width - size) / 2,
      y: (bitmap.height - size) / 2,
      size,
    };
  };
  const [frame, setFrame] = useState<Frame>(initial);
  const [error, setError] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    frame: Frame;
    corner?: Corner;
  } | null>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx)
      ctx.drawImage(
        bitmap,
        0,
        0,
        canvas.current!.width,
        canvas.current!.height,
      );
  }, [bitmap]);
  const start = (e: PointerEvent<HTMLDivElement>, corner?: Corner) => {
    if (e.button !== 0 || drag.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      frame,
      corner,
    };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current,
      box = stage.current?.getBoundingClientRect();
    if (!d || d.id !== e.pointerId || !box) return;
    const dx = ((e.clientX - d.x) * bitmap.width) / box.width;
    const dy = ((e.clientY - d.y) * bitmap.height) / box.height;
    if (!d.corner) {
      setFrame({
        ...d.frame,
        x: limit(d.frame.x + dx, 0, bitmap.width - d.frame.size),
        y: limit(d.frame.y + dy, 0, bitmap.height - d.frame.size),
      });
      return;
    }
    const west = d.corner.includes("w"),
      north = d.corner.includes("n");
    const ax = d.frame.x + (west ? d.frame.size : 0);
    const ay = d.frame.y + (north ? d.frame.size : 0);
    const delta = ((west ? -dx : dx) + (north ? -dy : dy)) / 2;
    const size = limit(
      d.frame.size + delta,
      Math.min(bitmap.width, bitmap.height) * 0.1,
      Math.min(west ? ax : bitmap.width - ax, north ? ay : bitmap.height - ay),
    );
    setFrame({ x: west ? ax - size : ax, y: north ? ay - size : ay, size });
  };
  const end = () => {
    drag.current = null;
  };
  return (
    <div className="photo-cropper" role="group" aria-label={t("cropPhoto")}>
      <strong className="crop-heading">
        <Crop size={18} aria-hidden="true" />
        {t("cropPhoto")}
      </strong>
      <p>{t("cropHelp")}</p>
      <div
        ref={stage}
        className="crop-stage"
        style={{
          aspectRatio: `${bitmap.width}/${bitmap.height}`,
          width: `min(100%, ${(360 * bitmap.width) / bitmap.height}px)`,
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <canvas
          ref={canvas}
          width={Math.round(
            bitmap.width *
              Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)),
          )}
          height={Math.round(
            bitmap.height *
              Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)),
          )}
          role="img"
          aria-label={t("cropPreview")}
        />
        <div
          className="crop-frame"
          role="button"
          tabIndex={0}
          aria-label={t("cropMove")}
          style={{
            left: `${(frame.x / bitmap.width) * 100}%`,
            top: `${(frame.y / bitmap.height) * 100}%`,
            width: `${(frame.size / bitmap.width) * 100}%`,
            height: `${(frame.size / bitmap.height) * 100}%`,
          }}
          onPointerDown={(e) => start(e)}
          onKeyDown={(e) => {
            const step =
              Math.min(bitmap.width, bitmap.height) *
              (e.shiftKey ? 0.05 : 0.01);
            if (
              !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key,
              )
            )
              return;
            e.preventDefault();
            setFrame((f) => ({
              ...f,
              x: limit(
                f.x +
                  (e.key === "ArrowLeft"
                    ? -step
                    : e.key === "ArrowRight"
                      ? step
                      : 0),
                0,
                bitmap.width - f.size,
              ),
              y: limit(
                f.y +
                  (e.key === "ArrowUp"
                    ? -step
                    : e.key === "ArrowDown"
                      ? step
                      : 0),
                0,
                bitmap.height - f.size,
              ),
            }));
          }}
        >
          <span className="crop-grid" aria-hidden="true" />
          {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
            <div
              key={c}
              className={`crop-handle crop-handle-${c}`}
              role="button"
              tabIndex={0}
              aria-label={`${t("cropResize")} (${c})`}
              onPointerDown={(e) => start(e, c)}
              onKeyDown={(e) => {
                if (
                  !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                    e.key,
                  )
                )
                  return;
                e.preventDefault();
                e.stopPropagation();
                const change = ["ArrowUp", "ArrowRight"].includes(e.key)
                  ? 1
                  : -1;
                setFrame((f) => ({
                  ...f,
                  size: limit(
                    f.size +
                      change * Math.min(bitmap.width, bitmap.height) * 0.02,
                    Math.min(bitmap.width, bitmap.height) * 0.1,
                    Math.min(bitmap.width - f.x, bitmap.height - f.y),
                  ),
                }));
              }}
            />
          ))}
        </div>
      </div>
      <div className="crop-actions">
        <button type="button" onClick={() => setFrame(initial())}>
          <Scan size={18} aria-hidden="true" />
          {t("cropReset")}
        </button>
        <button type="button" onClick={onCancel}>
          <X size={18} aria-hidden="true" />
          {t("cancel")}
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            const output = document.createElement("canvas");
            output.width = 256;
            output.height = 256;
            const ctx = output.getContext("2d");
            if (!ctx) {
              setError(true);
              return;
            }
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, 256, 256);
            ctx.drawImage(
              bitmap,
              frame.x,
              frame.y,
              frame.size,
              frame.size,
              0,
              0,
              256,
              256,
            );
            for (const quality of [0.85, 0.7, 0.5, 0.3]) {
              const result = output.toDataURL("image/jpeg", quality);
              if (result.length <= 120000) {
                onApply(result);
                return;
              }
            }
            setError(true);
          }}
        >
          <Check size={18} aria-hidden="true" />
          {t("cropApply")}
        </button>
      </div>
      {error && <p role="alert">{t("imageTooLarge")}</p>}
    </div>
  );
}

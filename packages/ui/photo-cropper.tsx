"use client";
import { useEffect, useRef, useState } from "react";
import { Scan, X, Check, Crop } from "lucide-react";
import { useTranslation } from "react-i18next";
const clamp = (n: number) => Math.max(0, Math.min(1, n));
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
  const [zoom, setZoom] = useState(1),
    [x, setX] = useState(0.5),
    [y, setY] = useState(0.5),
    [error, setError] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const side = Math.min(bitmap.width, bitmap.height) / zoom;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 256);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) * x,
      (bitmap.height - side) * y,
      side,
      side,
      0,
      0,
      256,
      256,
    );
  }, [bitmap, side, x, y]);
  return (
    <div className="photo-cropper" role="group" aria-label={t("cropPhoto")}>
      <strong className="crop-heading">
        <Crop size={18} aria-hidden="true" />
        {t("cropPhoto")}
      </strong>
      <p>{t("cropHelp")}</p>
      <canvas
        ref={canvas}
        width={256}
        height={256}
        role="img"
        aria-label={t("cropPreview")}
        onPointerDown={(e) => {
          if (e.button !== 0 || drag.current) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start || start.id !== e.pointerId) return;
          const factor = side / e.currentTarget.getBoundingClientRect().width;
          if (bitmap.width > side)
            setX((v) =>
              clamp(
                v - ((e.clientX - start.x) * factor) / (bitmap.width - side),
              ),
            );
          if (bitmap.height > side)
            setY((v) =>
              clamp(
                v - ((e.clientY - start.y) * factor) / (bitmap.height - side),
              ),
            );
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (drag.current?.id === e.pointerId) drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      />
      <label>
        {t("cropZoom")}
        <input
          type="range"
          min="1"
          max="4"
          step="0.01"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
      </label>
      <label>
        {t("cropHorizontal")}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={x}
          disabled={bitmap.width <= side}
          onChange={(e) => setX(Number(e.target.value))}
        />
      </label>
      <label>
        {t("cropVertical")}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={y}
          disabled={bitmap.height <= side}
          onChange={(e) => setY(Number(e.target.value))}
        />
      </label>
      <div className="crop-actions">
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setX(0.5);
            setY(0.5);
          }}
        >
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
            for (const quality of [0.85, 0.7, 0.5, 0.3]) {
              const result = canvas.current?.toDataURL("image/jpeg", quality);
              if (result && result.length <= 120000) {
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

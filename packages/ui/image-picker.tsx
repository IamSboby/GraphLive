"use client";
import Image from "next/image";
import { ImagePlus, Trash2, LoaderCircle } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PhotoCropper } from "./photo-cropper";
import { prepareImage, readImage } from "./image-processing";
export function ImagePicker({
  kind,
  value,
  onChange,
  disabled = false,
  onBusy,
}: {
  kind: "portrait" | "banner";
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  onBusy?: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [crop, setCrop] = useState<ImageBitmap | null>(null);
  useEffect(() => () => crop?.close(), [crop]);
  const sequence = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  return (
    <section className={`image-picker ${kind}`}>
      <strong>
        {t(kind === "portrait" ? "personPhoto" : "networkBanner")}
      </strong>
      {value && (
        <Image
          unoptimized
          src={value}
          width={kind === "portrait" ? 96 : 480}
          height={kind === "portrait" ? 96 : 160}
          alt={t(kind === "portrait" ? "personPhoto" : "networkBanner")}
        />
      )}
      <div className="image-upload-control">
        <button
          type="button"
          className="image-upload-button"
          disabled={disabled || busy || Boolean(crop)}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus size={20} aria-hidden="true" />
          {t("chooseImage")}
        </button>
        <input
          ref={fileInput}
          hidden
          aria-label={t("chooseImage")}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy || Boolean(crop)}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const request = ++sequence.current;
            setBusy(true);
            onBusy?.(true);
            setError("");
            try {
              if (kind === "portrait") {
                const bitmap = await readImage(file);
                if (sequence.current === request) setCrop(bitmap);
                else bitmap.close();
              } else {
                const result = await prepareImage(file, kind);
                if (sequence.current === request) onChange(result);
              }
            } catch (error) {
              if (sequence.current === request) onBusy?.(false);
              if (sequence.current === request)
                setError(
                  error instanceof Error ? error.message : "imageInvalid",
                );
            } finally {
              if (sequence.current === request) {
                setBusy(false);
                if (kind !== "portrait") onBusy?.(false);
              }
            }
          }}
        />
      </div>
      {crop && (
        <PhotoCropper
          bitmap={crop}
          onCancel={() => {
            setCrop(null);
            onBusy?.(false);
          }}
          onApply={(result) => {
            onChange(result);
            setCrop(null);
            onBusy?.(false);
          }}
        />
      )}
      <small>{t(kind === "portrait" ? "portraitHelp" : "imageHelp")}</small>
      {value && (
        <button
          type="button"
          disabled={disabled || busy || Boolean(crop)}
          onClick={() => onChange(undefined)}
        >
          <Trash2 size={16} aria-hidden="true" />
          {t("removeImage")}
        </button>
      )}
      {busy && (
        <p role="status" className="image-loading">
          <LoaderCircle size={16} aria-hidden="true" />
          {t("loading")}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
    </section>
  );
}

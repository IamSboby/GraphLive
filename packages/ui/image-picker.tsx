"use client";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { prepareImage } from "./image-processing";
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
  const sequence = useRef(0);
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
      <label>
        {t("chooseImage")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const request = ++sequence.current;
            setBusy(true);
            onBusy?.(true);
            setError("");
            try {
              const result = await prepareImage(file, kind);
              if (sequence.current === request) onChange(result);
            } catch (error) {
              if (sequence.current === request)
                setError(
                  error instanceof Error ? error.message : "imageInvalid",
                );
            } finally {
              if (sequence.current === request) {
                setBusy(false);
                onBusy?.(false);
              }
            }
          }}
        />
      </label>
      <small>{t("imageHelp")}</small>
      {value && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => onChange(undefined)}
        >
          {t("removeImage")}
        </button>
      )}
      {busy && <p role="status">{t("loading")}</p>}
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
    </section>
  );
}

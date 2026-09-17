"use client";
import Image from "next/image";
import { countryCodes, flagUrl } from "./flags";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, type ReactNode } from "react";
import { normalize } from "../domain/model";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className={"modal " + (wide ? "wide" : "")}
          aria-describedby={undefined}
        >
          <header className="modal-header">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label={t("close")}>
              <X size={20} />
            </Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function TagInput({
  label,
  value,
  onChange,
  suggestions = [],
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
}) {
  const { t } = useTranslation(),
    [input, setInput] = useState("");
  return (
    <div className="field">
      <label>
        {label}
        <input
          value={input}
          placeholder={t("tagHelp")}
          list={label + "-tags"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = input.trim();
              if (v && !value.some((s) => normalize(s) === normalize(v)))
                onChange([...value, v]);
              setInput("");
            }
          }}
        />
      </label>
      <datalist id={label + "-tags"}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="chips">
        {value.map((v) => (
          <button
            key={v}
            type="button"
            className="chip"
            aria-label={t("removeTag", { tag: v })}
            onClick={() => onChange(value.filter((x) => x !== v))}
          >
            {v}
            <X size={12} />
          </button>
        ))}
      </div>
    </div>
  );
}
export function CountryPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { t, i18n } = useTranslation();
  const names = new Intl.DisplayNames([i18n.language], { type: "region" });
  const countries = countryCodes.map((code) => ({
    code,
    name: names.of(code) ?? code,
  }));
  return (
    <div className="field">
      <label>
        {t("nationalities")}
        <select
          aria-label={t("chooseCountry")}
          value=""
          onChange={(e) => {
            if (e.target.value && !value.includes(e.target.value))
              onChange([...value, e.target.value]);
          }}
        >
          <option value="">{t("chooseCountry")}</option>
          {countries
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <option value={c.code} key={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
        </select>
      </label>
      <div className="chips">
        {value.map((code) => (
          <button
            type="button"
            className="chip"
            key={code}
            onClick={() => onChange(value.filter((v) => v !== code))}
          >
            <Flag code={code} />
            {names.of(code)}
            <X size={12} />
          </button>
        ))}
      </div>
    </div>
  );
}
export function Flag({ code }: { code: string }) {
  const { i18n } = useTranslation();
  return (
    <Image
      className="flag-icon"
      src={flagUrl(code)}
      width={24}
      height={18}
      unoptimized
      alt={
        new Intl.DisplayNames([i18n.language], { type: "region" }).of(code) ??
        code
      }
    />
  );
}

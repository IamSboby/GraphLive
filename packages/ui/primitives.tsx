"use client";
import Image from "next/image";
import { countryCodes, flagUrl } from "./flags";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useId, useState, type ReactNode } from "react";
import { normalize } from "../domain/model";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
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
          className={"modal " + (wide ? "wide" : "") + " " + className}
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => {
            if (
              event.target instanceof Element &&
              event.target.matches(
                '.country-picker input[aria-expanded="true"]',
              )
            )
              event.preventDefault();
          }}
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
  onDraftChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  onDraftChange: (value: string) => void;
}) {
  const { t } = useTranslation(),
    [input, setInput] = useState("");
  const commit = () => {
    const v = input.trim();
    if (
      v &&
      value.length < 100 &&
      !value.some((s) => normalize(s) === normalize(v))
    )
      onChange([...value, v]);
    setInput("");
    onDraftChange("");
  };
  return (
    <div className="field">
      <label>
        {label}
        <input
          value={input}
          maxLength={200}
          placeholder={t("tagHelp")}
          list={label + "-tags"}
          onChange={(e) => {
            setInput(e.target.value);
            onDraftChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              commit();
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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const names = new Intl.DisplayNames([i18n.language], { type: "region" });
  const countries = countryCodes.map((code) => ({
    code,
    name: names.of(code) ?? code,
  }));
  const matches = countries
    .filter(
      (c) =>
        !value.includes(c.code) &&
        normalize(c.name + " " + c.code).includes(normalize(query)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, i18n.language));
  const choose = (code: string) => {
    if (value.length < 20 && !value.includes(code)) onChange([...value, code]);
    setQuery("");
    setActive(0);
    setOpen(false);
  };
  return (
    <div className="field">
      <div
        className="country-picker"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        <label>
          {t("nationalities")}
          <input
            role="combobox"
            aria-label={t("chooseCountry")}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={
              open && matches[active]
                ? listId + "-" + matches[active].code
                : undefined
            }
            placeholder={t("chooseCountry")}
            value={query}
            disabled={value.length >= 20}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") {
                e.preventDefault();
                if (open && matches[active]) choose(matches[active].code);
                else setOpen(true);
              } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setOpen(true);
                const next = Math.max(
                  0,
                  Math.min(
                    matches.length - 1,
                    active + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                );
                setActive(next);
                document
                  .getElementById(listId + "-" + matches[next]?.code)
                  ?.scrollIntoView({ block: "nearest" });
              } else if (e.key === "Escape" && open) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              } else if (e.key === "Tab") setOpen(false);
            }}
          />
        </label>
        {open && (
          <div
            id={listId}
            role="listbox"
            aria-label={t("chooseCountry")}
            className="country-options"
          >
            {matches.map((c, index) => (
              <button
                type="button"
                role="option"
                tabIndex={-1}
                id={listId + "-" + c.code}
                key={c.code}
                aria-selected={index === active}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(c.code)}
              >
                <span aria-hidden="true">
                  <Flag code={c.code} />
                </span>
                {c.name} ({c.code})
              </button>
            ))}
          </div>
        )}
      </div>
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

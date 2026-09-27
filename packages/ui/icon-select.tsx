"use client";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { languageNames, resolveLanguage } from "../i18n/languages";
type Props = Omit<ComponentProps<"select">, "onChange"> & {
  kind: "language" | "theme";
  onChange?: (event: { target: { value: string } }) => void;
};
function SelectorSymbol({
  kind,
  value,
}: {
  kind: Props["kind"];
  value: string;
}) {
  if (kind === "language")
    return (
      <svg
        className="selector-symbol language-flag"
        width="24"
        height="16"
        viewBox="0 0 24 16"
        aria-hidden="true"
        focusable="false"
        data-language={value}
      >
        {value === "es" ? (
          <>
            <path fill="#c8102e" d="M0 0h24v16H0z" />
            <path fill="#ffcc00" d="M0 4h24v8H0z" />
          </>
        ) : value === "it" || value === "fr" ? (
          <>
            <path fill="#fff" d="M0 0h24v16H0z" />
            <path
              fill={value === "it" ? "#009246" : "#002395"}
              d="M0 0h8v16H0z"
            />
            <path fill="#ed2939" d="M16 0h8v16h-8z" />
          </>
        ) : value === "de" ? (
          <>
            <path fill="#ffce00" d="M0 0h24v16H0z" />
            <path fill="#d00" d="M0 0h24v10.667H0z" />
            <path fill="#151515" d="M0 0h24v5.333H0z" />
          </>
        ) : value === "pt" ? (
          <>
            <path fill="#e5222d" d="M0 0h24v16H0z" />
            <path fill="#006b3f" d="M0 0h9.6v16H0z" />
          </>
        ) : (
          <>
            <path fill="#192586" d="M0 0h24v16H0z" />
            <path stroke="#fff" strokeWidth="4" d="m0 0 24 16M24 0 0 16" />
            <path stroke="#c8102e" strokeWidth="1.5" d="m0 0 24 16M24 0 0 16" />
            <path stroke="#fff" strokeWidth="6" d="M12 0v16M0 8h24" />
            <path stroke="#c8102e" strokeWidth="3" d="M12 0v16M0 8h24" />
          </>
        )}
      </svg>
    );
  const Icon = value === "dark" ? Moon : value === "light" ? Sun : Monitor;
  return <Icon className="selector-symbol" size={18} aria-hidden="true" />;
}
export function IconSelect({
  kind,
  className = "",
  children,
  value,
  disabled,
  onChange,
  "aria-label": label,
}: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndex = useRef(0);
  const id = useId();
  const items = Children.toArray(children).flatMap((child) =>
    isValidElement<ComponentProps<"option">>(child)
      ? [{ value: String(child.props.value), label: child.props.children }]
      : [],
  );
  const selected = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  useEffect(() => {
    if (!open) return;
    options.current[focusIndex.current]?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const show = (index = selected) => {
    focusIndex.current = index;
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "Tab" && open) {
      close();
      return;
    }
    const current = options.current.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let next: number | undefined;
    if (event.key === "ArrowDown")
      next = open ? (current + 1) % items.length : selected;
    if (event.key === "ArrowUp")
      next = open ? (current - 1 + items.length) % items.length : selected;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    if (event.key.length === 1 && event.key !== " ") {
      const match = items.findIndex((item) =>
        String(item.label)
          .toLocaleLowerCase()
          .startsWith(event.key.toLocaleLowerCase()),
      );
      if (match >= 0) next = match;
    }
    if (next !== undefined && !disabled) {
      event.preventDefault();
      if (open) options.current[next]?.focus();
      else show(next);
    }
  }
  return (
    <div
      ref={root}
      className={`icon-select ${className}`}
      onKeyDown={keyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        role="combobox"
        className="icon-select-trigger"
        data-kind={kind}
        title={
          kind === "language"
            ? languageNames[resolveLanguage(value)]
            : undefined
        }
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        aria-controls={id}
        disabled={disabled}
        data-value={value}
        onClick={() => (open ? close() : show())}
      >
        <SelectorSymbol key={String(value)} kind={kind} value={String(value)} />
        {kind !== "language" && (
          <>
            <span className="selector-label">{items[selected]?.label}</span>
            <ChevronDown
              className="selector-chevron"
              size={13}
              aria-hidden="true"
            />
          </>
        )}
      </button>
      {open && !disabled && (
        <div
          id={id}
          role="listbox"
          aria-label={label}
          className="icon-select-menu"
        >
          {items.map((item, index) => {
            return (
              <button
                key={item.value}
                ref={(element) => {
                  options.current[index] = element;
                }}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={item.value === value}
                data-value={item.value}
                onClick={() => {
                  close();
                  onChange?.({ target: { value: item.value } });
                }}
              >
                <SelectorSymbol kind={kind} value={item.value} />
                <span>{item.label}</span>
                {item.value === value && (
                  <Check
                    size={15}
                    className="selector-check"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

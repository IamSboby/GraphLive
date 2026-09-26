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
import {
  Check,
  ChevronDown,
  Languages,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
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
  const Icon =
    kind === "language"
      ? Languages
      : value === "dark"
        ? Moon
        : value === "light"
          ? Sun
          : Monitor;
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
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        aria-controls={id}
        disabled={disabled}
        data-value={value}
        onClick={() => (open ? close() : show())}
      >
        <SelectorSymbol key={String(value)} kind={kind} value={String(value)} />
        <span className="selector-label">{items[selected]?.label}</span>
        <ChevronDown
          className="selector-chevron"
          size={13}
          aria-hidden="true"
        />
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
                <span>
                  {kind === "language"
                    ? item.value === "es"
                      ? "Español"
                      : "English"
                    : item.label}
                </span>
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

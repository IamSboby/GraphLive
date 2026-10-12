"use client";
import { useEffect, useId, useState } from "react";
import { Palette, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { relationshipTypes, type RelationshipType } from "../domain/model";
export function Legend({
  colors,
  hidden = false,
}: {
  hidden?: boolean;
  colors: Record<RelationshipType, string>;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);
  const id = useId();
  const { t } = useTranslation();
  return (
    <section
      className="legend"
      data-open={open && !hidden}
      data-hidden={hidden}
      aria-hidden={hidden}
      inert={hidden}
    >
      <button
        type="button"
        className="legend-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <Palette size={17} aria-hidden="true" />
        {t("legend")}
        <ChevronDown className="legend-chevron" size={15} aria-hidden="true" />
      </button>
      <div className="legend-motion" id={id} aria-hidden={!open}>
        <div className="legend-clip">
          <div className="legend-content">
            {relationshipTypes.map((r) => (
              <span className="legend-item" key={r}>
                <i
                  className={r === "married" ? "married-swatch" : undefined}
                  style={{ background: colors[r], color: colors[r] }}
                />
                {t(r)}
              </span>
            ))}
            <p>{t("legendHelp")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

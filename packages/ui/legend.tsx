"use client";
import { useId, useState } from "react";
import { Palette, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { relationshipTypes, type RelationshipType } from "../domain/model";
export function Legend({
  colors,
}: {
  colors: Record<RelationshipType, string>;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const { t } = useTranslation();
  return (
    <section className="legend" data-open={open}>
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
                <i style={{ background: colors[r] }} />
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

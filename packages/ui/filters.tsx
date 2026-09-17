"use client";
import { useTranslation } from "react-i18next";
import { Field } from "./primitives";
import { type Snapshot, relationshipTypes } from "../domain/model";
export type Filters = {
  relationship: string;
  country: string;
  interest: string;
  tag: string;
  contact: string;
  status: string;
  min: number;
  from: string;
  to: string;
  community: string;
  degree: string;
};
export const emptyFilters: Filters = {
  relationship: "",
  country: "",
  interest: "",
  tag: "",
  contact: "",
  status: "",
  min: 0,
  from: "",
  to: "",
  community: "",
  degree: "",
};
export function FilterFields({
  data,
  value,
  onChange,
  communities,
}: {
  data: Snapshot;
  value: Filters;
  onChange: (v: Filters) => void;
  communities: number[];
}) {
  const { t } = useTranslation();
  const selects: {
    key: keyof Filters;
    label: string;
    options: string[];
    translate?: boolean;
  }[] = [
    {
      key: "relationship",
      label: "relationship",
      options: [...relationshipTypes],
      translate: true,
    },
    {
      key: "country",
      label: "country",
      options: [
        ...new Set(data.people.flatMap((p) => p.profile.nationalities)),
      ],
    },
    {
      key: "interest",
      label: "interests",
      options: [...new Set(data.people.flatMap((p) => p.profile.interests))],
    },
    {
      key: "tag",
      label: "tags",
      options: [...new Set(data.people.flatMap((p) => p.profile.tags))],
    },
    {
      key: "contact",
      label: "contactMode",
      options: ["virtual", "inPerson", "mixed"],
      translate: true,
    },
    {
      key: "status",
      label: "status",
      options: ["confirmed", "uncertain", "ended"],
      translate: true,
    },
    { key: "community", label: "community", options: communities.map(String) },
    { key: "degree", label: "degree", options: ["1", "2", "3"] },
  ];
  return (
    <div className="filter-fields">
      {selects.map((f) => (
        <Field key={f.key} label={t(f.label)}>
          <select
            value={value[f.key]}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
          >
            <option value="">{t("all")}</option>
            {f.options.map((v) => (
              <option value={v} key={v}>
                {f.translate ? t(v) : v}
              </option>
            ))}
          </select>
        </Field>
      ))}
      <Field label={t("minConnections")}>
        <input
          type="number"
          min={0}
          value={value.min}
          onChange={(e) => onChange({ ...value, min: Number(e.target.value) })}
        />
      </Field>
      <div className="form-grid">
        <Field label={t("minYear")}>
          <input
            type="number"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
        </Field>
        <Field label={t("maxYear")}>
          <input
            type="number"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </Field>
      </div>
      <button onClick={() => onChange(emptyFilters)}>{t("reset")}</button>
    </div>
  );
}

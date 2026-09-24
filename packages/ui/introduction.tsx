"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, UserRound, Check } from "lucide-react";
import { type Snapshot, profileSchema, updatePerson } from "../domain/model";
import { genders } from "../domain/gender";
import { useNetwork } from "./store";
import { Modal, Field, CountryPicker } from "./primitives";

export function introductionStage(data: Snapshot) {
  return (
    data.preferences.introduction ??
    (data.people.length === 1 && !data.connections.length ? "profile" : "done")
  );
}
export function Introduction({ onAdd }: { onAdd: () => void }) {
  const s = useNetwork(),
    { t } = useTranslation();
  const data = s.data!,
    saved = s.base ?? data;
  const owner = data.people.find((p) => p.id === data.ownerId)!;
  const [profile, setProfile] = useState(() =>
    structuredClone(
      owner?.profile ?? profileSchema.parse({ nickname: t("me") }),
    ),
  );
  const [step, setStep] = useState(1),
    [error, setError] = useState("");
  const stage = introductionStage(saved),
    busy = s.saving || Boolean(s.conflict);
  const setStage = (value: "invite" | "done" | "skipped") => {
    if (busy) return;
    s.mutate((d) => {
      d.preferences.introduction = value;
    });
  };
  if (!owner || stage === "done" || stage === "skipped") return null;
  const feedback = (error || s.error) && (
    <p className="error" role="alert">
      {t(error || s.error!, { defaultValue: t("storageError") })}
    </p>
  );
  if (stage === "profile")
    return (
      <Modal
        title={t("guideTitle")}
        className="introduction-modal"
        onClose={() => setStage("skipped")}
      >
        <form
          className="form-content"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            const parsed = profileSchema.safeParse(profile);
            if (!parsed.success) {
              setError("invalidData");
              return;
            }
            setError("");
            if (step === 1) {
              setStep(2);
              return;
            }
            s.mutate((d) => {
              updatePerson(d, owner.id, parsed.data);
              d.preferences.introduction = "invite";
            });
          }}
        >
          <div
            className="guide-progress"
            aria-label={t("guideProgress", { step })}
          >
            {[1, 2, 3].map((n) => (
              <span key={n} className={n <= step ? "active" : ""} />
            ))}
          </div>
          <div key={step} className="guide-step">
            <div className="guide-symbol">
              <UserRound size={28} />
            </div>
            <p className="eyebrow">{t("guideProgress", { step })}</p>
            <h2>{t(step === 1 ? "guideName" : "guideAbout")}</h2>
            <p className="muted-copy">
              {t(step === 1 ? "guideNameHelp" : "guideOptional")}
            </p>
            {step === 1 ? (
              <Field label={t("nickname")}>
                <input
                  autoFocus
                  required
                  maxLength={200}
                  value={profile.nickname}
                  onChange={(e) =>
                    setProfile({ ...profile, nickname: e.target.value })
                  }
                  autoComplete="nickname"
                />
              </Field>
            ) : (
              <>
                <div className="form-grid">
                  {(["firstName", "lastName"] as const).map((k) => (
                    <Field key={k} label={t(k)}>
                      <input
                        autoFocus={k === "firstName"}
                        maxLength={200}
                        value={profile[k]}
                        onChange={(e) =>
                          setProfile({ ...profile, [k]: e.target.value })
                        }
                      />
                    </Field>
                  ))}
                </div>
                <Field label={t("gender")}>
                  <select
                    value={profile.gender}
                    onChange={(e) =>
                      setProfile({ ...profile, gender: e.target.value })
                    }
                  >
                    {!genders.includes(
                      profile.gender as (typeof genders)[number],
                    ) && (
                      <option value={profile.gender}>{profile.gender}</option>
                    )}
                    {genders.map((g) => (
                      <option key={g} value={g}>
                        {t(g ? "gender_" + g : "gender_unspecified")}
                      </option>
                    ))}
                  </select>
                </Field>
                <CountryPicker
                  value={profile.nationalities}
                  onChange={(nationalities) =>
                    setProfile({ ...profile, nationalities })
                  }
                />
              </>
            )}
          </div>
          {feedback}
          <footer className="modal-actions guide-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => setStage("skipped")}
            >
              {t("guideSkip")}
            </button>
            {step === 2 && (
              <button type="button" disabled={busy} onClick={() => setStep(1)}>
                {t("guideBack")}
              </button>
            )}
            <button className="primary" disabled={busy} type="submit">
              {t(busy ? "saving" : step === 1 ? "continue" : "guideSave")}
            </button>
          </footer>
        </form>
      </Modal>
    );
  if (saved.people.length > 1 && !s.dirty && !s.saving)
    return (
      <Modal
        title={t("guideSuccess")}
        className="introduction-modal"
        onClose={() => setStage("done")}
      >
        <div className="form-content guide-step">
          <div className="guide-symbol">
            <Check size={28} />
          </div>
          <p>
            {t(
              saved.connections.length ? "guideConnected" : "guideIndependent",
            )}
          </p>
          <p className="muted-copy">{t("guideExplore")}</p>
          {feedback}
          <button
            className="primary full"
            disabled={busy}
            onClick={() => setStage("done")}
          >
            {t("guideFinish")}
          </button>
        </div>
      </Modal>
    );
  return (
    <aside className="guide-callout" aria-label={t("guideInvite")}>
      <Sparkles size={23} />
      <p className="eyebrow">{t("guideProgress", { step: 3 })}</p>
      <h2>{t("guideInvite")}</h2>
      <p>{t("guideInviteHelp")}</p>
      {feedback}
      <div className="guide-actions">
        <button className="primary" disabled={busy} onClick={onAdd}>
          {t("addPerson")}
        </button>
        <button disabled={busy} onClick={() => setStage("skipped")}>
          {t("guideSkip")}
        </button>
      </div>
    </aside>
  );
}

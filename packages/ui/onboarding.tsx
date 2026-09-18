"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { signIn, signOut } from "next-auth/react";
import {
  Network,
  ArrowUpRight,
  FolderOpen,
  HardDrive,
  LockKeyhole,
} from "lucide-react";
import { type Configuration } from "../config";
import { type Snapshot, createPerson } from "../domain/model";
import { demoNetwork } from "../domain/demo";
import {
  HttpRepository,
  LocalRepository,
  pickDirectory,
} from "../storage-adapters/browser";
import type { Repository } from "../storage-core";
import { useNetwork } from "./store";
import { Field } from "./primitives";
export function Onboarding({
  theme,
  onThemeChange,
  config,
  authenticated,
  authError,
}: {
  theme: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  config: Configuration;
  authenticated: boolean;
  authError: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [provider, setProvider] = useState(config.server ? "server" : "local"),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [existing, setExisting] = useState<{
      data: Snapshot;
      repo: Repository;
    } | null>(null);
  const open = useNetwork((s) => s.open);
  async function start() {
    setBusy(true);
    setError("");
    try {
      const repo =
        provider === "local"
          ? new LocalRepository(await pickDirectory())
          : new HttpRepository();
      const data = await repo.load();
      if (data.people.length) {
        setExisting({ data, repo });
        return;
      }
      if (!name.trim()) {
        setError("nameRequired");
        return;
      }
      createPerson(data, { nickname: name });
      data.preferences.theme = theme;
      data.preferences.language = i18n.language === "en" ? "en" : "es";
      open(await repo.save(data, 0), repo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageError");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="welcome">
      <header className="brand">
        <Network size={27} />
        <strong>
          GraphLive<span> / </span>
        </strong>
        <span>{t("tagline")}</span>
        <select
          className="language"
          aria-label={t("language")}
          value={i18n.language}
          onChange={(e) => {
            localStorage.setItem("graphlive-language", e.target.value);
            void i18n.changeLanguage(e.target.value);
          }}
        >
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
        <select
          className="welcome-theme"
          aria-label={t("theme")}
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as typeof theme)}
        >
          {["system", "light", "dark"].map((value) => (
            <option key={value} value={value}>
              {t(value)}
            </option>
          ))}
        </select>
      </header>
      <div className="welcome-layout">
        <section className="welcome-copy">
          <div className="eyebrow">
            <LockKeyhole size={15} />
            {t("footer")}
          </div>
          <h1>{t("welcome")}</h1>
          <p>{t("intro")}</p>
          <div className="welcome-network" aria-hidden="true">
            <svg viewBox="0 0 500 290">
              <g stroke="#b8c5d9" strokeWidth="1.5">
                <path d="M250 130L100 60L55 180L210 245L250 130L390 60L445 200L320 255L250 130L160 145L100 60M160 145L55 180M390 60L445 200M210 245L320 255M250 130L445 200" />
              </g>
              {[
                [250, 130, 29, "#335eaa"],
                [100, 60, 20, "#D8B24A"],
                [55, 180, 14, "#4F8F8B"],
                [210, 245, 20, "#274C77"],
                [390, 60, 22, "#D9822B"],
                [445, 200, 16, "#735784"],
                [320, 255, 12, "#8B929A"],
                [160, 145, 16, "#D9B94E"],
              ].map(([cx, cy, r, fill], i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={String(fill)}
                  stroke="white"
                  strokeWidth="4"
                />
              ))}
            </svg>
          </div>
        </section>
        <section className="setup-card">
          {config.auth && !authenticated ? (
            <>
              <h2>{t("login")}</h2>
              {authError ? (
                <p className="error">{t("authNotConfigured")}</p>
              ) : (
                <>
                  <button
                    disabled={!config.googleLogin}
                    className="primary full"
                    onClick={() => void signIn("google")}
                  >
                    {t("google")}
                  </button>
                  <button
                    disabled={!config.microsoftLogin}
                    className="full"
                    onClick={() => void signIn("azure-ad")}
                  >
                    {t("microsoft")}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <h2>{t(existing ? "openExisting" : "start")}</h2>
              {existing ? (
                <>
                  <p>
                    {t("existing", {
                      people: existing.data.people.length,
                      edges: existing.data.connections.length,
                      version: existing.data.schemaVersion,
                    })}
                  </p>
                  <button
                    className="primary full"
                    onClick={() => open(existing.data, existing.repo)}
                  >
                    {t("openExisting")}
                    <ArrowUpRight size={18} />
                  </button>
                  <button className="full" onClick={() => setExisting(null)}>
                    {t("cancel")}
                  </button>
                </>
              ) : (
                <>
                  <Field label={t("ownerName")}>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="nickname"
                      maxLength={200}
                    />
                  </Field>
                  <fieldset className="storage-choices">
                    <legend>{t("storage")}</legend>
                    {config.server && (
                      <label className={provider === "server" ? "active" : ""}>
                        <input
                          type="radio"
                          name="storage"
                          checked={provider === "server"}
                          onChange={() => setProvider("server")}
                        />
                        <HardDrive size={21} />
                        {t("server")}
                      </label>
                    )}
                    {config.local && (
                      <label className={provider === "local" ? "active" : ""}>
                        <input
                          type="radio"
                          name="storage"
                          checked={provider === "local"}
                          onChange={() => setProvider("local")}
                        />
                        <FolderOpen size={21} />
                        {t("local")}
                      </label>
                    )}
                  </fieldset>
                  {(provider === "local" || !config.auth) && (
                    <p className="notice">
                      {t(provider === "local" ? "localWarning" : "authWarning")}
                    </p>
                  )}
                  <button
                    disabled={busy || (!config.server && !config.local)}
                    className="primary full"
                    onClick={() => void start()}
                  >
                    {t(busy ? "loading" : "continue")}
                    <ArrowUpRight size={18} />
                  </button>
                  <div className="unavailable">
                    <span>{t("cloud")}</span>
                    <small>{t("unavailable")}</small>
                  </div>
                </>
              )}
              {authenticated && (
                <button onClick={() => void signOut()}>{t("logout")}</button>
              )}
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {t(error, { defaultValue: t("storageError") })}
            </p>
          )}
          <div className="demo-entry">
            <button
              className="text-button"
              onClick={() => {
                const demo = demoNetwork();
                demo.preferences.theme = theme;
                demo.preferences.language =
                  i18n.language === "en" ? "en" : "es";
                open(demo, null, true);
              }}
            >
              {t("demo")}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
      </div>
      <footer className="welcome-footer">
        GraphLive · v0.1.0-alpha.1 <span>{t("footer")}</span>
      </footer>
    </main>
  );
}

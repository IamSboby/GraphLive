"use client";
import {
  languageCodes,
  languageNames,
  resolveLanguage,
} from "../i18n/languages";
import { IconSelect } from "./icon-select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";
import { prepareGoogleDrive } from "../storage-adapters/google-auth";
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
import { BrowserRepository } from "../storage-adapters/indexeddb";
import type { Repository } from "../storage-core";
import { useNetwork } from "./store";
import { Field } from "./primitives";
export function Onboarding({
  page,
  theme,
  onThemeChange,
  config,
  authenticated,
  authError,
}: {
  page: "home" | "login";
  theme: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  config: Configuration;
  authenticated: boolean;
  authError: boolean;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const active = useNetwork((s) => s.data);
  const [provider, setProvider] = useState(
      config.server ? "server" : "browser",
    ),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [existing, setExisting] = useState<{
      data: Snapshot;
      repo: Repository;
    } | null>(null);
  const [driveReady, setDriveReady] = useState(false);
  useEffect(() => {
    if (provider === "drive")
      void prepareGoogleDrive()
        .then(() => setDriveReady(true))
        .catch(() => setError("driveUnavailable"));
  }, [provider]);
  const openNetwork = useNetwork((s) => s.open);
  const open = async (
    data: Snapshot,
    repo: Repository | null,
    demo = false,
  ) => {
    setBusy(true);
    try {
      await openNetwork(data, repo, demo);
      router.push("/graph");
    } catch {
      setError("localSaveFailed");
    } finally {
      setBusy(false);
    }
  };
  async function start() {
    setBusy(true);
    setError("");
    try {
      const drive = provider === "drive" ? new GoogleDriveRepository() : null;
      if (drive) await drive.session.connect();
      const repo =
        drive ??
        (provider === "browser"
          ? new BrowserRepository()
          : provider === "local"
            ? new LocalRepository(await pickDirectory())
            : new HttpRepository());
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
      data.preferences.introduction = "profile";
      data.preferences.theme = theme;
      data.preferences.language = resolveLanguage(i18n.language);
      await open(await repo.save(data, data.revision), repo);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(
        e instanceof DOMException &&
          ["SecurityError", "NotAllowedError"].includes(e.name)
          ? "folderPermission"
          : e instanceof Error
            ? e.message
            : "storageError",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className={
        "welcome page-enter " + (page === "home" ? "home-page" : "login-page")
      }
    >
      <header className="brand">
        <Link href="/" className="brand brand-link" aria-label="GraphLive">
          <Network size={27} />
          <strong>
            GraphLive<span> / </span>
          </strong>
        </Link>
        <span>{t("tagline")}</span>
        <IconSelect
          kind="language"
          className="language"
          aria-label={t("language")}
          value={i18n.language}
          onChange={(e) => {
            localStorage.setItem("graphlive-language", e.target.value);
            void i18n.changeLanguage(e.target.value);
          }}
        >
          {languageCodes.map((code) => (
            <option key={code} value={code}>
              {languageNames[code]}
            </option>
          ))}
        </IconSelect>
        <IconSelect
          kind="theme"
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
        </IconSelect>
      </header>
      <div className="welcome-layout">
        <section className="welcome-copy">
          <div className="eyebrow">
            <LockKeyhole size={15} />
            {t("footer")}
          </div>
          <h1>{t(page === "home" ? "welcome" : "accessHeading")}</h1>
          <p>{t(page === "home" ? "intro" : "accessIntro")}</p>
          <div className="welcome-network" aria-hidden="true">
            <svg viewBox="0 0 500 290">
              <g fill="none" stroke="#b8c5d9" strokeWidth="1.5">
                <path d="M250 130L100 60L55 180L210 245L250 130L390 60L445 200L320 255L250 130L160 145L100 60M160 145L55 180M390 60L445 200M210 245L320 255M250 130L445 200" />
              </g>
              {[
                [250, 130, 29, "#335eaa"],
                [100, 60, 20, "#ffbb00"],
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
          {page === "home" ? (
            <div className="home-actions">
              <span className="eyebrow">{t("yourSpace")}</span>
              <h2>{t("homeHeading")}</h2>
              <p className="muted-copy">{t("homeDescription")}</p>
              <Link href="/login" className="button primary full">
                {t("login")}
                <ArrowUpRight size={18} />
              </Link>
              {active && (
                <Link href="/graph" className="button full">
                  {t("resumeNetwork")}
                  <Network size={18} />
                </Link>
              )}
              <div className="home-features">
                <div>
                  <LockKeyhole size={19} />
                  <span>{t("featurePrivate")}</span>
                </div>
                <div>
                  <Network size={19} />
                  <span>{t("featureExplore")}</span>
                </div>
                <div>
                  <FolderOpen size={19} />
                  <span>{t("featureStorage")}</span>
                </div>
              </div>
            </div>
          ) : config.auth && !authenticated ? (
            <>
              <h2>{t("login")}</h2>
              {authError ? (
                <p className="error">{t("authNotConfigured")}</p>
              ) : (
                <>
                  <button
                    disabled={!config.googleLogin}
                    className="primary full"
                    onClick={() =>
                      void signIn("google", { callbackUrl: "/login" })
                    }
                  >
                    {t("google")}
                  </button>
                  <button
                    disabled={!config.microsoftLogin}
                    className="full"
                    onClick={() =>
                      void signIn("azure-ad", { callbackUrl: "/login" })
                    }
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
                    <label className={provider === "browser" ? "active" : ""}>
                      <input
                        type="radio"
                        name="storage"
                        checked={provider === "browser"}
                        onChange={() => setProvider("browser")}
                      />
                      <HardDrive size={21} />
                      {t("browserStorage")}
                    </label>
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
                    <label className={provider === "drive" ? "active" : ""}>
                      <input
                        type="radio"
                        name="storage"
                        checked={provider === "drive"}
                        onChange={() => setProvider("drive")}
                      />
                      <FolderOpen size={21} />
                      Google Drive
                    </label>
                  </fieldset>
                  {(provider !== "server" || !config.auth) && (
                    <p className="notice">
                      {t(
                        provider === "drive"
                          ? "driveNotice"
                          : provider === "browser"
                            ? "browserWarning"
                            : provider === "local"
                              ? "localWarning"
                              : "authWarning",
                      )}
                    </p>
                  )}
                  <button
                    disabled={busy || (provider === "drive" && !driveReady)}
                    className="primary full"
                    onClick={() => void start()}
                  >
                    {t(busy ? "loading" : "continue")}
                    <ArrowUpRight size={18} />
                  </button>
                </>
              )}
              {authenticated && (
                <button onClick={() => void signOut({ callbackUrl: "/" })}>
                  {t("logout")}
                </button>
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
                demo.preferences.language = resolveLanguage(i18n.language);
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
        GraphLive · v0.2.0-pre-beta.1 <span>{t("footer")}</span>
      </footer>
    </main>
  );
}

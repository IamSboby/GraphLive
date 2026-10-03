"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Network,
  Plus,
  ArrowUpRight,
  Search,
  Users,
  Link2,
  RefreshCw,
} from "lucide-react";
import { emptySnapshot, createPerson, displayName } from "../domain/model";
import { useLibrary, type NetworkEntry } from "./library";
import { useNetwork } from "./store";
import { Field, Modal } from "./primitives";
import { IconSelect } from "./icon-select";
import {
  languageCodes,
  languageNames,
  resolveLanguage,
} from "../i18n/languages";

export function Dashboard({
  theme,
  onThemeChange,
}: {
  theme: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { library, ownerName, activeId } = useLibrary();
  const active = useNetwork((s) => s.data);
  const demo = useNetwork((s) => s.demo);
  const [entries, setEntries] = useState<NetworkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState(ownerName);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!library) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      const loaded: NetworkEntry[] = [];
      for (const id of await library.ids()) {
        const data = await library.repository(id).load();
        if (data.people.length) loaded.push({ id, data });
      }
      if (!cancelled) setEntries(loaded);
    })()
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "storageError");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [library, router, reload]);
  async function open(id: string) {
    if (!library) return;
    setBusy(true);
    setError("");
    try {
      const state = useNetwork.getState();
      if (id !== activeId || !state.data || state.demo) {
        if (!(await state.prepareSwitch()))
          throw new Error(
            state.conflict ? "resolveBeforeSwitch" : "localSaveFailed",
          );
        const repo = library.repository(id);
        const data = await repo.load();
        if (!data.people.length) throw new Error("missingSnapshot");
        await useNetwork.getState().open(data, repo);
      }
      useLibrary.getState().select(id);
      router.push("/graph");
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageError");
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!library || !name.trim() || !identity.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (!(await useNetwork.getState().prepareSwitch()))
        throw new Error("resolveBeforeSwitch");
      // The original slot remains compatible with existing saved networks.
      const ids = await library.ids();
      let id = crypto.randomUUID() as string;
      const legacy = library.repository("default");
      const original = ids.includes("default") ? await legacy.load() : null;
      if (!original || (!original.people.length && original.revision === 0))
        id = "default";
      if (!library.multiple && id !== "default")
        throw new Error("storageError");
      const repo = library.repository(id);
      const data = emptySnapshot();
      data.preferences.networkName = name.trim();
      data.preferences.language = resolveLanguage(i18n.language);
      data.preferences.theme = theme;
      data.preferences.introduction = "profile";
      createPerson(data, { nickname: identity.trim() });
      const saved = await repo.save(data, 0);
      await useNetwork.getState().open(saved, repo);
      useLibrary.getState().select(id);
      router.push("/graph");
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageError");
    } finally {
      setBusy(false);
    }
  }
  const networks = entries.map((entry) =>
    entry.id === activeId && active && !demo
      ? { ...entry, data: active }
      : entry,
  );
  const title = (entry: NetworkEntry) =>
    entry.data.preferences.networkName || t("defaultNetwork");
  const shown = networks.filter((entry) =>
    `${title(entry)} ${entry.data.people.find((p) => p.id === entry.data.ownerId)?.profile.nickname ?? ""}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase().trim()),
  );
  return (
    <main className="welcome dashboard page-enter">
      <header className="brand">
        <Link href="/" className="brand brand-link" aria-label="GraphLive">
          <Network size={27} />
          <strong>GraphLive</strong>
        </Link>
        <span className="dashboard-storage">
          {t(
            library?.provider === "drive"
              ? "Google Drive"
              : library?.provider === "local"
                ? "local"
                : library?.provider === "server"
                  ? "server"
                  : "browserStorage",
          )}
        </span>
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
          aria-label={t("theme")}
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as typeof theme)}
        >
          {["light", "dark", "system"].map((value) => (
            <option key={value} value={value}>
              {t(value)}
            </option>
          ))}
        </IconSelect>
      </header>
      <section className="dashboard-heading">
        <div>
          <span className="eyebrow">GraphLive</span>
          <h1>{t("myNetworks")}</h1>
          <p>{t("networksIntro")}</p>
        </div>
        <button
          className="primary"
          disabled={
            loading ||
            busy ||
            Boolean(error) ||
            (!library?.multiple && entries.length > 0)
          }
          onClick={() => {
            setName(t("defaultNetwork"));
            setIdentity(ownerName);
            setCreating(true);
          }}
          data-testid="new-network"
        >
          <Plus size={20} />
          {t("newNetwork")}
        </button>
      </section>
      <div className="dashboard-tools">
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label={t("searchNetworks")}
            placeholder={t("searchNetworks")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className="icon-button"
          aria-label={t("refreshNetworks")}
          disabled={loading || busy}
          onClick={() => setReload((v) => v + 1)}
        >
          <RefreshCw size={19} />
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {t(error)}
        </p>
      )}
      {loading ? (
        <p role="status">{t("loading")}</p>
      ) : (
        <section className="network-cards" aria-label={t("myNetworks")}>
          {shown.map((entry) => {
            const owner = entry.data.people.find(
              (p) => p.id === entry.data.ownerId,
            );
            return (
              <article className="network-card" key={entry.id}>
                <div className="network-card-art" aria-hidden="true">
                  <Network size={52} />
                </div>
                <h2>{title(entry)}</h2>
                <p className="network-identity">
                  {t("networkIdentity", {
                    name: owner ? displayName(owner) : t("me"),
                  })}
                </p>
                <div className="network-card-counts">
                  <span>
                    <Users size={16} />
                    {entry.data.people.length} {t("people").toLowerCase()}
                  </span>
                  <span>
                    <Link2 size={16} />
                    {entry.data.connections.length}{" "}
                    {t("connections").toLowerCase()}
                  </span>
                </div>
                <button
                  className="full"
                  disabled={busy}
                  onClick={() => void open(entry.id)}
                >
                  {t("openExisting")}
                  <ArrowUpRight size={18} />
                </button>
              </article>
            );
          })}
          {!shown.length && !error && (
            <div className="dashboard-empty">
              <Network size={44} />
              <h2>{t(entries.length ? "noResults" : "noNetworks")}</h2>
              <p>{t("independentIdentity")}</p>
            </div>
          )}
        </section>
      )}
      <footer className="welcome-footer">
        <Link href="/login">{t("changeStorage")}</Link>
        <span>{t("footer")}</span>
      </footer>
      {creating && (
        <Modal
          title={t("newNetwork")}
          onClose={() => {
            if (!busy) setCreating(false);
          }}
        >
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <p className="muted-copy">{t("independentIdentity")}</p>
            <Field label={t("networkName")}>
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label={t("ownerName")}>
              <input
                required
                maxLength={80}
                autoComplete="off"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
              />
            </Field>
            {error && (
              <p role="alert" className="error">
                {t(error)}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="primary"
                data-testid="create-network"
                disabled={busy || !name.trim() || !identity.trim()}
              >
                {t(busy ? "saving" : "createNetwork")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}

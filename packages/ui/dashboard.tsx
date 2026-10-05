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
  Pencil,
  Share2,
} from "lucide-react";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";
import { pickSharedNetwork } from "../storage-adapters/google-picker";
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
  const [editing, setEditing] = useState<NetworkEntry | null>(null);
  const [sharing, setSharing] = useState<NetworkEntry | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"reader" | "writer">("reader");
  const [notice, setNotice] = useState("");
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
        const repo = library.repository(id);
        const data = await repo.load();
        if (data.people.length)
          loaded.push({
            id,
            data,
            readOnly: repo.readOnly,
            shared: repo instanceof GoogleDriveRepository && repo.shared,
          });
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
  async function selectForChange(id: string) {
    if (!library) throw new Error("storageError");
    const state = useNetwork.getState();
    if (id !== useLibrary.getState().activeId || !state.data || state.demo) {
      if (!(await state.prepareSwitch()))
        throw new Error("resolveBeforeSwitch");
      const repo = library.repository(id);
      await useNetwork.getState().open(await repo.load(), repo);
      useLibrary.getState().select(id);
    }
    if (useNetwork.getState().repo?.readOnly) throw new Error("sharedReadOnly");
    return useNetwork.getState();
  }
  async function rename() {
    if (!editing || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const state = await selectForChange(editing.id);
      state.mutate((d) => {
        d.preferences.networkName = name.trim();
      });
      if (!(await useNetwork.getState().prepareSwitch()))
        throw new Error("localSaveFailed");
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageError");
    } finally {
      setBusy(false);
    }
  }
  async function receive() {
    if (!library?.session) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await library.session.connect(true);
      const file = await pickSharedNetwork(library.session);
      if (file) {
        const repo = library.repository("shared:" + file);
        const data = await repo.load();
        if (!data.ownerId || !data.people.length)
          throw new Error("invalidData");
      }
      setReload((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageError");
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    if (!sharing || !library?.session) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await library.session.connect(true);
      const state = await selectForChange(sharing.id);
      await state.persist();
      if (useNetwork.getState().dirty || useNetwork.getState().conflict)
        throw new Error("resolveBeforeSwitch");
      const repo = useNetwork.getState().repo;
      if (!(repo instanceof GoogleDriveRepository))
        throw new Error("storageError");
      await repo.publishShared();
      const id = sharing.id;
      const shared = library.repository(id);
      await useNetwork.getState().open(await shared.load(), shared);
      useLibrary.getState().select(id);
      // Keep the canonical id even when the invitation fails, so retrying never
      // creates another copy of the network.
      setSharing({ ...sharing, id });
      setReload((v) => v + 1);
      await repo.invite(email, role);
      setSharing(null);
      setNotice("sharedInvitationSent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageError");
    } finally {
      setBusy(false);
    }
  }
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
      let id = crypto.randomUUID() as string;
      const legacy = library.repository("default");
      const original = await legacy.load();
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
        {library?.session && (
          <button disabled={loading || busy} onClick={() => void receive()}>
            <Share2 size={18} />
            {t("openSharedNetwork")}
          </button>
        )}
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
      {notice && (
        <p className="notice" role="status">
          {t(notice)}
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
                {entry.shared && (
                  <p className="muted-copy">
                    {t(entry.readOnly ? "sharedReadOnly" : "sharedEditable")}
                  </p>
                )}
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
                  data-testid="open-network"
                  className="full"
                  disabled={busy}
                  onClick={() => void open(entry.id)}
                >
                  {t("openExisting")}
                  <ArrowUpRight size={18} />
                </button>
                <div className="network-card-actions">
                  <button
                    disabled={busy || entry.readOnly}
                    onClick={() => {
                      setError("");
                      setName(title(entry));
                      setEditing(entry);
                    }}
                  >
                    <Pencil size={16} />
                    {t("renameNetwork")}
                  </button>
                  {library?.session && (
                    <button
                      disabled={busy || entry.readOnly}
                      onClick={() => {
                        setError("");
                        setEmail("");
                        setRole("reader");
                        setSharing(entry);
                      }}
                    >
                      <Share2 size={16} />
                      {t("shareNetwork")}
                    </button>
                  )}
                </div>
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
      {editing && (
        <Modal
          title={t("renameNetwork")}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              void rename();
            }}
          >
            <Field label={t("networkName")}>
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                onClick={() => setEditing(null)}
              >
                {t("cancel")}
              </button>
              <button className="primary" disabled={busy || !name.trim()}>
                {t("save")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {sharing && (
        <Modal
          title={t("shareNetwork")}
          onClose={() => {
            if (!busy) setSharing(null);
          }}
        >
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              void share();
            }}
          >
            <h3>{title(sharing)}</h3>
            <p>{t("shareNetworkHelp")}</p>
            <Field label={t("sharedEmail")}>
              <input
                autoFocus
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t("sharedPermission")}>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
              >
                <option value="reader">{t("sharedReader")}</option>
                <option value="writer">{t("sharedWriter")}</option>
              </select>
            </Field>
            <p className="muted-copy">{t("sharedReceiveHelp")}</p>
            {error && (
              <p role="alert" className="error">
                {t(error)}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => setSharing(null)}
              >
                {t("cancel")}
              </button>
              <button className="primary" disabled={busy || !email.trim()}>
                {t(busy ? "saving" : "sendInvitation")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}

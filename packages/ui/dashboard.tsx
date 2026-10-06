"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
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
import { themePalette } from "../appearance/config";
import type { Repository } from "../storage-core";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";
import { pickSharedNetworks } from "../storage-adapters/google-picker";
import {
  emptySnapshot,
  createPerson,
  displayName,
  normalize,
} from "../domain/model";
import { useLibrary, type NetworkEntry } from "./library";
import { useNetwork } from "./store";
import { NetworkSharing } from "./network-sharing";
import { Field, Modal } from "./primitives";
import { IconSelect } from "./icon-select";
import {
  languageCodes,
  languageNames,
  resolveLanguage,
} from "../i18n/languages";

export function Dashboard({
  theme,
  systemDark,
  onThemeChange,
}: {
  theme: "light" | "dark" | "system";
  systemDark: boolean;
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
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"all" | "shared">("all");
  const [skipped, setSkipped] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnce = useRef(false);
  const repositoryCache = useRef<{
    library: typeof library;
    entries: Map<string, Repository>;
  } | null>(null);
  useEffect(() => {
    if (!library) {
      router.replace("/login");
      return;
    }
    if (repositoryCache.current?.library !== library) {
      repositoryCache.current = { library, entries: new Map() };
      loadedOnce.current = false;
    }
    const repositories = repositoryCache.current.entries;
    let cancelled = false;
    setLoading(!loadedOnce.current);
    setRefreshing(true);
    setError("");
    void (async () => {
      const loaded: NetworkEntry[] = [];
      const ids = await library.ids();
      let ignored = 0;
      for (let offset = 0; offset < ids.length; offset += 4) {
        const batch = await Promise.all(
          ids.slice(offset, offset + 4).map(async (id) => {
            const repo = repositories.get(id) ?? library.repository(id);
            repositories.set(id, repo);
            try {
              const data = await repo.load();
              return data.people.length
                ? {
                    id,
                    data,
                    readOnly: repo.readOnly,
                    shared:
                      repo instanceof GoogleDriveRepository && repo.shared,
                    ownerLabel:
                      repo instanceof GoogleDriveRepository
                        ? repo.ownerLabel
                        : undefined,
                  }
                : null;
            } catch (e) {
              if (
                e instanceof Error &&
                (e.message === "sharedAccessLost" ||
                  (id.startsWith("shared:") &&
                    ["invalidData", "tooLarge"].includes(e.message)))
              ) {
                ignored++;
                return null;
              }
              throw e;
            }
          }),
        );
        loaded.push(
          ...batch.filter((e): e is NonNullable<typeof e> => Boolean(e)),
        );
      }
      for (const id of repositories.keys())
        if (!ids.includes(id)) repositories.delete(id);
      if (!cancelled) setSkipped(ignored);
      if (!cancelled) setEntries(loaded);
    })()
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "storageError");
      })
      .finally(() => {
        if (!cancelled) {
          loadedOnce.current = true;
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [library, router, reload]);
  useEffect(() => {
    if (
      library?.provider !== "drive" ||
      loading ||
      refreshing ||
      busy ||
      sharing ||
      editing ||
      creating
    )
      return;
    const refresh = () => {
      if (document.visibilityState !== "hidden" && navigator.onLine)
        setReload((v) => v + 1);
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [library, loading, refreshing, busy, sharing, editing, creating]);
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
      await useNetwork.getState().persist();
      if (useNetwork.getState().dirty) throw new Error("resolveBeforeSwitch");
      const repo = useNetwork.getState().repo;
      if (repo instanceof GoogleDriveRepository && repo.shared)
        await repo.syncSharedTitle();
      setReload((v) => v + 1);
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
      await library.session.ensureFileAccess();
      const files = await pickSharedNetworks(library.session, {
        networks: t("sharedNetworks"),
        allJson: t("sharedAllJson"),
      });
      if (!files.length) return;
      let rejected = 0;
      for (const file of files) {
        try {
          const repo = library.repository("shared:" + file);
          const data = await repo.load();
          if (!data.ownerId || !data.people.length)
            throw new Error("invalidData");
        } catch (e) {
          if (
            e instanceof Error &&
            ["driveExpired", "driveSharingPermission"].includes(e.message)
          )
            throw e;
          rejected++;
        }
      }
      setTab("shared");
      setNotice(
        t("sharedImportResult", {
          count: files.length - rejected,
          skipped: rejected,
        }),
      );
      setReload((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageError");
    } finally {
      setBusy(false);
    }
  }
  async function prepareSharing() {
    if (!sharing || !library?.session) throw new Error("storageError");
    const state = await selectForChange(sharing.id);
    await state.persist();
    if (useNetwork.getState().dirty || useNetwork.getState().conflict)
      throw new Error("resolveBeforeSwitch");
    const repo = useNetwork.getState().repo;
    if (!(repo instanceof GoogleDriveRepository))
      throw new Error("storageError");
    await repo.publishShared();
    await repo.syncSharedTitle();
    setReload((v) => v + 1);
    return repo;
  }
  async function openSharing(entry: NetworkEntry) {
    if (!library?.session) return;
    setBusy(true);
    setError("");
    try {
      await library.session.ensureFileAccess();
      setSharing(entry);
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
  const shown = networks.filter(
    (entry) =>
      (tab === "all" || entry.shared) &&
      normalize(
        [
          title(entry),
          entry.ownerLabel ?? "",
          ...entry.data.people
            .filter((p) => p.id === entry.data.ownerId)
            .flatMap((p) => [
              p.profile.nickname,
              p.profile.firstName,
              p.profile.lastName,
            ]),
        ].join(" "),
      ).includes(normalize(query)),
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
      {library?.session && (
        <div
          className="network-tabs"
          role="group"
          aria-label={t("networkView")}
        >
          <button
            type="button"
            aria-pressed={tab === "all"}
            onClick={() => setTab("all")}
          >
            {t("allNetworks")} <span>{networks.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === "shared"}
            onClick={() => setTab("shared")}
          >
            <Share2 size={17} />
            {t("sharedNetworks")}{" "}
            <span>{networks.filter((e) => e.shared).length}</span>
          </button>
        </div>
      )}
      {library?.session && tab === "shared" && (
        <p className="muted-copy shared-discovery-help">
          {t("sharedDiscoveryHelp")}
        </p>
      )}
      <div className="dashboard-tools">
        {library?.session && (
          <button disabled={loading || busy} onClick={() => void receive()}>
            <Share2 size={18} />
            {t("importSharedNetworks")}
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
          disabled={loading || refreshing || busy}
          onClick={() => setReload((v) => v + 1)}
        >
          <RefreshCw size={19} />
        </button>
      </div>
      {refreshing && !loading && (
        <p className="muted-copy" role="status">
          {t("scanningNetworks")}
        </p>
      )}
      {skipped > 0 && (
        <p className="muted-copy">{t("sharedSkipped", { count: skipped })}</p>
      )}
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
            const cardDark =
              entry.data.preferences.theme === "dark" ||
              (entry.data.preferences.theme === "system" && systemDark);
            const cardPalette = themePalette(entry.data.preferences, cardDark);
            const cardStyle = {
              ...Object.fromEntries(
                Object.entries(cardPalette).map(([key, value]) => [
                  "--" + key,
                  value,
                ]),
              ),
              colorScheme: cardDark ? "dark" : "light",
            } as CSSProperties;
            return (
              <article
                className="network-card"
                key={entry.id}
                style={cardStyle}
              >
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
                  {t(
                    entry.shared ? "sharedCentralProfile" : "networkIdentity",
                    {
                      name: owner ? displayName(owner) : t("me"),
                    },
                  )}
                </p>
                {entry.ownerLabel && (
                  <p className="network-identity">
                    {t("sharedOwnedBy", { name: entry.ownerLabel })}
                  </p>
                )}
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
                      onClick={() => void openSharing(entry)}
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
              <h2>
                {t(
                  tab === "shared" && !query
                    ? "noSharedNetworks"
                    : entries.length
                      ? "noResults"
                      : "noNetworks",
                )}
              </h2>
              <p>
                {t(
                  tab === "shared"
                    ? "sharedDiscoveryHelp"
                    : "independentIdentity",
                )}
              </p>
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
      {sharing && library?.session && (
        <NetworkSharing
          entry={sharing}
          library={library}
          prepare={prepareSharing}
          onClose={() => setSharing(null)}
          onInvited={() => {
            setNotice("sharedInvitationSent");
            setReload((v) => v + 1);
          }}
        />
      )}
    </main>
  );
}

"use client";
import {
  languageCodes,
  languageNames,
  resolveLanguage,
  isLanguage,
} from "../i18n/languages";
import { IconSelect } from "./icon-select";
import { relationshipPalette, themePalette } from "../appearance/config";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";
import "../i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Network,
  Search,
  Settings2,
  Plus,
  Minus,
  Maximize,
  RotateCcw,
  Undo2,
  Redo2,
  Download,
  SlidersHorizontal,
  List,
  Share2,
  ChevronDown,
  Check,
  Pause,
  Play,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { type Configuration } from "../config";
import {
  type Snapshot,
  type Person,
  type Connection,
  displayName,
  relationshipTypes,
  ownerRelationship,
  normalize,
} from "../domain/model";
import {
  metrics,
  matchesSearch,
  shortestPath,
  adjacency,
} from "../graph-engine/metrics";
import { useNetwork } from "./store";
import { GraphView, type GraphControls } from "./graph";
import { Introduction, introductionStage } from "./introduction";
import { Onboarding } from "./onboarding";
import { PersonForm } from "./person-form";
import { ConnectionForm } from "./connection-form";
import { Settings } from "./settings";
import { Details } from "./details";
import { Modal } from "./primitives";
import { FilterFields, emptyFilters } from "./filters";
import { exportJson } from "../storage-core/export";

export function App({
  screen,
  config,
  authenticated,
  authError,
}: {
  screen: "home" | "login" | "graph";
  config: Configuration;
  authenticated: boolean;
  authError: boolean;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation(),
    s = useNetwork(),
    data = s.data;
  const [selected, setSelected] = useState<string | null>(null),
    [form, setForm] = useState<Person | "new" | null>(null),
    [edgeForm, setEdgeForm] = useState<{
      sourceId: string;
      edge?: Connection;
    } | null>(null),
    [settings, setSettings] = useState(false),
    [preview, setPreview] = useState<Snapshot | null>(null),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState(emptyFilters),
    [filterOpen, setFilterOpen] = useState(false),
    [list, setList] = useState(false),
    [paused, setPaused] = useState(false),
    [pathTo, setPathTo] = useState(""),
    [systemDark, setSystemDark] = useState(false),
    [welcomeTheme, setWelcomeTheme] = useState<"light" | "dark" | "system">(
      "system",
    ),
    [themeReady, setThemeReady] = useState(false),
    [actionError, setActionError] = useState("");
  const graph = useRef<GraphControls>(null);
  const leavingGraph = useRef(false);
  useEffect(() => {
    if (
      screen === "graph" &&
      !leavingGraph.current &&
      (!data || (config.auth && !authenticated && !s.demo))
    )
      router.replace("/login");
  }, [screen, data, config.auth, authenticated, s.demo, router]);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const theme =
    screen === "graph"
      ? (data?.preferences.theme ?? welcomeTheme)
      : welcomeTheme;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  const colors = useMemo(
    () => relationshipPalette(data?.preferences),
    [data?.preferences],
  );
  const palette = useMemo(
    () => themePalette(data?.preferences, dark),
    [data?.preferences, dark],
  );
  useEffect(() => {
    for (const [key, value] of Object.entries(palette))
      document.documentElement.style.setProperty("--" + key, value);
  }, [palette]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const savedTheme = localStorage.getItem("graphlive-theme");
    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
    )
      setWelcomeTheme(savedTheme);
    setThemeReady(true);
    const change = () => setSystemDark(media.matches);
    media.addEventListener("change", change);
    const lang = localStorage.getItem("graphlive-language");
    if (isLanguage(lang)) void i18n.changeLanguage(lang);
    return () => media.removeEventListener("change", change);
  }, [i18n]);
  useEffect(() => {
    document.documentElement.lang = resolveLanguage(i18n.language);
  }, [i18n.language]);
  useEffect(() => {
    if (data && screen === "graph") {
      document.documentElement.lang = data.preferences.language;
      setWelcomeTheme(data.preferences.theme);
      localStorage.setItem("graphlive-language", data.preferences.language);
      void i18n.changeLanguage(data.preferences.language);
    }
  }, [screen, data?.preferences.language, data?.preferences.theme, data, i18n]);
  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem("graphlive-theme", theme);
  }, [theme, dark, themeReady]);
  useEffect(() => {
    const timer = setInterval(
      () => void useNetwork.getState().refresh(),
      15000,
    );
    const before = (e: BeforeUnloadEvent) => {
      if (useNetwork.getState().dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", before);
    };
  }, []);
  const stats = useMemo(() => (data ? metrics(data) : new Map()), [data]);
  const communities = [
    ...new Set([...stats.values()].map((m) => m.community as number)),
  ];
  const visible = useMemo(() => {
    if (!data) return new Set<string>();
    let reached: Set<string> | null = null;
    if (filters.degree && selected) {
      reached = new Set([selected]);
      const a = adjacency(data);
      let layer = [selected];
      for (let i = 0; i < Number(filters.degree); i++) {
        const next: string[] = [];
        for (const id of layer)
          for (const n of a.get(id) ?? [])
            if (!reached.has(n)) {
              reached.add(n);
              next.push(n);
            }
        layer = next;
      }
    }
    return new Set(
      data.people
        .filter((p) => {
          const m = stats.get(p.id),
            year =
              p.profile.birthYear ?? Number(p.profile.birthDate?.slice(0, 4));
          return (
            !p.display.hidden &&
            (data.preferences.showOwner || p.id !== data.ownerId) &&
            matchesSearch(p, query, data.preferences.searchNotes) &&
            (!filters.relationship ||
              ownerRelationship(data, p.id) === filters.relationship) &&
            (!filters.country ||
              p.profile.nationalities.includes(filters.country)) &&
            (!filters.interest ||
              p.profile.interests.some(
                (v) => normalize(v) === normalize(filters.interest),
              )) &&
            (!filters.tag ||
              p.profile.tags.some(
                (v) => normalize(v) === normalize(filters.tag),
              )) &&
            (!filters.contact || p.profile.contactMode === filters.contact) &&
            (!filters.status ||
              data.connections.some(
                (e) =>
                  (e.sourceId === p.id || e.targetId === p.id) &&
                  e.status === filters.status,
              )) &&
            (m?.degree ?? 0) >= filters.min &&
            (!filters.from || (year && year >= Number(filters.from))) &&
            (!filters.to || (year && year <= Number(filters.to))) &&
            (!filters.community ||
              String(m?.community) === filters.community) &&
            (!reached || reached.has(p.id))
          );
        })
        .map((p) => p.id),
    );
  }, [data, query, filters, selected, stats]);
  const path = useMemo(
    () =>
      data && selected && pathTo ? shortestPath(data, selected, pathTo) : [],
    [data, selected, pathTo],
  );
  if (screen !== "graph")
    return (
      <Onboarding
        page={screen}
        theme={welcomeTheme}
        onThemeChange={setWelcomeTheme}
        config={config}
        authenticated={authenticated}
        authError={authError}
      />
    );
  if (!data || (config.auth && !authenticated && !s.demo))
    return (
      <main className="route-loading" role="status">
        {t("loading")}
      </main>
    );
  const person = data.people.find((p) => p.id === selected);
  const shown = data.people.filter((p) => visible.has(p.id));
  const select = (id: string) => {
    setSelected(id);
    setMobileSidebar(false);
    graph.current?.center(id);
  };
  const disconnect = () => {
    if (s.dirty && !window.confirm(t("exportFirst"))) return;
    leavingGraph.current = true;
    useNetwork.setState({
      data: null,
      base: null,
      repo: null,
      dirty: false,
      conflict: null,
    });
    setSelected(null);
    setSettings(false);
    setFilters(emptyFilters);
    setQuery("");
    router.push("/");
  };
  const busy = s.saving || Boolean(s.conflict);
  const guideStage = s.demo ? "done" : introductionStage(s.base ?? data);
  const guideInvite =
    guideStage === "invite" && data.people.length === 1 && !form && !settings;
  return (
    <main className="workspace">
      <header className="topbar">
        <Link href="/" className="brand brand-link" aria-label="GraphLive">
          <Network size={24} />
          <strong>
            GraphLive<span> / </span>
          </strong>
          <span className="private-label">{t("network")}</span>
        </Link>
        <div className="topbar-center">
          <span
            className={"sync-state " + (s.error ? "error" : "")}
            role="status"
          >
            {!s.saving && !s.dirty && <Check size={14} />}{" "}
            {t(
              s.demo
                ? "demoMode"
                : s.saving
                  ? "saving"
                  : s.dirty
                    ? "unsaved"
                    : "saved",
            )}
          </span>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button mobile-search"
            aria-label={t("search")}
            onClick={() => setMobileSidebar(!mobileSidebar)}
          >
            <Search size={18} />
          </button>
          <IconSelect
            kind="language"
            aria-label={t("language")}
            value={data.preferences.language}
            disabled={busy}
            onChange={(e) =>
              s.mutate((d) => {
                d.preferences.language = resolveLanguage(e.target.value);
              })
            }
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
            value={data.preferences.theme}
            disabled={busy}
            onChange={(e) =>
              s.mutate((d) => {
                d.preferences.theme = e.target.value as
                  "light" | "dark" | "system";
              })
            }
          >
            {["light", "dark", "system"].map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </IconSelect>
          <button
            className="icon-button"
            aria-label={t("settings")}
            onClick={() => setSettings(true)}
          >
            <Settings2 size={19} />
          </button>
          {s.demo ? (
            <button onClick={disconnect}>{t("exitDemo")}</button>
          ) : (
            config.auth && (
              <button
                className="icon-button"
                aria-label={t("logout")}
                onClick={() => void signOut({ callbackUrl: "/" })}
              >
                <LogOut size={18} />
              </button>
            )
          )}
        </div>
      </header>
      <div className="workspace-body">
        <aside className={"sidebar " + (mobileSidebar ? "mobile-open" : "")}>
          <div className="sidebar-title">
            <div>
              <span className="eyebrow">{t("network")}</span>
              <h1>
                {t("people")}
                <span>{data.people.length}</span>
              </h1>
            </div>
            <button
              className="icon-button"
              aria-label={t("addPerson")}
              disabled={busy}
              onClick={() => setForm("new")}
            >
              <Plus size={20} />
            </button>
          </div>
          <label className="search-box">
            <Search size={17} />
            <input
              aria-label={t("search")}
              placeholder={t("search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="sidebar-tools">
            <button
              className={filterOpen ? "active" : ""}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <SlidersHorizontal size={15} />
              {t("filters")}
              <ChevronDown size={14} />
            </button>
            <span>{t("visible", { count: shown.length })}</span>
          </div>
          {filterOpen ? (
            <FilterFields
              data={data}
              value={filters}
              onChange={setFilters}
              communities={communities}
            />
          ) : (
            <div className="people-list">
              {shown.map((p) => (
                <button
                  className={
                    "person-row " + (selected === p.id ? "selected" : "")
                  }
                  key={p.id}
                  onClick={() => select(p.id)}
                  title={[
                    displayName(p),
                    t("connections") + ": " + stats.get(p.id)?.degree,
                    t("affinity") + ": " + (stats.get(p.id)?.affinity ?? "—"),
                  ].join(" · ")}
                >
                  <span
                    className="avatar-small"
                    style={{
                      background:
                        p.id === data.ownerId
                          ? `linear-gradient(135deg, ${palette.ownerStart}, ${palette.ownerEnd})`
                          : colors[ownerRelationship(data, p.id)],
                    }}
                  >
                    {displayName(p)[0]}
                  </span>
                  <span>
                    <strong>
                      {p.id === data.ownerId ? t("me") : displayName(p)}
                    </strong>
                    <small>
                      {p.id === data.ownerId
                        ? t("profile")
                        : t(ownerRelationship(data, p.id))}
                    </small>
                  </span>
                  <span className="connection-count">
                    {stats.get(p.id)?.degree}
                  </span>
                </button>
              ))}
              {!shown.length && <p className="muted-copy">{t("noResults")}</p>}
            </div>
          )}
          <footer className="sidebar-footer">
            <LockIcon />
            {s.demo ? t("demoNotice") : t("footer")}
          </footer>
        </aside>
        <section className="canvas-area">
          <div className="canvas-top">
            <div className="network-summary">
              <strong>{t("network")}</strong>
              <span>
                {data.people.length} {t("people").toLowerCase()}
                <i /> {data.connections.length} {t("connections").toLowerCase()}
              </span>
            </div>
            <div className="view-toggle">
              <button
                aria-label={t("network")}
                className={!list ? "active" : ""}
                onClick={() => setList(false)}
              >
                <Share2 size={17} />
              </button>
              <button
                aria-label={t("list")}
                className={list ? "active" : ""}
                onClick={() => setList(true)}
              >
                <List size={18} />
              </button>
            </div>
          </div>
          {list ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("firstName")}</th>
                    <th>{t("birth")}</th>
                    <th>{t("relationship")}</th>
                    <th>{t("connections")}</th>
                    <th>{t("affinity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => select(p.id)}
                        >
                          {displayName(p)}
                        </button>
                      </td>
                      <td>{p.profile.birthYear ?? t("unknown")}</td>
                      <td>{t(ownerRelationship(data, p.id))}</td>
                      <td>{stats.get(p.id)?.degree}</td>
                      <td>{stats.get(p.id)?.affinity ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <GraphView
              ref={graph}
              data={data}
              visible={visible}
              selected={selected}
              path={path}
              dark={Boolean(dark)}
              me={t("me")}
              onSelect={setSelected}
              onPosition={(id, x, y) =>
                s.mutate((d) => {
                  const p = d.people.find((p) => p.id === id)!;
                  p.display.manualPosition = { x, y };
                })
              }
            />
          )}
          {data.people.length <= 1 &&
            !selected &&
            (s.demo || ["done", "skipped"].includes(guideStage)) && (
              <div className="empty-hint">
                <h2>{t("empty")}</h2>
                <p>{t("emptyHint")}</p>
              </div>
            )}
          <details className="legend">
            <summary>{t("legend")}</summary>
            <div>
              {relationshipTypes.map((r) => (
                <span key={r}>
                  <i style={{ background: colors[r] }} />
                  {t(r)}
                </span>
              ))}
              <p>{t("legendHelp")}</p>
            </div>
          </details>
          <div className="canvas-bottom">
            <div className="graph-controls">
              {[
                {
                  label: "zoomIn",
                  icon: Plus,
                  fn: () => graph.current?.zoom(1.25),
                },
                {
                  label: "zoomOut",
                  icon: Minus,
                  fn: () => graph.current?.zoom(0.8),
                },
                {
                  label: "fit",
                  icon: Maximize,
                  fn: () => graph.current?.fit(),
                },
                {
                  label: "recalculate",
                  icon: RotateCcw,
                  fn: () => {
                    graph.current?.layout();
                    setPaused(false);
                  },
                },
                {
                  label: paused ? "resume" : "pause",
                  icon: paused ? Play : Pause,
                  fn: () => {
                    if (paused) graph.current?.layout();
                    else graph.current?.pause();
                    setPaused(!paused);
                  },
                },
                {
                  label: "screenshot",
                  icon: Download,
                  fn: () => graph.current?.png(),
                },
              ].map(({ label, icon: Icon, fn }) => (
                <button
                  key={label}
                  className="icon-button"
                  aria-label={t(label)}
                  title={t(label)}
                  disabled={list}
                  onClick={fn}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
            <span className="pan-hint">{t("hintPan")}</span>
            <div className="graph-controls">
              <button
                className="icon-button"
                aria-label={t("undo")}
                disabled={!s.history.length || busy}
                onClick={s.undo}
              >
                <Undo2 size={18} />
              </button>
              <button
                className="icon-button"
                aria-label={t("redo")}
                disabled={!s.future.length || busy}
                onClick={s.redo}
              >
                <Redo2 size={18} />
              </button>
            </div>
          </div>
          <button
            className={"add-fab " + (guideInvite ? "guide-glow" : "")}
            title={t("addPerson")}
            aria-label={t("addPerson")}
            disabled={busy}
            onClick={() => setForm("new")}
          >
            <Plus size={27} />
          </button>
          {selected && (
            <div className="path-control">
              <select
                aria-label={t("pathTo")}
                value={pathTo}
                onChange={(e) => setPathTo(e.target.value)}
              >
                <option value="">{t("pathTo")}</option>
                {data.people
                  .filter((p) => p.id !== selected)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {displayName(p)}
                    </option>
                  ))}
              </select>
              {pathTo && !path.length && <small>{t("noPath")}</small>}
            </div>
          )}
        </section>
        {person && (
          <Details
            person={person}
            onClose={() => setSelected(null)}
            onEdit={() => setForm(person)}
            onLock={() =>
              s.mutate((d) => {
                const p = d.people.find((p) => p.id === person.id)!;
                p.display.manualPosition =
                  graph.current?.position(p.id) ?? p.display.manualPosition;
                p.display.positionLocked = !p.display.positionLocked;
              })
            }
            onConnect={(edge) => setEdgeForm({ sourceId: person.id, edge })}
            onSelect={select}
          />
        )}
      </div>
      {(s.error || actionError) && (
        <div className="toast" role="alert">
          <span>
            {t(actionError || s.error || "error", { defaultValue: t("error") })}
          </span>
          {s.repo instanceof GoogleDriveRepository &&
          s.error === "driveExpired" ? (
            <button
              onClick={() => {
                const repo = s.repo as GoogleDriveRepository;
                void repo.session
                  .connect()
                  .then(async () => {
                    setActionError("");
                    await s.persist();
                  })
                  .catch((error: unknown) =>
                    setActionError(
                      error instanceof Error
                        ? error.message
                        : "drivePermission",
                    ),
                  );
              }}
            >
              {t("driveReconnect")}
            </button>
          ) : (
            <button onClick={() => void s.persist()}>{t("retry")}</button>
          )}
          <button onClick={() => exportJson(data)}>
            {t("downloadPending")}
          </button>
        </div>
      )}
      {form && (
        <PersonForm
          person={form === "new" ? undefined : form}
          customFields={config.customFields}
          onSaved={(id, connection) => {
            setSelected(id);
            if (connection)
              setEdgeForm({
                sourceId: id,
                edge:
                  connection === "new"
                    ? undefined
                    : data.connections.find((e) => e.id === connection),
              });
          }}
          onClose={() => setForm(null)}
        />
      )}
      {!s.demo &&
        !form &&
        !edgeForm &&
        !settings &&
        !preview &&
        !s.conflict && (
          <Introduction key={data.ownerId} onAdd={() => setForm("new")} />
        )}
      {edgeForm && (
        <ConnectionForm {...edgeForm} onClose={() => setEdgeForm(null)} />
      )}
      {settings && (
        <Settings
          onClose={() => setSettings(false)}
          onPreview={(v) => {
            setSettings(false);
            setPreview(v);
          }}
          onDisconnect={disconnect}
        />
      )}
      {preview && (
        <Modal title={t("importPreview")} onClose={() => setPreview(null)}>
          <div className="form-content">
            <p>
              {t("importSummary", {
                people: preview.people.length,
                edges: preview.connections.length,
              })}
            </p>
            <footer className="modal-actions">
              <button onClick={() => setPreview(null)}>{t("cancel")}</button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    try {
                      if (s.repo) await s.repo.backup();
                      s.mutate((d) =>
                        Object.assign(d, preview, { revision: d.revision }),
                      );
                      setPreview(null);
                    } catch {
                      setActionError("storageError");
                    }
                  })();
                }}
              >
                {t("replace")}
              </button>
            </footer>
          </div>
        </Modal>
      )}
      {s.conflict && (
        <Modal title={t("conflict")} onClose={() => {}}>
          <div className="form-content">
            <p>{t("conflictHelp")}</p>
            <p>
              {t("conflictFields")}:{" "}
              {s.conflict.fields
                .map((f) => f.path.split(".").at(-1))
                .join(", ")}
            </p>
            <button onClick={() => exportJson(data)}>
              {t("downloadPending")}
            </button>
            <footer className="modal-actions">
              <button
                onClick={() =>
                  void s
                    .resolve("remote")
                    .catch(() => setActionError("storageError"))
                }
              >
                {t("keepRemote")}
              </button>
              <button
                className="primary"
                onClick={() =>
                  void s
                    .resolve("local")
                    .catch(() => setActionError("storageError"))
                }
              >
                {t("keepLocal")}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </main>
  );
}
function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

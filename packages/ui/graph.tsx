"use client";
import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import cytoscape, { type Core, type StylesheetJson } from "cytoscape";
import {
  type Snapshot,
  colors,
  displayName,
  ownerRelationship,
} from "../domain/model";
import { Flag } from "./primitives";
import { flagUrl } from "./flags";
import { metrics, nodeSize } from "../graph-engine/metrics";
export type GraphControls = {
  fit: () => void;
  zoom: (factor: number) => void;
  layout: () => void;
  pause: () => void;
  png: () => void;
  center: (id: string) => void;
  position: (id: string) => { x: number; y: number } | undefined;
};
type Props = {
  data: Snapshot;
  visible: Set<string>;
  selected: string | null;
  path: string[];
  onSelect: (id: string) => void;
  onPosition: (id: string, x: number, y: number) => void;
  dark: boolean;
  me: string;
};
export const GraphView = forwardRef<GraphControls, Props>(function GraphView(
  { data, visible, selected, path, onSelect, onPosition, dark, me },
  ref,
) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const container = useRef<HTMLDivElement>(null),
    cy = useRef<Core | null>(null),
    worker = useRef<Worker | null>(null),
    latest = useRef({ data, onSelect, onPosition });
  latest.current = { data, onSelect, onPosition };
  const runLayout = () => {
    const c = cy.current;
    if (!c) return;
    worker.current?.terminate();
    const w = new Worker(
      new URL("../graph-engine/layout.worker.ts", import.meta.url),
    );
    worker.current = w;
    if (container.current) container.current.dataset.layout = "running";
    const nodes = c.nodes().map((n) => ({
      id: n.id(),
      x: n.position("x"),
      y: n.position("y"),
      fixed: n.locked(),
    }));
    w.onmessage = (
      event: MessageEvent<{ id: string; x: number; y: number }[]>,
    ) => {
      if (c.destroyed()) return;
      c.batch(() =>
        event.data.forEach((n) => {
          const node = c.getElementById(n.id);
          if (!node.locked()) node.position({ x: n.x, y: n.y });
        }),
      );
      c.fit(undefined, 80);
      if (container.current) container.current.dataset.layout = "ready";
      w.terminate();
    };
    w.postMessage({
      nodes,
      edges: c
        .edges()
        .map((e) => ({ source: e.source().id(), target: e.target().id() })),
    });
  };
  useImperativeHandle(ref, () => ({
    position: (id) => cy.current?.getElementById(id).position(),
    fit: () => cy.current?.fit(undefined, 70),
    zoom: (factor) => {
      const c = cy.current;
      if (c)
        c.zoom({
          level: c.zoom() * factor,
          renderedPosition: { x: c.width() / 2, y: c.height() / 2 },
        });
    },
    layout: runLayout,
    pause: () => worker.current?.terminate(),
    center: (id) => {
      const c = cy.current;
      if (c) {
        c.center(c.getElementById(id));
        c.zoom(Math.max(c.zoom(), 0.9));
      }
    },
    png: () => {
      const c = cy.current;
      if (c) {
        const a = document.createElement("a");
        a.download = "GraphLive.png";
        a.href = c.png({
          full: true,
          scale: 2,
          bg: dark ? "#111821" : "#f5f7fa",
        });
        a.click();
      }
    },
  }));
  useEffect(() => {
    if (!container.current) return;
    const c = cytoscape({
      container: container.current,
      elements: [],
      minZoom: 0.08,
      maxZoom: 3,
      selectionType: "single",
      boxSelectionEnabled: false,
    });
    cy.current = c;
    c.on("tap", "node", (e) => latest.current.onSelect(e.target.id()));
    c.on("mouseover taphold", "node", (e) => {
      const pos = e.target.renderedPosition();
      setHover({
        id: e.target.id(),
        x: Math.max(10, Math.min(pos.x + 20, c.width() - 260)),
        y: Math.max(75, Math.min(pos.y + 20, c.height() - 280)),
      });
    });
    c.on("mouseout drag pan zoom", () => setHover(null));
    c.on("dragfree", "node", (e) => {
      const p = e.target.position();
      latest.current.onPosition(e.target.id(), p.x, p.y);
    });
    return () => {
      worker.current?.terminate();
      c.destroy();
      cy.current = null;
    };
  }, []);
  const previousIds = useRef("");
  useEffect(() => {
    const c = cy.current;
    if (!c) return;
    const stats = metrics(data),
      max = Math.max(1, ...[...stats.values()].map((m) => m.degree));
    const savedPositions = new Map(
      c.nodes().map((n) => [n.id(), n.position()]),
    );
    const ids = data.people.map((p) => p.id).join(",");
    c.batch(() => {
      c.elements().remove();
      c.add(
        data.people.map((p, i) => {
          const m = stats.get(p.id)!;
          let score = m.degree;
          if (data.preferences.sizeMode === "importance")
            score = (p.profile.importance / 5) * max;
          if (data.preferences.sizeMode === "centrality")
            score = m.centrality * max;
          if (data.preferences.sizeMode === "combined")
            score = (m.degree + (p.profile.importance / 5) * max) / 2;
          const angle = i * 2.39996,
            radius = Math.sqrt(i) * 75;
          return {
            group: "nodes" as const,
            data: {
              id: p.id,
              label:
                (p.id === data.ownerId ? me : displayName(p)).slice(0, 22) +
                "\n" +
                (p.profile.birthYear ??
                  p.profile.birthDate?.slice(0, 4) ??
                  "N/A"),
              flags: p.profile.nationalities.map(flagUrl),
              color:
                p.id === data.ownerId
                  ? "#335eaa"
                  : colors[ownerRelationship(data, p.id)],
              size: nodeSize(score, max),
              owner: p.id === data.ownerId,
              bestFriend: ownerRelationship(data, p.id) === "bestFriend",
            },
            position: p.display.manualPosition ??
              savedPositions.get(p.id) ?? {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
              },
            locked: p.display.positionLocked,
          };
        }),
      );
      c.add(
        data.connections.map((e) => ({
          group: "edges" as const,
          data: {
            id: e.id,
            source: e.sourceId,
            target: e.targetId,
            color: colors[e.relationshipType],
            width: 0.7 + e.intensity * 0.55,
            opacity: 0.25 + e.frequency * 0.12,
            status: e.status,
          },
        })),
      );
    });
    if (previousIds.current !== ids) {
      previousIds.current = ids;
      runLayout();
    }
  }, [data, me]);
  useEffect(() => {
    const c = cy.current;
    if (!c) return;
    const style: StylesheetJson = [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          "background-image": (n: cytoscape.NodeSingular) =>
            n.data("flags").length ? n.data("flags") : "none",
          "background-width": 20,
          "background-height": 15,
          "background-position-x": "50%",
          "background-position-y": "100%",
          "background-offset-x": (n: cytoscape.NodeSingular) =>
            n
              .data("flags")
              .map(
                (_: string, i: number) =>
                  (i - (n.data("flags").length - 1) / 2) * 24,
              ),
          "background-offset-y": 64,
          "background-clip": "none",
          "bounds-expansion": 65,
          width: "data(size)",
          height: "data(size)",
          label: data.preferences.showLabels ? "data(label)" : "",
          "font-size": 13,
          "font-weight": 600,
          "font-family": "Arial",
          "text-wrap": "wrap",
          "text-valign": "bottom",
          "text-margin-y": 8,
          color: dark ? "#e5eaf3" : "#263447",
          "text-outline-width": 2,
          "text-outline-color": dark ? "#111821" : "#f5f7fa",
          "border-width": 2,
          "border-color": dark ? "#182331" : "#ffffff",
          "overlay-opacity": 0,
          "min-zoomed-font-size": 8,
        },
      },
      {
        selector: "node[?owner]",
        style: {
          "border-width": 5,
          "border-color": dark ? "#8eb5f0" : "#183c70",
        },
      },
      {
        selector: "node[?bestFriend]",
        style: {
          "underlay-color": "#D8B24A",
          "underlay-opacity": 0.12,
          "underlay-padding": 6,
        },
      },
      {
        selector: "edge",
        style: {
          "line-color": "data(color)",
          width: "data(width)",
          opacity: (e: cytoscape.EdgeSingular) => Number(e.data("opacity")),
          "curve-style": "haystack",
          "overlay-opacity": 0,
        },
      },
      {
        selector: 'edge[status != "confirmed"]',
        style: { "line-style": "dashed" },
      },
      { selector: ".muted", style: { opacity: 0.14 } },
      {
        selector: ".chosen",
        style: { "border-width": 5, "border-color": "#548bf0", "z-index": 10 },
      },
      {
        selector: ".route",
        style: { "line-color": "#548bf0", width: 5, opacity: 1 },
      },
      { selector: ".filtered", style: { display: "none" } },
    ];
    c.style(style);
    c.batch(() => {
      c.elements().removeClass("filtered muted chosen route");
      c.nodes().forEach((n) => {
        if (!visible.has(n.id())) n.addClass("filtered");
      });
      c.edges().forEach((e) => {
        if (!visible.has(e.source().id()) || !visible.has(e.target().id()))
          e.addClass("filtered");
      });
      if (selected) {
        const n = c.getElementById(selected),
          neighborhood = n.closedNeighborhood();
        c.elements().difference(neighborhood).addClass("muted");
        n.addClass("chosen");
      }
      if (path.length) {
        for (let i = 1; i < path.length; i++)
          c.getElementById(path[i - 1])
            .edgesWith(c.getElementById(path[i]))
            .addClass("route");
      }
    });
  }, [visible, selected, path, dark, data.preferences.showLabels]);
  useEffect(() => {
    const observer = new ResizeObserver(() => cy.current?.resize());
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const hovered = hover
    ? data.people.find((p) => p.id === hover.id)
    : undefined;
  const stat = hovered ? metrics(data).get(hovered.id) : undefined;
  return (
    <>
      <div
        ref={container}
        className="graph-canvas"
        role="img"
        aria-label="GraphLive"
      />
      {hover && hovered && stat && (
        <div
          className="graph-tooltip"
          role="tooltip"
          style={{ left: hover.x, top: hover.y }}
        >
          <strong>{displayName(hovered)}</strong>
          <span>
            {[hovered.profile.firstName, hovered.profile.lastName].join(" ")}
          </span>
          <span>{hovered.profile.nickname}</span>
          <span>
            {hovered.profile.birthYear ?? t("unknown")} ·{" "}
            {hovered.profile.nationalities.map((code) => (
              <Flag key={code} code={code} />
            ))}{" "}
            · {t(hovered.profile.contactMode)}
          </span>
          <span>{t(ownerRelationship(data, hovered.id))}</span>
          <dl>
            <dt>{t("connections")}</dt>
            <dd>{stat.degree}</dd>
            <dt>{t("affinity")}</dt>
            <dd>{stat.affinity ?? "—"}</dd>
            <dt>{t("intensity")}</dt>
            <dd>{stat.intensity?.toFixed(1) ?? "—"}</dd>
            <dt>{t("centrality")}</dt>
            <dd>{Math.round(stat.centrality * 100)}%</dd>
            <dt>{t("bridges")}</dt>
            <dd>{stat.bridges}</dd>
            <dt>{t("community")}</dt>
            <dd>{stat.community}</dd>
          </dl>
        </div>
      )}
    </>
  );
});

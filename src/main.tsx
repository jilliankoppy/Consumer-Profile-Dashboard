import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Chrome,
  Compass,
  Database,
  ExternalLink,
  FileJson,
  Fingerprint,
  Globe,
  Layers,
  LayoutDashboard,
  Link2,
  Menu,
  MessageCircle,
  Network,
  Plus,
  Search,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { Universe } from "./Universe";
import {
  categories,
  classify,
  domain,
  parseImport,
  recommendations,
  safeUrl,
  summarize,
  type Product,
  type RecordEntry,
} from "./analysis";
import "./style.css";
const sections = [
  ["Consumer overview", LayoutDashboard],
  ["Interest universe", Network],
  ["Digital footprint", Fingerprint],
  ["Shopping style", SlidersHorizontal],
  ["Consumer segments", Layers],
  ["Product discovery", Compass],
  ["Recommendations", ShoppingBag],
  ["AI vs. reality", MessageCircle],
  ["Data & privacy", Shield],
] as const;
function App() {
  const [page, setPage] = useState(0),
    [records, setRecords] = useState<RecordEntry[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [feedback, setFeedback] = useState<Record<string, string>>({}),
    [modal, setModal] = useState<"connect" | "import" | null>(null),
    [detail, setDetail] = useState<{
      records: RecordEntry[];
      label: string;
    } | null>(null),
    [light, setLight] = useState(false),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [period, setPeriod] = useState("all"),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(false),
    [days, setDays] = useState("30"),
    [productUrl, setProductUrl] = useState(""),
    [productName, setProductName] = useState(""),
    [productCategory, setProductCategory] = useState(""),
    [extensionReady, setExtensionReady] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const pending = useRef<string | null>(null);
  React.useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (
        e.source !== window ||
        e.origin !== location.origin ||
        e.data?.channel !== "orbit-extension"
      )
        return;
      if (e.data.type === "ready") setExtensionReady(true);
      if (e.data.requestId !== pending.current) return;
      if (e.data.type === "history") {
        pending.current = null;
        const p = parseImport(
          JSON.stringify(e.data.records),
          "Chrome connection",
        );
        setRecords((old) => [
          ...old.filter((r) => r.source !== "Chrome connection"),
          ...p.records,
        ]);
        setConnected(true);
        setBusy(false);
        setModal(null);
        setNotice(
          `${p.records.length.toLocaleString()} real Chrome history records connected. Data stays in this tab.`,
        );
      }
      if (e.data.type === "error") {
        pending.current = null;
        setBusy(false);
        setNotice(e.data.message || "Chrome permission was not granted.");
      }
    };
    window.addEventListener("message", handler);
    window.postMessage(
      { channel: "orbit-dashboard", type: "ping" },
      location.origin,
    );
    return () => window.removeEventListener("message", handler);
  }, []);
  React.useEffect(() => {
    if (!modal && !detail) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = document.querySelector<HTMLElement>(".modal");
    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input, select, summary, [tabindex="0"]',
        ) ?? [],
      );
    const timer = setTimeout(() => focusable()[0]?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setDetail(null);
      }
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal, detail]);
  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          (period === "all" ||
            (r.time !== null &&
              r.time >= Date.now() - Number(period) * 86400000)) &&
          (!query ||
            `${r.title} ${r.url}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [records, period, query],
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const matches = useMemo(
    () => recommendations(products, filtered, feedback),
    [products, filtered, feedback],
  );
  const sources = [...new Set(records.map((r) => r.source))];
  const dated = useMemo(
    () => filtered.filter((r) => r.time !== null),
    [filtered],
  );
  const rhythm = useMemo(() => {
    const hours = Array(24).fill(0) as number[];
    const week = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
    for (const r of dated) {
      const date = new Date(r.time!);
      hours[date.getHours()]++;
      week[date.getDay()][date.getHours()]++;
    }
    return { hours, week };
  }, [dated]);
  const select = (records: RecordEntry[], label: string) =>
    setDetail({ records, label });
  async function importFiles(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    let count = 0,
      productCount = 0;
    const notes: string[] = [];
    for (const file of Array.from(files)) {
      try {
        if (file.size > 30 * 1024 * 1024)
          throw Error("File exceeds the 30 MB limit.");
        const p = parseImport(await file.text(), file.name);
        setRecords((old) => {
          const keys = new Set(old.map((r) => `${r.url}|${r.title}|${r.time}`));
          return [
            ...old,
            ...p.records.filter((r) => {
              const key = `${r.url}|${r.title}|${r.time}`;
              if (keys.has(key)) return false;
              keys.add(key);
              return true;
            }),
          ];
        });
        setProducts((old) => [...old, ...p.products]);
        count += p.records.length;
        productCount += p.products.length;
        notes.push(...p.notes);
      } catch (e) {
        notes.push(`${file.name}: ${(e as Error).message}`);
      }
    }
    setNotice(
      `${count} records parsed · ${productCount} catalog products. Duplicate records are skipped. ${notes.join(" ")}`,
    );
    setBusy(false);
    setModal(null);
    if (upload.current) upload.current.value = "";
  }
  function connect() {
    if (!extensionReady) {
      setNotice(
        "Install the unpacked extension using the steps below, then reload this dashboard.",
      );
      return;
    }
    setBusy(true);
    pending.current = crypto.randomUUID();
    window.postMessage(
      {
        channel: "orbit-dashboard",
        type: "history",
        days: Number(days),
        requestId: pending.current,
      },
      location.origin,
    );
    setTimeout(() => {
      if (pending.current) {
        pending.current = null;
        setBusy(false);
        setNotice(
          "The extension did not respond. Check its permission and reload the dashboard.",
        );
      }
    }, 30000);
  }
  function disconnect() {
    pending.current = null;
    setBusy(false);
    window.postMessage(
      { channel: "orbit-dashboard", type: "disconnect" },
      location.origin,
    );
    setRecords((old) => old.filter((r) => r.source !== "Chrome connection"));
    setConnected(false);
    setNotice(
      "Chrome records removed. The extension has been asked to revoke history permission.",
    );
  }
  const empty = (title: string, text: string) => (
    <div className="empty-state">
      <div className="empty-icon">
        <Sparkles size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="primary" onClick={() => setModal("import")}>
        <Upload size={15} /> Import your data
      </button>
    </div>
  );
  return (
    <div className={light ? "app light" : "app"}>
      <input
        ref={upload}
        type="file"
        accept=".json,.csv"
        multiple
        hidden
        onChange={(e) => importFiles(e.target.files)}
      />
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage(0);
          }}
        >
          <div className="brand-mark">
            <Globe size={25} />
          </div>
          <span>
            orbit<span className="brand-dot">.</span>
          </span>
          <span className="lab-tag">LAB</span>
        </a>
        <div className="workspace">
          <div className="workspace-icon">O</div>
          <div>
            Personal workspace<small>Consumer intelligence</small>
          </div>
          <ChevronDown size={13} />
        </div>
        <div className="nav-label">EXPLORE YOUR WORLD</div>
        <nav>
          {sections.slice(0, 5).map(([label, Icon], i) => (
            <button
              key={label}
              className={page === i ? "active" : ""}
              onClick={() => {
                setPage(i);
                setMobile(false);
              }}
            >
              <Icon size={17} />
              {label}
              {i === 1 && <span className="new-tag">NEW</span>}
            </button>
          ))}
          <div className="nav-label second">DISCOVER & REFLECT</div>
          {sections.slice(5).map(([label, Icon], i) => (
            <button
              key={label}
              className={page === i + 5 ? "active" : ""}
              onClick={() => {
                setPage(i + 5);
                setMobile(false);
              }}
            >
              <Icon size={17} />
              {label}
              {i === 1 && matches.length > 0 && (
                <span className="count-tag">{matches.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <Shield size={19} />
            <strong>Your data. Your orbit.</strong>
            <p>
              Private by design. Analyzed locally.
              <br />
              Never shared or uploaded.
            </p>
            <button onClick={() => setPage(8)}>
              Explore privacy controls <ArrowUpRight size={12} />
            </button>
          </div>
          <button className="profile" onClick={() => setPage(8)}>
            <span className="avatar">Y</span>
            <span>
              Your personal lab<small>Local workspace</small>
            </span>
            <span className="status-dot" />
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{sections[page][0]}</strong>
          </div>
          <div className="top-actions">
            <span className="local-badge">
              <span className="live-dot" /> All data stays on your device
            </span>
            <button
              className="icon-button"
              aria-label="Toggle light mode"
              onClick={() => setLight(!light)}
            >
              <Sun size={17} />
            </button>
            <div className="top-avatar">Y</div>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> YOUR CONSUMER INTELLIGENCE LABORATORY
              </div>
              <h1>
                {
                  [
                    "A little data. A whole universe.",
                    "Your interests, interconnected.",
                    "The rhythm of your digital life.",
                    "The way you shop.",
                    "More than one kind of consumer.",
                    "Discover your next great find.",
                    "Made for your interests.",
                    "Does the data see the real you?",
                    "You’re in control.",
                  ][page]
                }
              </h1>
              <p>
                {
                  [
                    "Discover the patterns, preferences, and possibilities in your digital world.",
                    "Follow the connections between your activity and your emerging interests.",
                    "Explore when and where your attention goes.",
                    "Tentative interpretations, grounded in your own activity.",
                    "Explore overlapping affinities through transparent behavioral signals.",
                    "Bring real products into your personal intelligence lab.",
                    "Real products. Evidence-based matches. No invented recommendations.",
                    "Compare behavioral interpretations with what you know about yourself.",
                    "Connect intentionally. Understand what’s analyzed. Delete anything.",
                  ][page]
                }
              </p>
            </div>
            <button className="primary" onClick={() => setModal("connect")}>
              <Plus size={16} /> Connect data
            </button>
          </div>
          {notice && (
            <div className="notice" role="status">
              <Shield size={16} />
              <span>{notice}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {records.length === 0 && page === 0 && (
            <div className="welcome-banner">
              <div className="banner-orb">
                <Sparkles size={22} />
              </div>
              <div>
                <strong>Your next discovery starts with you.</strong>
                <p>
                  Connect Chrome or import your activity to uncover your unique
                  consumer profile.
                </p>
              </div>
              <button onClick={() => setModal("connect")}>
                Let’s get connected <ArrowRight size={16} />
              </button>
              <span className="banner-decoration">✧</span>
            </div>
          )}
          <div className="filter-row">
            <div className="view-label">
              <span className="live-dot" />
              {records.length ? "YOUR CONNECTED DATA" : "YOUR PERSONAL LAB"}
              <span className="pill">
                {records.length ? "Live session" : "Ready to connect"}
              </span>
            </div>
            <div className="filters">
              <label className="search">
                <Search size={14} />
                <input
                  placeholder="Search your activity…"
                  aria-label="Search activity"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Time period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="all">All time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>
          {page === 0 && (
            <>
              <div className="stats">
                {[
                  {
                    label: "Activity records",
                    value: filtered.length,
                    icon: Activity,
                    note: records.length
                      ? "Voluntarily provided records"
                      : "Your digital trail starts here",
                    color: "purple",
                  },
                  {
                    label: "Interest clusters",
                    value: summary.interests.length,
                    icon: Network,
                    note: "Connections waiting to unfold",
                    color: "pink",
                  },
                  {
                    label: "Websites explored",
                    value: summary.domains.length,
                    icon: Globe,
                    note: "A window into your world",
                    color: "blue",
                  },
                  {
                    label: "Product matches",
                    value: matches.length,
                    icon: ShoppingBag,
                    note: products.length
                      ? "Matched to your interest evidence"
                      : "Personalized, never fabricated",
                    color: "green",
                  },
                ].map(({ label, value, icon: Icon, note, color }) => (
                  <div className="stat-card" key={label}>
                    <div className="stat-top">
                      <span>{label}</span>
                      <span className={"stat-icon " + color}>
                        <Icon size={16} />
                      </span>
                    </div>
                    <strong>
                      {value.toLocaleString()}
                      <span className="stat-dash">{!value && "—"}</span>
                    </strong>
                    <small>{note}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel network-panel">
                  <div className="panel-header">
                    <div>
                      <h2>
                        <span className="tiny-orbit" /> Your interest universe
                      </h2>
                      <p>A living map of what makes you, you.</p>
                    </div>
                    <button className="text-button" onClick={() => setPage(1)}>
                      Explore universe <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <Universe
                    records={filtered}
                    onSelect={select}
                    search={query}
                  />
                  <div className="graph-legend">
                    {categories.slice(0, 4).map((c) => (
                      <span key={c.name}>
                        <i style={{ background: c.color }} />
                        {c.name}
                      </span>
                    ))}
                    <span className="legend-more">+ 2 categories</span>
                  </div>
                </section>
                <section className="panel profile-panel">
                  <div className="panel-header">
                    <div>
                      <h2>
                        <Fingerprint size={17} /> Your consumer DNA
                      </h2>
                      <p>The emerging picture of your preferences.</p>
                    </div>
                  </div>
                  <div className="dna-visual">
                    <div className="dna-ring r1" />
                    <div className="dna-ring r2" />
                    <div className="dna-ring r3" />
                    <div className="dna-center">
                      <Fingerprint size={43} />
                    </div>
                    <span className="dna-spark s1" />
                    <span className="dna-spark s2" />
                    <span className="dna-spark s3" />
                  </div>
                  <h3>
                    {summary.interests[0]?.name ??
                      "Uniquely you. Still unfolding."}
                  </h3>
                  <p className="dna-description">
                    {summary.interests.length
                      ? `${summary.classified} classified records across ${summary.interests.length} non-sensitive interest categories. These are tentative affinities, not personality measurements.`
                      : "Your interests are more than a label. Connect your data to see your profile take shape."}
                  </p>
                  <div className="confidence">
                    <span>Profile evidence</span>
                    <span>
                      {summary.classified >= 20
                        ? "Emerging"
                        : summary.classified
                          ? "Limited"
                          : "Not connected"}
                    </span>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${Math.min(100, summary.classified * 2)}%`,
                      }}
                    />
                  </div>
                  <button className="full-button" onClick={() => setPage(3)}>
                    Explore your shopping style <ArrowRight size={14} />
                  </button>
                </section>
              </div>
              <div className="bottom-grid">
                <section className="panel insight-panel">
                  <div className="panel-header">
                    <div>
                      <h2>
                        <Sparkles size={17} /> Signals worth exploring
                      </h2>
                      <p>Small patterns. Meaningful discoveries.</p>
                    </div>
                    <span className="subtle-tag">EXPLAINABLE BY DESIGN</span>
                  </div>
                  {summary.interests.length ? (
                    <div className="interest-list">
                      {summary.interests.slice(0, 3).map((c) => (
                        <button
                          key={c.name}
                          onClick={() => select(c.records, c.name)}
                        >
                          <i style={{ background: c.color }} />
                          <span>
                            {c.name}
                            <small>
                              Observed title and domain keyword matches
                            </small>
                          </span>
                          <strong>{c.records.length}</strong>
                          <ArrowUpRight size={15} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="signal-empty">
                      <div className="signal-bars">
                        {[24, 42, 30, 54, 38, 62, 45, 32, 51, 28, 40].map(
                          (h, i) => (
                            <i key={i} style={{ height: h }} />
                          ),
                        )}
                      </div>
                      <div>
                        <h3>The best insights come from real life.</h3>
                        <p>
                          Once you connect, we’ll surface the patterns behind
                          your interests.
                          <br />
                          Every insight comes with the evidence that supports
                          it.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
                <section className="panel next-panel">
                  <span className="eyebrow">BUILT AROUND YOUR PRIVACY</span>
                  <h2>
                    Intelligence without
                    <br />
                    the intrusion.
                  </h2>
                  <p>
                    Your browsing stays in your browser.
                    <br />
                    You choose what enters your orbit.
                  </p>
                  <button onClick={() => setPage(8)}>
                    How your data is protected <ArrowUpRight size={14} />
                  </button>
                  <Shield className="watermark" size={95} />
                </section>
              </div>
            </>
          )}
          {page === 1 && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Your interest universe</h2>
                  <p>
                    Drag nodes · pan the canvas · zoom in · select any node to
                    inspect its evidence.
                  </p>
                </div>
                <span className="subtle-tag">
                  {summary.interests.length} CATEGORY COMMUNITIES
                </span>
              </div>
              <Universe
                records={filtered}
                onSelect={select}
                search={query}
                large
              />
              <div className="graph-legend">
                {categories.map((c) => (
                  <span key={c.name}>
                    <i style={{ background: c.color }} />
                    {c.name}
                  </span>
                ))}
              </div>
              <p className="method-note">
                Connections represent title/domain keyword classifications. Node
                size reflects record count. Communities follow the six declared
                categories; they are not independently discovered psychological
                groups. Up to eight domains are shown per category.
              </p>
            </section>
          )}
          {page === 2 && (
            <>
              <div className="two-grid">
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Attention across the day</h2>
                      <p>
                        Local device time · {dated.length} records with known
                        timestamps
                      </p>
                    </div>
                  </div>
                  <div className="radial-chart">
                    <svg
                      viewBox="0 0 320 320"
                      aria-label="24-hour activity radial chart"
                    >
                      {[60, 90, 120].map((r) => (
                        <circle
                          key={r}
                          cx="160"
                          cy="160"
                          r={r}
                          fill="none"
                          stroke="currentColor"
                          opacity=".08"
                        />
                      ))}
                      {Array.from({ length: 24 }, (_, h) => {
                        const counts = rhythm.hours;
                        const a = ((h * 15 - 90) * Math.PI) / 180,
                          b = 40 + (counts[h] / Math.max(1, ...counts)) * 80;
                        return (
                          <line
                            key={h}
                            x1={160 + 40 * Math.cos(a)}
                            y1={160 + 40 * Math.sin(a)}
                            x2={160 + b * Math.cos(a)}
                            y2={160 + b * Math.sin(a)}
                            stroke={counts[h] ? "#a895ed" : "#383644"}
                            strokeWidth="9"
                            strokeLinecap="round"
                          >
                            <title>
                              {h}:00 · {counts[h]} records
                            </title>
                          </line>
                        );
                      })}
                      <text
                        x="160"
                        y="158"
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="24"
                      >
                        {dated.length}
                      </text>
                      <text
                        x="160"
                        y="180"
                        textAnchor="middle"
                        fill="#8d8b9f"
                        fontSize="10"
                      >
                        DATED RECORDS
                      </text>
                      <text
                        x="160"
                        y="20"
                        textAnchor="middle"
                        fill="#8d8b9f"
                        fontSize="10"
                      >
                        MIDNIGHT
                      </text>
                      <text
                        x="160"
                        y="309"
                        textAnchor="middle"
                        fill="#8d8b9f"
                        fontSize="10"
                      >
                        NOON
                      </text>
                    </svg>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Your most-visited destinations</h2>
                      <p>Observed record counts, not time spent.</p>
                    </div>
                  </div>
                  {summary.domains.length ? (
                    <div className="interest-list">
                      {summary.domains.slice(0, 8).map((d, i) => (
                        <button
                          key={d.name}
                          onClick={() => select(d.records, d.name)}
                        >
                          <span className="rank">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{d.name}</span>
                          <strong>{d.records.length}</strong>
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    empty(
                      "No destinations yet",
                      "Import browsing records to explore your digital footprint.",
                    )
                  )}
                </section>
              </div>
              <section className="panel heatmap-panel">
                <div className="panel-header">
                  <div>
                    <h2>Weekly activity rhythm</h2>
                    <p>
                      Hover each cell for the day, hour, and exact record count.
                    </p>
                  </div>
                </div>
                <div className="heatmap">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day, d) => (
                      <div className="heat-row" key={day}>
                        <span>{day}</span>
                        {Array.from({ length: 24 }, (_, h) => {
                          const n = rhythm.week[d][h];
                          return (
                            <div
                              tabIndex={0}
                              key={h}
                              aria-label={`${day} ${h}:00: ${n} records`}
                              title={`${day} ${h}:00 · ${n} records`}
                              style={{
                                background: n
                                  ? `rgba(173,145,245,${Math.min(0.95, 0.2 + n * 0.08)})`
                                  : undefined,
                              }}
                            />
                          );
                        })}
                      </div>
                    ),
                  )}
                  <div className="heat-labels">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                  </div>
                </div>
                <p className="method-note">
                  {filtered.length - dated.length} records have no usable
                  timestamp and are excluded from time-based charts. Frequency
                  does not establish intent, purchase, or attention duration.
                </p>
              </section>
            </>
          )}
          {page === 3 && (
            <div className="two-grid">
              {[
                {
                  title: "Research intensity",
                  icon: Search,
                  count: summary.shopping.length,
                  den: filtered.length,
                  method:
                    "Shopping-related records ÷ all records. Includes shop, buy, price, product, and common retailer keywords. This is a research proxy, not evidence of a purchase.",
                },
                {
                  title: "Destination exploration",
                  icon: Compass,
                  count: summary.domains.filter((d) => d.records.length === 1)
                    .length,
                  den: summary.domains.length,
                  method:
                    "Domains observed once ÷ all observed domains. A single visit can reflect incomplete coverage, rather than novelty seeking.",
                },
                {
                  title: "Repeat engagement",
                  icon: Link2,
                  count: summary.domains.filter((d) => d.records.length > 1)
                    .length,
                  den: summary.domains.length,
                  method:
                    "Domains with multiple records ÷ all domains. Repeated activity does not establish brand loyalty.",
                },
                {
                  title: "Price sensitivity",
                  icon: ShoppingBag,
                  count: 0,
                  den: 0,
                  method:
                    "Browsing alone cannot establish budget, willingness to pay, or premium versus value preferences. Verified price comparisons and purchase context are needed.",
                },
              ].map(({ title, icon: Icon, count, den, method }) => (
                <section className="panel tendency" key={title}>
                  <Icon size={23} />
                  <h2>{title}</h2>
                  <div className="tendency-value">
                    {den >= 5
                      ? `${Math.round((count / den) * 100)}%`
                      : "INSUFFICIENT DATA"}
                  </div>
                  <span className="subtle-tag">
                    TENTATIVE BEHAVIORAL SIGNAL
                  </span>
                  <p>{method}</p>
                  <button
                    className="text-button"
                    onClick={() =>
                      select(
                        title === "Research intensity"
                          ? summary.shopping
                          : filtered,
                        title,
                      )
                    }
                  >
                    Inspect evidence <ArrowUpRight size={14} />
                  </button>
                </section>
              ))}
            </div>
          )}
          {page === 4 && (
            <>
              <div className="explanation">
                <Layers size={20} />
                <p>
                  People overlap across interests. These memberships describe
                  observed category affinity, with a score of category records ÷
                  classified records. They are not demographic or sensitive
                  segments.
                </p>
              </div>
              {summary.classified < 5 ? (
                empty(
                  "Your segments are still taking shape",
                  "At least five classified records are needed to show tentative memberships.",
                )
              ) : (
                <div className="segment-grid">
                  {summary.interests.map((c) => (
                    <section className="panel segment" key={c.name}>
                      <div
                        className="segment-orbit"
                        style={{ borderColor: c.color, color: c.color }}
                      >
                        <span>
                          {Math.round(
                            (c.records.length / summary.classified) * 100,
                          )}
                          <small>%</small>
                        </span>
                      </div>
                      <h2>{c.name} explorer</h2>
                      <p>
                        {c.records.length} supporting records ·{" "}
                        {c.records.length < 10 ? "Limited" : "Emerging"}{" "}
                        evidence
                      </p>
                      <button
                        className="full-button"
                        onClick={() => select(c.records, c.name)}
                      >
                        See membership evidence <ArrowRight size={14} />
                      </button>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
          {page === 5 && (
            <>
              <div className="discovery-hero">
                <div className="empty-icon">
                  <Compass size={28} />
                </div>
                <h2>Good discoveries start with real products.</h2>
                <p>
                  Save a product link or import a catalog. Retailer pages aren’t
                  scraped.
                  <br />
                  Product details stay exactly as you provide them.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const url = safeUrl(productUrl);
                    if (!url) {
                      setNotice("Enter a valid HTTPS or HTTP product URL.");
                      return;
                    }
                    setProducts((old) => [
                      ...old,
                      {
                        id: crypto.randomUUID(),
                        url,
                        name: productName || domain(url),
                        category: productCategory,
                      },
                    ]);
                    setProductUrl("");
                    setProductName("");
                    setNotice(
                      "Product saved locally. No price or availability has been verified.",
                    );
                  }}
                >
                  <label>
                    Product URL
                    <input
                      required
                      type="url"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      placeholder="https://retailer.com/product"
                    />
                  </label>
                  <div className="two-grid">
                    <label>
                      Product name
                      <input
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Name from the product page"
                      />
                    </label>
                    <label>
                      Category
                      <select
                        value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}
                      >
                        <option value="">Select a category</option>
                        {categories.map((c) => (
                          <option key={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="primary" type="submit">
                    <Plus size={15} /> Save product
                  </button>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setModal("import")}
                  >
                    <Upload size={15} /> Import catalog
                  </button>
                </form>
              </div>
              {products.length > 0 && (
                <section className="panel">
                  <div className="panel-header">
                    <h2>Your product collection</h2>
                    <span>{products.length} real links</span>
                  </div>
                  <div className="product-grid">
                    {products.map((p) => (
                      <ProductCard
                        key={p.id}
                        p={p}
                        onDelete={() =>
                          setProducts((old) => old.filter((x) => x.id !== p.id))
                        }
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
          {page === 6 &&
            (matches.length ? (
              <>
                <div className="explanation">
                  <Sparkles size={20} />
                  <p>
                    Match score = 35 + 60 × category share, capped at 95. These
                    are keyword affinities, not a prediction of satisfaction.
                    Your “inaccurate” feedback removes that category from
                    recommendations. Prices are user-supplied and unverified.
                  </p>
                </div>
                <div className="product-grid">
                  {matches.map((p) => (
                    <ProductCard
                      key={p.id}
                      p={p}
                      score={p.score}
                      evidence={() =>
                        select(p.evidence, `${p.name} · ${p.interest}`)
                      }
                    />
                  ))}
                </div>
              </>
            ) : (
              empty(
                "Your next favorite needs a little context",
                "Connect activity and add real products to generate explainable category matches.",
              )
            ))}
          {page === 7 && (
            <>
              {summary.interests.length ? (
                <div className="two-grid">
                  {summary.interests.map((c) => (
                    <section className="panel feedback-card" key={c.name}>
                      <span className="subtle-tag">
                        INFERRED INTEREST · {c.records.length} RECORDS
                      </span>
                      <h2>
                        You may be interested in
                        <br />
                        <span style={{ color: c.color }}>
                          {c.name.toLowerCase()}.
                        </span>
                      </h2>
                      <p>
                        Based on title and domain keywords. A visit may reflect
                        work, curiosity, or someone else’s needs.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => select(c.records, c.name)}
                      >
                        Inspect supporting evidence <ArrowUpRight size={14} />
                      </button>
                      <div className="feedback-actions">
                        {["accurate", "inaccurate", "uncertain"].map((v) => (
                          <button
                            key={v}
                            className={feedback[c.name] === v ? "selected" : ""}
                            onClick={() =>
                              setFeedback((f) => ({ ...f, [c.name]: v }))
                            }
                          >
                            {feedback[c.name] === v && <Check size={13} />} {v}
                          </button>
                        ))}
                      </div>
                      {feedback[c.name] && (
                        <small className="feedback-result">
                          Your view: {feedback[c.name]}.{" "}
                          {feedback[c.name] === "inaccurate"
                            ? "This category is excluded from product matching."
                            : "Saved for this session alongside the observed evidence."}
                        </small>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                empty(
                  "A conversation with your data",
                  "Connect records to review and correct your inferred interests.",
                )
              )}
            </>
          )}
          {page === 8 && (
            <>
              <div className="privacy-hero">
                <Shield size={32} />
                <div>
                  <h2>A private lab, by design.</h2>
                  <p>
                    Records live in this tab’s memory. Refreshing or closing the
                    tab clears them. No analytics, external AI calls, or
                    automatic account access. No raw personal data is stored by
                    default.
                  </p>
                </div>
              </div>
              <div className="two-grid">
                <section className="panel">
                  <div className="panel-header">
                    <h2>Data connections</h2>
                    <button
                      className="text-button"
                      onClick={() => setModal("connect")}
                    >
                      <Plus size={14} /> Add source
                    </button>
                  </div>
                  <div className="source-row">
                    <Chrome size={21} />
                    <div>
                      <strong>Chrome history</strong>
                      <small>
                        {connected
                          ? "Connected for this session"
                          : "Not connected · permission required"}
                      </small>
                    </div>
                    {connected ? (
                      <button className="secondary" onClick={disconnect}>
                        Disconnect
                      </button>
                    ) : (
                      <button
                        className="secondary"
                        onClick={() => setModal("connect")}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                  {sources
                    .filter((s) => s !== "Chrome connection")
                    .map((source) => (
                      <div className="source-row" key={source}>
                        <FileJson size={21} />
                        <div>
                          <strong>{source}</strong>
                          <small>
                            {records.filter((r) => r.source === source).length}{" "}
                            records
                          </small>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Remove ${source}`}
                          onClick={() =>
                            setRecords((old) =>
                              old.filter((r) => r.source !== source),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  <div className="source-row">
                    <ShoppingBag size={21} />
                    <div>
                      <strong>Product catalog</strong>
                      <small>
                        {products.length} products · user supplied, unverified
                      </small>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Clear product catalog"
                      onClick={() => setProducts([])}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </section>
                <section className="panel privacy-details">
                  <h2>What your profile knows</h2>
                  <dl>
                    <div>
                      <dt>Real records in memory</dt>
                      <dd>{records.length}</dd>
                    </div>
                    <div>
                      <dt>Records with timestamps</dt>
                      <dd>{records.filter((r) => r.time).length}</dd>
                    </div>
                    <div>
                      <dt>Keyword-classified records</dt>
                      <dd>{summarize(records).classified}</dd>
                    </div>
                    <div>
                      <dt>External AI services</dt>
                      <dd>None</dd>
                    </div>
                    <div>
                      <dt>Persistent personal storage</dt>
                      <dd>Off</dd>
                    </div>
                  </dl>
                  <button
                    className="danger"
                    onClick={() => {
                      if (
                        confirm(
                          "Delete all records, product catalogs, and feedback from this session?",
                        )
                      ) {
                        disconnect();
                        setRecords([]);
                        setProducts([]);
                        setFeedback({});
                        setDetail(null);
                        setNotice("All personal session data deleted.");
                      }
                    }}
                  >
                    <Trash2 size={15} /> Delete all session data
                  </button>
                </section>
              </div>
              <section className="panel">
                <div className="panel-header">
                  <h2>Record-level control</h2>
                  <span>{filtered.length} filtered records</span>
                </div>
                {filtered.length ? (
                  <div className="record-table">
                    {filtered.slice(0, 100).map((r) => (
                      <div key={r.id}>
                        <Globe size={16} />
                        <div>
                          <strong>{r.title}</strong>
                          <small>
                            {domain(r.url)} ·{" "}
                            {r.time
                              ? new Date(r.time).toLocaleString()
                              : "Date unknown"}{" "}
                            · {r.source}
                          </small>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Delete record ${r.title}`}
                          onClick={() => {
                            setRecords((old) =>
                              old.filter((x) => x.id !== r.id),
                            );
                            setDetail(null);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="method-note">
                    No records in this view. You decide what to connect.
                  </p>
                )}
                <p className="method-note">
                  Showing up to 100 records. Use search and period filters to
                  find a record.
                </p>
              </section>
            </>
          )}
          <footer>
            <span>
              <span className="footer-orbit">✦</span> Made for curiosity.
              Designed for privacy.
            </span>
            <span>
              ORBIT INTELLIGENCE LAB{" "}
              <span className="footer-version">v1.0</span>
            </span>
          </footer>
        </div>
      </main>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "connect"
                ? "Connect your data"
                : "Import personal records"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal icon-button"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">YOUR UNIVERSE STARTS HERE</span>
            <h2>
              {modal === "connect"
                ? "Connect on your terms."
                : "Bring your own data."}
            </h2>
            <p>
              Only records you explicitly choose are analyzed. Everything stays
              in this tab and is cleared when you reload.
            </p>
            {modal === "connect" ? (
              <>
                <div className="connect-option">
                  <Chrome size={25} />
                  <div>
                    <h3>Connect Chrome history</h3>
                    <p>
                      Read website URLs, titles, and visit times for your chosen
                      period. No passwords, cookies, or account tokens. Up to
                      10,000 URLs; last visit per URL, not a complete visit log.
                    </p>
                  </div>
                  <span className="pill">
                    {extensionReady ? "Detected" : "Extension required"}
                  </span>
                </div>
                <label className="field-label">
                  History coverage
                  <select
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </label>
                <button
                  className="primary full"
                  disabled={busy}
                  onClick={connect}
                >
                  <Chrome size={16} />
                  {busy
                    ? "Waiting for Chrome permission…"
                    : "Approve & analyze my history"}
                </button>
                {!extensionReady && (
                  <details className="install-details">
                    <summary>
                      Install the test extension <ArrowDownToLine size={14} />
                    </summary>
                    <ol>
                      <li>
                        Download and unzip the{" "}
                        <a
                          href={`${import.meta.env.BASE_URL}orbit-extension.zip`}
                          download
                        >
                          extension package
                        </a>
                        .
                      </li>
                      <li>
                        Open Chrome’s Extensions page, enable Developer mode,
                        and choose “Load unpacked.” Select the extracted folder.
                      </li>
                      <li>
                        Return here and reload. Click “Approve & analyze” to
                        approve optional history access.
                      </li>
                    </ol>
                    <p>
                      Temporary developer installation. No Chrome Web Store
                      listing has been published. Only this repository’s GitHub
                      Pages origin and local development are supported.
                    </p>
                  </details>
                )}
                <div className="modal-divider">OR CONNECT AN EXPORT</div>
                <button
                  className="import-choice"
                  onClick={() => setModal("import")}
                >
                  <Upload size={20} />
                  <span>
                    Import your records
                    <small>Google Takeout, ChatGPT, browsing & catalogs</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <div
                  className="dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    importFiles(e.dataTransfer.files);
                  }}
                >
                  <Upload size={29} />
                  <h3>Drop your CSV or JSON export</h3>
                  <p>
                    Up to 30 MB per file. Preview the file locally before
                    importing;
                    <br />
                    it may include sensitive personal content.
                  </p>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => upload.current?.click()}
                  >
                    {busy ? "Reading your file…" : "Choose files"}
                  </button>
                </div>
                <details className="install-details">
                  <summary>Supported formats & analysis limits</summary>
                  <p>
                    Chrome / Takeout: Browser History arrays with url, title,
                    time_usec. Activity: titleUrl, title, time. CSV / JSON: url,
                    title, timestamp (ISO or Unix). ChatGPT: conversations.json
                    with mapping; only user messages are considered, excluding
                    quoted lines, quoted strings, and code blocks. Nested quoted
                    material may still need manual removal. Order exports:
                    normalize to url, title, date. Catalogs: name, url,
                    category, price, image; prices remain unverified. Arbitrary
                    retailer-specific formats are not supported.
                  </p>
                </details>
              </>
            )}
            <div className="modal-privacy">
              <Shield size={14} /> No upload. No tracking. No fictional
              profiles.
            </div>
          </div>
        </div>
      )}
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div
            className="modal evidence-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Supporting evidence"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal icon-button"
              aria-label="Close evidence"
              onClick={() => setDetail(null)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">OBSERVED EVIDENCE</span>
            <h2>{detail.label}</h2>
            <p>
              {detail.records.length} supporting records. Interest links use
              explicit non-sensitive title/domain keywords. Unknown and
              sensitive topics are left unclassified. Category matching is
              uncertain and cannot establish purchases or intent.
            </p>
            <div className="record-table">
              {detail.records.slice(0, 100).map((r) => (
                <div key={r.id}>
                  <Globe size={16} />
                  <div>
                    <strong>{r.title}</strong>
                    <small>
                      {domain(r.url)} ·{" "}
                      {r.time
                        ? new Date(r.time).toLocaleDateString()
                        : "Date unknown"}
                      <br />
                      {classify(r) || "Unclassified"} · {r.source}
                    </small>
                  </div>
                  {r.url && (
                    <a
                      aria-label={`Open ${r.title}`}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
            {!detail.records.length && (
              <div className="insufficient">
                INSUFFICIENT DATA · Connect records to see evidence.
              </div>
            )}
            <p className="method-note">
              Up to 100 records shown. Keyword rules may miss or misclassify
              activity. Feedback changes matching, not the underlying
              observations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
function ProductCard({
  p,
  score,
  evidence,
  onDelete,
}: {
  p: Product;
  score?: number;
  evidence?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="panel product-card">
      <div className="product-art">
        <ShoppingBag size={40} />
        <span>No image loaded · avoids third-party tracking</span>
        {score && <b>{score}% match</b>}
      </div>
      <div className="product-body">
        <span className="eyebrow">{p.category || "UNCATEGORIZED"}</span>
        <h3>{p.name}</h3>
        <p>
          {p.price
            ? `${p.price} · imported, unverified`
            : "Price & availability unverified"}
        </p>
        <a href={p.url} target="_blank" rel="noreferrer">
          View at {domain(p.url)} <ExternalLink size={13} />
        </a>
        {evidence && (
          <button className="full-button" onClick={evidence}>
            Why this match? <Sparkles size={13} />
          </button>
        )}
        {onDelete && (
          <button className="text-button" onClick={onDelete}>
            <Trash2 size={13} /> Remove product
          </button>
        )}
      </div>
    </article>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

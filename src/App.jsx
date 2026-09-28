import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  LayoutDashboard,
  Pickaxe,
  Crown,
  History,
  BookOpen,
  ExternalLink,
  Wallet,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  X,
  Check,
  Copy,
  Zap,
  ShieldCheck,
  Menu,
  Globe,
  CheckCheck,
  LogOut,
  CircleDot,
} from "lucide-react";
import {
  DEMO_SESSION_MS,
  STORAGE_KEY,
  initialState,
  readState,
  transition,
} from "./domain.js";

const format = (n) => n.toLocaleString("en-US");
const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "mining", label: "Mining station", icon: Pickaxe },
  { id: "membership", label: "Membership", icon: Crown },
  { id: "activity", label: "Activity", icon: History },
];

function Eagle({ hero = false }) {
  return (
    <svg
      className={hero ? "eagle-art" : "eagle-logo"}
      viewBox="0 0 360 300"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={hero ? "wing-hero" : "wing-logo"}
          x1="180"
          y1="35"
          x2="180"
          y2="275"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d5ffa0" />
          <stop offset="1" stopColor="#75a63b" />
        </linearGradient>
      </defs>
      <g fill={`url(#${hero ? "wing-hero" : "wing-logo"})`}>
        <path d="M172 127 34 52 65 118 146 157 48 113 82 169 153 184 79 163 111 208 164 206 149 248 180 277 212 247 196 206 250 208 282 163 207 184 278 169 312 113 214 157 295 118 327 52 188 127 190 89 173 80 155 86 174 96z" />
        <path d="m181 102 32-8-10 20-18 5z" />
      </g>
      <path d="m175 149 5 85 8-90-7 12z" fill="#152013" opacity=".7" />
      {hero && (
        <>
          <path
            d="m37 52 132 100M325 53 191 152M111 208l52-12M249 208l-51-12"
            stroke="#e1ffc2"
            strokeOpacity=".6"
          />
          <path d="m182 98 8-2-4 7z" fill="#121a0d" />
        </>
      )}
    </svg>
  );
}
function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.focus();
    const handle = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
          'button, a[href], input, [tabindex="0"]',
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={ref}
      >
        <button
          className="icon-button modal-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <div className="modal-symbol">
          <Eagle />
        </div>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("overview");
  const [state, setState] = useState(() => {
    try {
      return readState(window.localStorage);
    } catch {
      return initialState();
    }
  });
  const [now, setNow] = useState(Date.now());
  const [modal, setModal] = useState(null);
  const closeModal = useCallback(() => setModal(null), []);
  const [mobile, setMobile] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("all");
  const [storageError, setStorageError] = useState(false);
  const premium = state.premiumUntil > now;
  const elapsed = state.session
    ? Math.max(0, now - state.session.startedAt)
    : 0;
  const ready = state.session && elapsed >= DEMO_SESSION_MS;
  const progress = Math.min(100, (elapsed / DEMO_SESSION_MS) * 100);
  const remaining = Math.max(0, Math.ceil((DEMO_SESSION_MS - elapsed) / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;
    const clearWallet = () => {
      setWallet(null);
    };
    provider.on("accountsChanged", clearWallet);
    provider.on("chainChanged", clearWallet);
    provider.on("disconnect", clearWallet);
    return () => {
      provider.removeListener?.("accountsChanged", clearWallet);
      provider.removeListener?.("chainChanged", clearWallet);
      provider.removeListener?.("disconnect", clearWallet);
    };
  }, []);
  function navigate(next) {
    setPage(next);
    setMobile(false);
    window.scrollTo(0, 0);
  }
  function act(action) {
    setState((current) => transition(current, action));
    setNow(Date.now());
    if (action === "start")
      setToast(
        "Demo session started. Your reward will be ready in 30 seconds.",
      );
    if (action === "claim") setToast("Demo rewards added to your balance.");
    if (action === "premium") {
      setToast("Welcome to Eagle Elite. Your next session earns 3× rewards.");
      setModal(null);
    }
  }
  async function connect() {
    setWalletError("");
    if (!window.ethereum?.request) {
      setWalletError(
        "No browser wallet detected. Open this page in a wallet browser or install a BNB-compatible wallet. You can still explore the demo.",
      );
      return;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const chain = await window.ethereum.request({ method: "eth_chainId" });
      if (!["0x38", "0x61"].includes(chain))
        throw new Error(
          "Select BNB Smart Chain or BNB Smart Chain Testnet in your wallet, then reconnect.",
        );
      if (!accounts[0])
        throw new Error(
          "No account selected. Please select an account in your wallet.",
        );
      setWallet({ address: accounts[0], chain });
      setModal(null);
      setToast("Wallet connected. Rewards and membership remain in demo mode.");
    } catch (error) {
      setWalletError(
        error.code === 4001
          ? "Connection declined. You can try again when ready."
          : error.message || "Could not connect to the wallet.",
      );
    } finally {
      setConnecting(false);
    }
  }
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setToast("Wallet address copied.");
    } catch {
      setWalletError("Clipboard unavailable. Copy the address shown below.");
    }
  }
  const renderMiningCard = () => (
    <section className="panel mining-panel">
      <div className="panel-heading">
        <h2>
          <Pickaxe size={18} /> Your mining station
        </h2>
        <span className={`status ${state.session ? "active" : ""}`}>
          <i />
          {ready
            ? "Ready to claim"
            : state.session
              ? "Mining active"
              : "Ready to mine"}
        </span>
      </div>
      <div className="mining-content">
        <div
          className={`mining-orbit ${state.session && !ready ? "spinning" : ""}`}
        >
          <div className="orbit-center">
            <Eagle />
          </div>
          <span className="orbit-spark">
            <Zap size={15} fill="currentColor" />
          </span>
        </div>
        <div className="mining-details">
          <span className="eyebrow">
            {ready
              ? "YOUR REWARD IS READY"
              : state.session
                ? "SESSION IN PROGRESS"
                : "YOUR NEXT FLIGHT STARTS HERE"}
          </span>
          <h3>
            {ready
              ? format(state.session.reward)
              : state.session
                ? `00:${String(remaining).padStart(2, "0")}`
                : format(premium ? 3600 : 1200)}
            <span>
              {state.session && !ready ? "remaining" : "EAGLE / session"}
            </span>
          </h3>
          <p>
            {state.session
              ? "Rewards are fixed when your session starts."
              : "Start a session. Spread your wings. Earn EAGLE."}
          </p>
        </div>
      </div>
      <div className="progress-label">
        <span>
          {state.session
            ? "Session progress"
            : "A little consistency. A higher altitude."}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${progress}%` }} />
      </div>
      <button
        className="button primary full"
        disabled={Boolean(state.session && !ready)}
        onClick={() => act(ready ? "claim" : "start")}
      >
        {ready ? <CheckCheck size={17} /> : <Pickaxe size={17} />}{" "}
        {ready
          ? "Claim demo rewards"
          : state.session
            ? "Mining in progress"
            : "Start mining"}
        {!state.session && <ArrowRight size={17} />}
      </button>
      <p className="card-footnote">
        <CircleDot size={12} /> Demo: 30 seconds per session · Live design: 24
        hours
      </p>
    </section>
  );
  const renderPremiumCard = () => (
    <section className="panel premium-panel">
      <div className="panel-heading">
        <span className="premium-label">
          <Crown size={16} /> EAGLE ELITE
        </span>
        <span className="tiny-pill">{premium ? "ACTIVE" : "PREMIUM"}</span>
      </div>
      <h2>
        Same wings.
        <br />
        <span>Higher altitude.</span>
      </h2>
      <p>
        Make every flight count with more
        <br className="desktop-break" /> rewards and an elevated experience.
      </p>
      <div className="perks">
        <span>
          <Check size={15} /> 3× mining rewards
        </span>
        <span>
          <Check size={15} /> Exclusive Elite profile badge
        </span>
        <span>
          <Check size={15} /> 30 days of premium access
        </span>
      </div>
      <button
        className="button premium-button full"
        onClick={() => setModal("premium")}
      >
        {premium ? "View your membership" : "Explore premium"}
        <ArrowUpRight size={17} />
      </button>
    </section>
  );
  const renderActivityTable = (full = false) => {
    const items = state.history.filter(
      (i) => !full || filter === "all" || i.type === filter,
    );
    return (
      <section className="panel activity-panel">
        <div className="panel-heading">
          <h2>
            Recent activity{" "}
            <span className="count">{state.history.length}</span>
          </h2>
          {!full && (
            <button
              className="text-button"
              onClick={() => navigate("activity")}
            >
              View all <ArrowUpRight size={14} />
            </button>
          )}
          {full && (
            <select
              aria-label="Filter activity"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All activity</option>
              <option value="reward">Mining rewards</option>
              <option value="premium">Membership</option>
            </select>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, full ? 50 : 4).map((item, index) => (
                <tr key={`${item.at}-${index}`}>
                  <td>
                    <span className="transaction-icon">
                      {item.type === "reward" ? (
                        <Pickaxe size={16} />
                      ) : (
                        <Crown size={16} />
                      )}
                    </span>
                    {item.type === "reward"
                      ? "Mining reward"
                      : "Eagle Elite activated"}
                  </td>
                  <td>
                    {new Date(item.at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="amount">
                    {item.type === "reward"
                      ? `+${format(item.amount)} EAGLE`
                      : "Demo upgrade"}
                  </td>
                  <td>
                    <span className="complete-badge">Completed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && (
          <div className="empty-state">
            <History size={25} />
            <div>
              <strong>
                {filter === "all"
                  ? "Your journey is just taking off"
                  : "No matching activity yet"}
              </strong>
              <p>
                {filter === "all"
                  ? "Your mining rewards and membership activity will appear here."
                  : "Try another filter or complete a demo action."}
              </p>
            </div>
            {!full && (
              <button
                className="icon-button"
                aria-label="Go to mining station"
                onClick={() => navigate("mining")}
              >
                <ArrowRight size={19} />
              </button>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="app-shell">
      {mobile && (
        <div className="sidebar-scrim" onClick={() => setMobile(false)} />
      )}
      <aside id="main-sidebar" className={`sidebar ${mobile ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <Eagle />
          <span>
            EAGLE <b>i</b>
            <small>RISE ABOVE.</small>
          </span>
        </a>
        <div className="workspace-label">YOUR NEST</div>
        <nav aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              className={`nav-item ${page === id ? "selected" : ""}`}
              key={id}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "membership" && <span className="nav-new">PRO</span>}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">EXPLORE</div>
        <button className="nav-item" onClick={() => setModal("guide")}>
          <BookOpen size={19} />
          <span>Flight guide</span>
          <ArrowUpRight size={14} />
        </button>
        <a
          className="nav-item"
          href="https://testnet.bscscan.com/"
          target="_blank"
          rel="noreferrer"
        >
          <Globe size={19} />
          <span>BNB explorer</span>
          <ArrowUpRight size={14} />
        </a>
        <div className="sidebar-bottom">
          <div className="community-card">
            <div className="community-icon">
              <Eagle />
            </div>
            <h3>Built for the flock.</h3>
            <p>
              A little meme.
              <br />A whole lot of possibility.
            </p>
            <button onClick={() => setModal("about")}>
              Meet EAGLE i <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="help-link" onClick={() => setModal("guide")}>
            <CircleHelp size={17} /> Need a wing?
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-network">
            <span />
            <span>Built on BNB Chain</span>
            <ShieldCheck size={14} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label={mobile ? "Close navigation" : "Open navigation"}
              aria-expanded={mobile}
              aria-controls="main-sidebar"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="header-actions">
            <button
              className="network-pill"
              aria-label="BNB Chain network"
              onClick={() => setModal("network")}
            >
              <span className="bnb-mark">◆</span>
              <span>BNB Chain</span>
              <ChevronDown size={13} />
            </button>
            <button
              className="button wallet-button"
              onClick={() => {
                setWalletError("");
                setModal("wallet");
              }}
            >
              <Wallet size={16} />
              {wallet ? short(wallet.address) : "Connect wallet"}
            </button>
          </div>
        </header>
        <main>
          <div className="page-title">
            <div>
              <div className="eyebrow greeting">
                A NEW PERSPECTIVE. A NEW ALTITUDE.
              </div>
              <h1>
                {page === "overview"
                  ? "Welcome to your nest."
                  : page === "mining"
                    ? "Let your rewards take flight."
                    : page === "membership"
                      ? "A class above the flock."
                      : "Every flight, recorded."}
              </h1>
              <p>
                {page === "overview"
                  ? "Mine EAGLE. Unlock more. Rise together."
                  : page === "mining"
                    ? "Start a session and return to collect your EAGLE rewards."
                    : page === "membership"
                      ? "Find your wings with a membership that fits."
                      : "Your demo rewards and membership history, all in one place."}
              </p>
            </div>
            <button className="demo-badge" onClick={() => setModal("demo")}>
              <span />
              Interactive demo
              <CircleHelp size={13} />
            </button>
          </div>
          {storageError && (
            <p role="alert" className="error">
              Browser storage is unavailable. Your demo progress will reset when
              this page closes.
            </p>
          )}
          {page === "overview" && (
            <>
              <section className="hero">
                <div className="hero-grid" />
                <div className="hero-content">
                  <span className="hero-kicker">
                    <span /> A MEMECOIN WITH A HIGHER CALLING
                  </span>
                  <h2>
                    Small beginnings.
                    <br />
                    Limitless <span>altitude.</span>
                  </h2>
                  <p>
                    Welcome to EAGLE i. The BNB Chain flock
                    <br />
                    where your next chapter takes flight.
                  </p>
                  <button
                    className="button hero-button"
                    onClick={() => navigate("mining")}
                  >
                    Let’s take flight <ArrowUpRight size={17} />
                  </button>
                  <span className="hero-bottom">
                    COMMUNITY POWERED <i /> BNB CHAIN NATIVE
                  </span>
                </div>
                <div className="hero-visual">
                  <div className="radar-ring ring-one" />
                  <div className="radar-ring ring-two" />
                  <div className="radar-ring ring-three" />
                  <span className="orbit-label label-top">
                    EST. 2026 <span>↗</span>
                  </span>
                  <Eagle hero />
                  <span className="orbit-label label-bottom">
                    $EAGLE <span>RISE ABOVE</span>
                  </span>
                  <span className="crosshair cross-one">+</span>
                  <span className="crosshair cross-two">+</span>
                </div>
              </section>
              <div className="stats-grid">
                <section className="stat-card">
                  <div className="stat-top">
                    <span>Available balance</span>
                    <span className="stat-icon">
                      <Wallet size={17} />
                    </span>
                  </div>
                  <div className="stat-value">
                    {format(state.balance)} <small>EAGLE</small>
                  </div>
                  <div className="stat-sub">
                    <span className="green-dot" />
                    Your demo mining rewards
                  </div>
                </section>
                <section className="stat-card">
                  <div className="stat-top">
                    <span>Mining rate</span>
                    <span className="stat-icon">
                      <Zap size={18} />
                    </span>
                  </div>
                  <div className="stat-value">
                    {premium ? "150" : "50"} <small>EAGLE / hr</small>
                    {premium && <span className="boost-tag">3×</span>}
                  </div>
                  <div className="stat-sub">
                    {format(premium ? 3600 : 1200)} EAGLE per live 24-hour
                    session
                  </div>
                </section>
                <section className="stat-card">
                  <div className="stat-top">
                    <span>Your membership</span>
                    <span className="stat-icon gold">
                      <Crown size={18} />
                    </span>
                  </div>
                  <div className="stat-value membership-value">
                    {premium ? "Eagle Elite" : "Explorer"}
                    <span className="plan-tag">
                      {premium ? "ELITE" : "FREE"}
                    </span>
                  </div>
                  <button
                    className="stat-link"
                    onClick={() => navigate("membership")}
                  >
                    {premium ? "See your membership" : "Upgrade to soar higher"}
                    <ArrowUpRight size={13} />
                  </button>
                </section>
              </div>
              <div className="dashboard-grid">
                {renderMiningCard()}
                {renderPremiumCard()}
              </div>
              {renderActivityTable()}
            </>
          )}
          {page === "mining" && (
            <>
              <div className="dashboard-grid mining-page">
                {renderMiningCard()}
                <section className="panel how-panel">
                  <span className="eyebrow">THE FLIGHT PLAN</span>
                  <h2>Three steps to take off.</h2>
                  {[
                    [
                      "Start your session",
                      "One active session at a time. Your reward rate is locked when you begin.",
                    ],
                    [
                      "Give your wings a moment",
                      "Demo sessions run for 30 seconds. The live contract uses 24-hour sessions.",
                    ],
                    [
                      "Collect your EAGLE",
                      "Claim your completed session, then start your next flight.",
                    ],
                  ].map(([title, body], i) => (
                    <div className="step" key={title}>
                      <span>0{i + 1}</span>
                      <div>
                        <h3>{title}</h3>
                        <p>{body}</p>
                      </div>
                    </div>
                  ))}
                  <div className="info-note">
                    <ShieldCheck size={18} />
                    <p>
                      Mining means participation rewards. Your device does not
                      perform proof-of-work mining.
                    </p>
                  </div>
                </section>
              </div>
              {renderActivityTable()}
            </>
          )}
          {page === "membership" && (
            <>
              <div className="membership-grid">
                <section className="panel plan-card">
                  <span className="eyebrow">A PLACE IN THE FLOCK</span>
                  <h2>Explorer</h2>
                  <p>Everything you need to begin.</p>
                  <div className="plan-price">
                    Free <small>forever</small>
                  </div>
                  <ul>
                    <li>
                      <Check />
                      1,200 EAGLE per session
                    </li>
                    <li>
                      <Check />
                      One session every 24 hours in live design
                    </li>
                    <li>
                      <Check />
                      Your personal mining dashboard
                    </li>
                    <li>
                      <Check />
                      Complete activity history
                    </li>
                  </ul>
                  <button
                    className="button secondary full"
                    onClick={() => navigate("mining")}
                  >
                    {premium ? "Go to mining station" : "Start with Explorer"}
                    <ArrowRight size={16} />
                  </button>
                </section>
                <section className="panel plan-card elite-plan">
                  <div className="panel-heading">
                    <span className="premium-label">
                      <Crown size={17} /> EAGLE ELITE
                    </span>
                    <span className="tiny-pill">3× REWARDS</span>
                  </div>
                  <h2>Fly a little higher.</h2>
                  <p>More rewards with every session.</p>
                  <div className="plan-price">
                    0.01 <small>BNB / 30 days</small>
                  </div>
                  <ul>
                    <li>
                      <Check />
                      3,600 EAGLE per session
                    </li>
                    <li>
                      <Check />
                      Exclusive Elite profile badge
                    </li>
                    <li>
                      <Check />
                      30 days of premium membership
                    </li>
                    <li>
                      <Check />
                      No automatic renewal
                    </li>
                  </ul>
                  <button
                    className="button primary full"
                    onClick={() => setModal("premium")}
                  >
                    {premium ? "View active membership" : "Try Elite in demo"}
                    <ArrowUpRight size={17} />
                  </button>
                  <p className="card-footnote">
                    Proposed live price. Demo upgrade is free.
                  </p>
                </section>
              </div>
              <div className="info-note membership-note">
                <CircleHelp size={20} />
                <p>
                  Upgrading applies the 3× rate to new sessions. Any session
                  already in progress keeps its original reward. Rewards are
                  tokens, with no guaranteed market value.
                </p>
              </div>
            </>
          )}
          {page === "activity" && renderActivityTable(true)}
          <footer>
            <span>
              © {new Date().getFullYear()} EAGLE i <i />
              Made for higher things.
            </span>
            <div>
              <span className="footer-status">
                <span />
                Demo environment
              </span>
              <button onClick={() => setModal("about")}>
                About EAGLE i <ArrowUpRight size={12} />
              </button>
            </div>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            {
              wallet: wallet ? "Your connected wallet" : "Connect your wings.",
              premium: premium
                ? "You’re flying Elite."
                : "Welcome to higher altitude.",
              guide: "Your guide to the flock.",
              about: "A little meme. More possibility.",
              demo: "Explore before you take flight.",
              network: "Built on BNB Chain.",
              reset: "Start a fresh flight?",
            }[modal]
          }
          onClose={closeModal}
        >
          {modal === "wallet" && (
            <>
              {wallet ? (
                <>
                  <p>
                    Connected to{" "}
                    {wallet.chain === "0x61"
                      ? "BNB Smart Chain Testnet"
                      : "BNB Smart Chain"}
                    . This preview shows demo rewards only.
                  </p>
                  <code className="wallet-address">{wallet.address}</code>
                  <button
                    className="button secondary full"
                    onClick={copyAddress}
                  >
                    <Copy size={16} />
                    Copy address
                  </button>
                  <button
                    className="button secondary full"
                    onClick={() => {
                      setWallet(null);
                      setModal(null);
                    }}
                  >
                    <LogOut size={16} />
                    Disconnect from app
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Connect a BNB-compatible browser wallet to display your
                    address. This preview does not request payments or
                    signatures.
                  </p>
                  <button
                    className="button primary full"
                    disabled={connecting}
                    onClick={connect}
                  >
                    <Wallet size={17} />
                    {connecting
                      ? "Waiting for your wallet…"
                      : "Connect browser wallet"}
                  </button>
                  <button
                    className="button secondary full"
                    onClick={() => setModal(null)}
                  >
                    Continue exploring the demo
                    <ArrowRight size={16} />
                  </button>
                </>
              )}
              {walletError && (
                <p className="error" role="alert">
                  {walletError}
                </p>
              )}
            </>
          )}
          {modal === "premium" && (
            <>
              <p>
                {premium
                  ? `Your demo Eagle Elite membership is active until ${new Date(state.premiumUntil).toLocaleDateString()}.`
                  : "Enjoy 3× rewards and an Elite badge for 30 days. The proposed live membership is 0.01 BNB. You can try it free in this demo."}
              </p>
              <div className="modal-perk">
                <Crown />
                <div>
                  <strong>3,600 EAGLE</strong>
                  <span>per new mining session</span>
                </div>
                <span className="boost-tag">3×</span>
              </div>
              {premium ? (
                <button
                  className="button primary full"
                  onClick={() => {
                    setModal(null);
                    navigate("mining");
                  }}
                >
                  Go to mining station
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="button primary full"
                  onClick={() => act("premium")}
                >
                  Activate free demo membership
                  <ArrowUpRight size={17} />
                </button>
              )}
              <p className="card-footnote">
                No payment. No auto-renewal. Demo tokens only.
              </p>
            </>
          )}
          {modal === "guide" && (
            <>
              <p>
                EAGLE i rewards participation through timed sessions. It does
                not mine BNB or use your device’s computing power.
              </p>
              <ol className="guide-list">
                <li>Open the mining station and start a session.</li>
                <li>Wait 30 seconds in the demo, then claim your rewards.</li>
                <li>Try Eagle Elite for 3× rewards on new sessions.</li>
              </ol>
              <p>
                Progress is saved in this browser. Demo balances are simulated
                and cannot be transferred or redeemed.
              </p>
              <button
                className="button primary full"
                onClick={() => {
                  setModal(null);
                  navigate("mining");
                }}
              >
                Start exploring
                <ArrowRight size={16} />
              </button>
            </>
          )}
          {modal === "about" && (
            <>
              <p>
                EAGLE i is a memecoin platform concept for BNB Smart Chain,
                built around community, participation rewards, and optional
                premium membership.
              </p>
              <div className="token-facts">
                <div>
                  <span>Token name</span>
                  <strong>EAGLE i</strong>
                </div>
                <div>
                  <span>Symbol</span>
                  <strong>EAGLE</strong>
                </div>
                <div>
                  <span>Planned fixed supply</span>
                  <strong>1,000,000,000</strong>
                </div>
                <div>
                  <span>Network</span>
                  <strong>BNB Smart Chain</strong>
                </div>
                <div>
                  <span>Deployment status</span>
                  <strong>Not deployed</strong>
                </div>
              </div>
              <p>
                The preview uses simulated rewards. No live token address,
                market price, or trading pair is available.
              </p>
            </>
          )}
          {modal === "demo" && (
            <>
              <p>
                This is an interactive product preview. Mine demo EAGLE, try a
                free Elite membership, and track your activity.
              </p>
              <p>
                Demo sessions take 30 seconds. The included live contract design
                uses 24 hours. All balances and membership progress are stored
                locally in this browser, independently of your connected wallet.
              </p>
              <button
                className="button secondary full"
                onClick={() => setModal("reset")}
              >
                Reset demo progress
              </button>
            </>
          )}
          {modal === "reset" && (
            <>
              <p>
                This clears the demo balance, current session, membership, and
                activity saved in this browser.
              </p>
              <button
                className="button primary full"
                onClick={() => {
                  setState(initialState());
                  setModal(null);
                  setToast("Demo progress reset. Ready for a fresh start.");
                }}
              >
                Reset demo
              </button>
              <button
                className="button secondary full"
                onClick={() => setModal("demo")}
              >
                Keep my progress
              </button>
            </>
          )}
          {modal === "network" && (
            <>
              <p>
                EAGLE i is designed for BNB Smart Chain. The token contracts are
                prepared for testnet deployment; this preview is not connected
                to a deployed token.
              </p>
              <div className="token-facts">
                <div>
                  <span>Mainnet chain ID</span>
                  <strong>56</strong>
                </div>
                <div>
                  <span>Testnet chain ID</span>
                  <strong>97</strong>
                </div>
                <div>
                  <span>Gas token</span>
                  <strong>BNB / test BNB</strong>
                </div>
              </div>
              <a
                className="button secondary full"
                href="https://testnet.bscscan.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open testnet explorer
                <ExternalLink size={15} />
              </a>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

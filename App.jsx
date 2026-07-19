import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Repeat, LineChart as LineChartIcon, Wallet, Dumbbell,
  Package, Flame, Crown, ChevronRight, ArrowUpRight, ArrowDownRight,
  Plus, Settings, LogOut, CheckCircle2, Circle, TrendingUp, TrendingDown,
  Target, Percent, Activity, X
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid
} from "recharts";
import { supabase } from "./supabaseClient";
import { auth, habitsApi, tradingApi, financeApi, trainingApi, dropshipApi } from "./lib/api";

/* ------------------------------------------------------------------ */
const C = {
  bg: "#0A0A0C", surface: "#121214", surface2: "#18181B", border: "#232326",
  borderSoft: "#1B1B1E", text: "#F2F1ED", textDim: "#8C8C93", textFaint: "#57575D",
  accent: "#D6A94A", accentSoft: "rgba(214,169,74,0.12)", accentBorder: "rgba(214,169,74,0.35)",
  success: "#4ADE80", successSoft: "rgba(74,222,128,0.12)",
  danger: "#F87171", dangerSoft: "rgba(248,113,113,0.12)",
};

function AnimatedNumber({ value, decimals = 0, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    startRef.current = null;
    let raf;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / 800, 1);
      setDisplay(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tnum">{prefix}{display.toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

const Card = ({ children, className = "", style = {}, pop = false }) => (
  <div className={`empire-card rounded-2xl p-5 ${pop ? "card-pop" : ""} ${className}`} style={style}>{children}</div>
);
const SectionTitle = ({ title, action }) => (
  <div className="flex items-end justify-between mb-5">
    <h2 className="text-xl font-semibold" style={{ color: C.text }}>{title}</h2>
    {action}
  </div>
);
const Pill = ({ children, tone = "neutral" }) => {
  const tones = { neutral: [C.surface2, C.textDim], accent: [C.accentSoft, C.accent], success: [C.successSoft, C.success], danger: [C.dangerSoft, C.danger] };
  const [bg, color] = tones[tone];
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: bg, color }}>{children}</span>;
};
const StatCard = ({ icon: Icon, label, value, decimals = 0, prefix = "", suffix = "", delta, deltaTone = "success" }) => (
  <Card pop>
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.accentSoft }}>
        <Icon size={18} style={{ color: C.accent }} strokeWidth={2} />
      </div>
      {delta !== undefined && (
        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: deltaTone === "success" ? C.success : C.danger }}>
          {deltaTone === "success" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{delta}
        </div>
      )}
    </div>
    <div className="text-2xl font-bold mb-1" style={{ color: C.text }}><AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} /></div>
    <div className="text-sm" style={{ color: C.textDim }}>{label}</div>
  </Card>
);
const ProgressBar = ({ pct, tone = C.accent, height = 8 }) => (
  <div className="w-full rounded-full overflow-hidden" style={{ background: C.surface2, height }}>
    <div className="progress-fill h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: tone }} />
  </div>
);
const QuickAddForm = ({ fields, onSubmit, submitLabel = "Añadir" }) => {
  const [values, setValues] = useState(Object.fromEntries(fields.map((f) => [f.name, f.default ?? ""])));
  const [saving, setSaving] = useState(false);
  const set = (name, v) => setValues((s) => ({ ...s, [name]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(values); setValues(Object.fromEntries(fields.map((f) => [f.name, f.default ?? ""]))); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 mb-4">
      {fields.map((f) => (
        f.type === "select" ? (
          <select key={f.name} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}
            className="text-sm rounded-lg px-3 py-2" style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}` }}>
            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input key={f.name} type={f.type || "text"} placeholder={f.placeholder} required={f.required}
            value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}
            className="text-sm rounded-lg px-3 py-2 flex-1 min-w-[120px]"
            style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}` }} />
        )
      ))}
      <button disabled={saving} className="btn-accent px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5" style={{ color: "#1A1408" }}>
        <Plus size={15} strokeWidth={2.5} /> {saving ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
};

/* ------------------------------------------------------------------ */
/* AUTH SCREEN                                                         */
/* ------------------------------------------------------------------ */
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); const [notice, setNotice] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setError(""); setNotice(""); setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await auth.signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await auth.signUp(email, password, fullName);
        if (error) throw error;
        setNotice("Cuenta creada. Revisa tu email para confirmar el registro y luego inicia sesión.");
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: C.bg }}>
      <Card className="w-full max-w-sm" pop>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-ring" style={{ background: C.accentSoft }}>
            <Crown size={17} style={{ color: C.accent }} />
          </div>
          <div className="font-bold text-[15px]" style={{ color: C.text }}>EMPIRE</div>
        </div>
        <h1 className="text-lg font-semibold mb-1" style={{ color: C.text }}>
          {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>
        <p className="text-sm mb-5" style={{ color: C.textDim }}>Tu centro de control te está esperando.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <input placeholder="Nombre" value={fullName} onChange={(e) => setFullName(e.target.value)} required
              className="text-sm rounded-lg px-3 py-2.5" style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}` }} />
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="text-sm rounded-lg px-3 py-2.5" style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}` }} />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
            className="text-sm rounded-lg px-3 py-2.5" style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}` }} />
          {error && <div className="text-xs" style={{ color: C.danger }}>{error}</div>}
          {notice && <div className="text-xs" style={{ color: C.success }}>{notice}</div>}
          <button disabled={loading} className="btn-accent rounded-lg py-2.5 text-sm font-semibold mt-1" style={{ color: "#1A1408" }}>
            {loading ? "Un momento..." : mode === "login" ? "Entrar" : "Registrarme"}
          </button>
        </form>
        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setNotice(""); }}
          className="text-xs mt-4 w-full text-center" style={{ color: C.textFaint }}>
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
const NAV = [
  { id: "dashboard", label: "Centro de Control", icon: LayoutDashboard },
  { id: "habits", label: "Hábitos", icon: Repeat },
  { id: "trading", label: "Trading", icon: LineChartIcon },
  { id: "finance", label: "Finanzas", icon: Wallet },
  { id: "training", label: "Entrenamiento", icon: Dumbbell },
  { id: "dropshipping", label: "Dropshipping", icon: Package },
];

function Sidebar({ active, setActive, userLabel, onLogout }) {
  return (
    <aside className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 py-6 px-4" style={{ width: 260, borderRight: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center glow-ring" style={{ background: C.accentSoft }}>
          <Crown size={17} style={{ color: C.accent }} />
        </div>
        <div>
          <div className="font-bold text-[15px] tracking-tight" style={{ color: C.text }}>EMPIRE</div>
          <div className="text-[11px]" style={{ color: C.textFaint }}>Centro de control</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => setActive(item.id)}
              className="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left"
              style={{ background: isActive ? C.surface2 : "transparent", color: isActive ? C.text : C.textDim }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: isActive ? C.accent : "transparent" }} />
              <item.icon size={17} strokeWidth={2} />{item.label}
              {isActive && <ChevronRight size={14} className="ml-auto" style={{ color: C.accent }} />}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto">
        <button onClick={onLogout} className="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-3" style={{ color: C.textDim }}>
          <LogOut size={17} strokeWidth={2} /> Cerrar sesión
        </button>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: C.accentSoft, color: C.accent }}>
            {userLabel?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{userLabel}</div>
            <div className="text-xs truncate" style={{ color: C.textFaint }}>Plan Fundador</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ title, subtitle }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="flex items-center justify-between mb-8 gap-4">
      <div>
        <div className="text-xs font-medium mb-1 capitalize" style={{ color: C.textFaint }}>{today}</div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: C.text }}>{title || greeting}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: C.textDim }}>{subtitle}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DASHBOARD                                                            */
/* ------------------------------------------------------------------ */
function DashboardView({ userId }) {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState([]);
  const [logs7d, setLogs7d] = useState([]);
  const [trades, setTrades] = useState([]);
  const [txs, setTxs] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const [h, l, t, f, w, o] = await Promise.all([
        habitsApi.list(userId), habitsApi.logsForRange(userId, since),
        tradingApi.list(userId), financeApi.list(userId),
        trainingApi.listWorkouts(userId), dropshipApi.listOrders(userId),
      ]);
      setHabits(h); setLogs7d(l); setTrades(t); setTxs(f); setWorkouts(w); setOrders(o);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="view-enter" style={{ color: C.textFaint }}>Cargando tu imperio...</div>;

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = logs7d.filter((l) => l.done_on === today).length;
  const dailyPct = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;
  const disciplina = habits.length ? Math.round((logs7d.length / (habits.length * 7)) * 100) : 0;
  const stats = tradingApi.stats(trades);
  const finSummary = financeApi.summary(txs);
  const salud = Math.min(100, Math.round((workouts.filter((w) => new Date(w.created_at) > new Date(Date.now() - 7 * 86400000)).length / 5) * 100));
  const negocio = Math.min(100, Math.round((orders.length / 30) * 100));
  const imperioScores = [
    { subject: "Disciplina", score: disciplina },
    { subject: "Salud", score: salud },
    { subject: "Finanzas", score: finSummary.goalPct },
    { subject: "Trading", score: Math.round(stats.winRate) },
    { subject: "Negocio", score: negocio },
  ];
  const overall = Math.round(imperioScores.reduce((a, b) => a + b.score, 0) / imperioScores.length);

  return (
    <div className="view-enter">
      <TopBar subtitle="Este es el estado actual de tu imperio." />
      <Card className="mb-6" pop>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Activity size={16} style={{ color: C.accent }} /><span className="text-sm font-semibold" style={{ color: C.text }}>Progreso de hoy</span></div>
          <span className="text-sm font-bold tnum" style={{ color: C.accent }}>{dailyPct}%</span>
        </div>
        <ProgressBar pct={dailyPct} />
        <div className="text-xs mt-2" style={{ color: C.textFaint }}>{doneToday} de {habits.length} hábitos completados</div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-2 glow-ring" pop>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: C.accent }}>Puntuación general</div>
              <h3 className="text-lg font-semibold" style={{ color: C.text }}>Estado del Imperio</h3>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold tnum" style={{ color: C.accent }}><AnimatedNumber value={overall} /></div>
              <div className="text-xs" style={{ color: C.textFaint }}>sobre 100</div>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={imperioScores} outerRadius="72%">
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: C.textDim, fontSize: 12 }} />
                <Radar dataKey="score" stroke={C.accent} fill={C.accent} fillOpacity={0.22} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div className="flex flex-col gap-5">
          <StatCard icon={LineChartIcon} label="P&L del mes (Trading)" value={stats.monthlyPnl} prefix="€" />
          <StatCard icon={Wallet} label="Patrimonio neto" value={finSummary.netWorth} prefix="€" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HABITS                                                               */
/* ------------------------------------------------------------------ */
function HabitsView({ userId }) {
  const [habits, setHabits] = useState([]);
  const [logsToday, setLogsToday] = useState(new Set());
  const [streaks, setStreaks] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const h = await habitsApi.list(userId);
    const today = new Date().toISOString().slice(0, 10);
    const logs = await habitsApi.logsForRange(userId, today);
    setHabits(h);
    setLogsToday(new Set(logs.map((l) => l.habit_id)));
    const s = {};
    for (const habit of h) s[habit.id] = await habitsApi.streak(userId, habit.id);
    setStreaks(s);
    setLoading(false);
  };
  useEffect(() => { load(); }, [userId]);

  if (loading) return <div className="view-enter" style={{ color: C.textFaint }}>Cargando hábitos...</div>;

  return (
    <div className="view-enter">
      <TopBar title="Hábitos" subtitle="Disciplina diaria, resultados compuestos." />
      <Card pop>
        <SectionTitle title="Nuevo hábito" />
        <QuickAddForm
          fields={[
            { name: "name", placeholder: "Nombre del hábito", required: true },
            { name: "category", type: "select", options: ["Disciplina", "Salud", "Trading", "Finanzas", "Crecimiento"], default: "Disciplina" },
          ]}
          onSubmit={async (v) => { await habitsApi.add(userId, v.name, v.category); await load(); }}
        />
        <div className="flex flex-col gap-2">
          {habits.length === 0 && <div className="text-sm" style={{ color: C.textFaint }}>Aún no tienes hábitos. Añade el primero arriba.</div>}
          {habits.map((h) => {
            const done = logsToday.has(h.id);
            return (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: C.surface2 }}>
                <button onClick={async () => { await habitsApi.toggleToday(userId, h.id, done); await load(); }}>
                  {done ? <CheckCircle2 size={20} style={{ color: C.success }} /> : <Circle size={20} style={{ color: C.textFaint }} />}
                </button>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: C.text }}>{h.name}</div>
                  <div className="text-xs" style={{ color: C.textFaint }}>{h.category}</div>
                </div>
                <Pill tone="accent">🔥 {streaks[h.id] || 0}</Pill>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TRADING                                                              */
/* ------------------------------------------------------------------ */
function TradingView({ userId }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setTrades(await tradingApi.list(userId)); setLoading(false); };
  useEffect(() => { load(); }, [userId]);
  if (loading) return <div className="view-enter" style={{ color: C.textFaint }}>Cargando operaciones...</div>;
  const stats = tradingApi.stats(trades);
  const equity = [...trades].reverse().reduce((acc, t) => {
    const last = acc.length ? acc[acc.length - 1].v : 0;
    acc.push({ d: acc.length + 1, v: last + Number(t.pnl) });
    return acc;
  }, []);

  return (
    <div className="view-enter">
      <TopBar title="Trading" subtitle="Rendimiento, disciplina y gestión de riesgo." />
      <Card className="mb-6" pop>
        <SectionTitle title="Registrar operación" />
        <QuickAddForm
          fields={[
            { name: "pair", placeholder: "Par (EUR/USD)", required: true },
            { name: "type", type: "select", options: ["Long", "Short"], default: "Long" },
            { name: "result", type: "select", options: ["win", "loss"], default: "win" },
            { name: "pnl", type: "number", placeholder: "P&L (€)", required: true },
          ]}
          onSubmit={async (v) => { await tradingApi.add(userId, { pair: v.pair, type: v.type, result: v.result, pnl: Number(v.pnl) }); await load(); }}
        />
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard icon={Percent} label="Win Rate" value={stats.winRate} decimals={1} suffix="%" />
        <StatCard icon={TrendingUp} label="Profit Factor" value={stats.profitFactor} decimals={2} />
        <StatCard icon={TrendingDown} label="Drawdown máx." value={stats.drawdown} decimals={0} suffix="€" deltaTone="danger" />
        <StatCard icon={Wallet} label="Beneficio del mes" value={stats.monthlyPnl} prefix="€" />
      </div>
      {equity.length > 1 && (
        <Card className="mb-6" pop>
          <SectionTitle title="Curva de beneficios" />
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity}>
                <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accent} stopOpacity={0.35} /><stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid stroke={C.borderSoft} vertical={false} />
                <XAxis dataKey="d" tick={{ fill: C.textFaint, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text }} />
                <Area type="monotone" dataKey="v" stroke={C.accent} strokeWidth={2.5} fill="url(#eq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      <Card pop>
        <SectionTitle title="Operaciones recientes" />
        <div className="flex flex-col">
          {trades.length === 0 && <div className="text-sm" style={{ color: C.textFaint }}>Sin operaciones aún.</div>}
          {trades.map((t) => (
            <div key={t.id} className="flex items-center gap-4 py-3" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: t.result === "win" ? C.successSoft : C.dangerSoft }}>
                {t.result === "win" ? <TrendingUp size={16} style={{ color: C.success }} /> : <TrendingDown size={16} style={{ color: C.danger }} />}
              </div>
              <div className="flex-1"><div className="text-sm font-semibold" style={{ color: C.text }}>{t.pair}</div><div className="text-xs" style={{ color: C.textFaint }}>{t.type}</div></div>
              <div className="text-sm font-bold tnum" style={{ color: t.result === "win" ? C.success : C.danger }}>{t.pnl > 0 ? "+" : ""}{t.pnl}€</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FINANCE                                                              */
/* ------------------------------------------------------------------ */
function FinanceView({ userId }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setTxs(await financeApi.list(userId)); setLoading(false); };
  useEffect(() => { load(); }, [userId]);
  if (loading) return <div className="view-enter" style={{ color: C.textFaint }}>Cargando finanzas...</div>;
  const s = financeApi.summary(txs);
  return (
    <div className="view-enter">
      <TopBar title="Finanzas" subtitle="Patrimonio, flujo de caja y objetivos." />
      <Card className="mb-6" pop>
        <SectionTitle title="Registrar movimiento" />
        <QuickAddForm
          fields={[
            { name: "type", type: "select", options: ["income", "expense", "saving", "investment"], default: "income" },
            { name: "amount", type: "number", placeholder: "Importe (€)", required: true },
            { name: "note", placeholder: "Nota (opcional)" },
          ]}
          onSubmit={async (v) => { await financeApi.add(userId, { type: v.type, amount: Number(v.amount), note: v.note }); await load(); }}
        />
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard icon={Wallet} label="Patrimonio neto" value={s.netWorth} prefix="€" />
        <StatCard icon={Target} label="Ahorros" value={s.savings} prefix="€" />
        <StatCard icon={TrendingUp} label="Inversiones" value={s.investments} prefix="€" />
        <StatCard icon={Percent} label="Objetivo" value={s.goalPct} suffix="%" />
      </div>
      <Card pop>
        <SectionTitle title="Movimientos recientes" />
        <div className="flex flex-col">
          {txs.length === 0 && <div className="text-sm" style={{ color: C.textFaint }}>Sin movimientos aún.</div>}
          {txs.slice(0, 12).map((t) => (
            <div key={t.id} className="flex items-center gap-4 py-3" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
              <Pill tone={t.type === "expense" ? "danger" : "success"}>{t.type}</Pill>
              <div className="flex-1 text-sm" style={{ color: C.text }}>{t.note || "—"}</div>
              <div className="text-sm font-bold tnum" style={{ color: C.text }}>€{Number(t.amount).toLocaleString("es-ES")}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TRAINING                                                             */
/* ------------------------------------------------------------------ */
function TrainingView({ userId }) {
  const [workouts, setWorkouts] = useState([]);
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setWorkouts(await trainingApi.listWorkouts(userId));
    setWeights(await trainingApi.listWeights(userId));
    setLoading(false);
  };
  useEffect(() => { load(); }, [userId]);
  if (loading) return <div className="view-enter" style={{ color: C.textFaint }}>Cargando entrenamiento...</div>;
  const chartData = weights.map((w, i) => ({ w: `#${i + 1}`, kg: Number(w.kg) }));

  return (
    <div className="view-enter">
      <TopBar title="Entrenamiento" subtitle="Cuerpo fuerte, mente disciplinada." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <Card pop>
          <SectionTitle title="Registrar sesión" />
          <QuickAddForm
            fields={[{ name: "duration_minutes", type: "number", placeholder: "Minutos", required: true }, { name: "note", placeholder: "Nota" }]}
            onSubmit={async (v) => { await trainingApi.addWorkout(userId, Number(v.duration_minutes), v.note); await load(); }}
          />
        </Card>
        <Card pop>
          <SectionTitle title="Registrar peso" />
          <QuickAddForm
            fields={[{ name: "kg", type: "number", placeholder: "Peso (kg)", required: true }]}
            onSubmit={async (v) => { await trainingApi.addWeight(userId, Number(v.kg)); await load(); }}
          />
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StatCard icon={Dumbbell} label="Sesiones registradas" value={workouts.length} />
        {chartData.length > 1 && (
          <Card pop>
            <SectionTitle title="Evolución de peso" />
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke={C.borderSoft} vertical={false} />
                  <XAxis dataKey="w" tick={{ fill: C.textFaint, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text }} />
                  <Line type="monotone" dataKey="kg" stroke={C.accent} strokeWidth={2.5} dot={{ fill: C.accent, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DROPSHIPPING                                                         */
/* ------------------------------------------------------------------ */
function DropshippingView({ userId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setOrders(await dropshipApi.listOrders(userId)); setLoading(false); };
  useEffect(() => { load(); }, [userId]);
  if (loading) return <div className="view-enter" style={{ color: C.textFaint }}>Cargando pedidos...</div>;
  const revenue = orders.reduce((a, o) => a + Number(o.revenue), 0);
  const cost = orders.reduce((a, o) => a + Number(o.cost || 0), 0);

  return (
    <div className="view-enter">
      <TopBar title="Dropshipping" subtitle="Ventas, márgenes y productos ganadores." />
      <Card className="mb-6" pop>
        <SectionTitle title="Registrar pedido" />
        <QuickAddForm
          fields={[
            { name: "product_name", placeholder: "Producto", required: true },
            { name: "revenue", type: "number", placeholder: "Ingreso (€)", required: true },
            { name: "cost", type: "number", placeholder: "Coste (€)" },
          ]}
          onSubmit={async (v) => { await dropshipApi.addOrder(userId, v.product_name, Number(v.revenue), Number(v.cost || 0)); await load(); }}
        />
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard icon={Wallet} label="Ingresos" value={revenue} prefix="€" />
        <StatCard icon={Package} label="Pedidos" value={orders.length} />
        <StatCard icon={TrendingUp} label="Beneficio" value={revenue - cost} prefix="€" />
        <StatCard icon={Percent} label="Margen" value={revenue ? ((revenue - cost) / revenue) * 100 : 0} decimals={1} suffix="%" />
      </div>
      <Card pop>
        <SectionTitle title="Pedidos recientes" />
        <div className="flex flex-col">
          {orders.length === 0 && <div className="text-sm" style={{ color: C.textFaint }}>Sin pedidos aún.</div>}
          {orders.slice(0, 12).map((o) => (
            <div key={o.id} className="flex items-center gap-4 py-3" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
              <div className="flex-1 text-sm font-medium" style={{ color: C.text }}>{o.product_name}</div>
              <div className="text-sm font-bold tnum" style={{ color: C.success }}>+€{Number(o.revenue).toLocaleString("es-ES")}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* APP ROOT                                                             */
/* ------------------------------------------------------------------ */
export default function App() {
  const [session, setSession] = useState(undefined);
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = auth.onChange((s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg, color: C.textFaint }}>Cargando...</div>;
  if (!session) return <AuthScreen />;

  const userId = session.user.id;
  const userLabel = session.user.user_metadata?.full_name || session.user.email;

  const views = {
    dashboard: <DashboardView userId={userId} />,
    habits: <HabitsView userId={userId} />,
    trading: <TradingView userId={userId} />,
    finance: <FinanceView userId={userId} />,
    training: <TrainingView userId={userId} />,
    dropshipping: <DropshippingView userId={userId} />,
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.bg }}>
      <Sidebar active={active} setActive={setActive} userLabel={userLabel} onLogout={() => auth.signOut()} />
      <main className="flex-1 min-w-0 px-5 md:px-10 py-8 pb-24 md:pb-8 max-w-[1400px] mx-auto w-full">
        <div key={active}>{views[active]}</div>
        <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around py-3 px-2" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
          {NAV.map((item) => (
            <button key={item.id} onClick={() => setActive(item.id)} className="flex flex-col items-center gap-1">
              <item.icon size={18} style={{ color: active === item.id ? C.accent : C.textFaint }} />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

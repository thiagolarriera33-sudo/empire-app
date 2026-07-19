import { supabase } from "../supabaseClient";

/* ---------------- AUTH ---------------- */
export const auth = {
  signUp: (email, password, fullName) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    }),
  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  onChange: (cb) => supabase.auth.onAuthStateChange((_e, session) => cb(session)),
};

/* ---------------- HABITS ---------------- */
export const habitsApi = {
  list: async (userId) => {
    const { data, error } = await supabase.from("habits").select("*").eq("user_id", userId).order("created_at");
    if (error) throw error;
    return data;
  },
  add: async (userId, name, category) => {
    const { error } = await supabase.from("habits").insert({ user_id: userId, name, category });
    if (error) throw error;
  },
  logsForRange: async (userId, sinceISODate) => {
    const { data, error } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("done_on", sinceISODate);
    if (error) throw error;
    return data;
  },
  toggleToday: async (userId, habitId, isDoneToday) => {
    const today = new Date().toISOString().slice(0, 10);
    if (isDoneToday) {
      const { error } = await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitId)
        .eq("done_on", today);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("habit_logs")
        .insert({ habit_id: habitId, user_id: userId, done_on: today });
      if (error) throw error;
    }
  },
  streak: async (userId, habitId) => {
    const { data, error } = await supabase
      .from("habit_logs")
      .select("done_on")
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .order("done_on", { ascending: false });
    if (error) throw error;
    let streak = 0;
    let cursor = new Date();
    const set = new Set(data.map((d) => d.done_on));
    for (;;) {
      const iso = cursor.toISOString().slice(0, 10);
      if (set.has(iso)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return streak;
  },
};

/* ---------------- TRADING ---------------- */
export const tradingApi = {
  list: async (userId) => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("traded_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
  add: async (userId, trade) => {
    const { error } = await supabase.from("trades").insert({ user_id: userId, ...trade });
    if (error) throw error;
  },
  stats: (trades) => {
    if (!trades.length) return { winRate: 0, profitFactor: 0, drawdown: 0, monthlyPnl: 0 };
    const wins = trades.filter((t) => t.result === "win");
    const losses = trades.filter((t) => t.result === "loss");
    const grossWin = wins.reduce((a, t) => a + Number(t.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((a, t) => a + Number(t.pnl), 0));
    const now = new Date();
    const monthlyPnl = trades
      .filter((t) => new Date(t.traded_at).getMonth() === now.getMonth())
      .reduce((a, t) => a + Number(t.pnl), 0);
    let equity = 0, peak = 0, maxDD = 0;
    [...trades].reverse().forEach((t) => {
      equity += Number(t.pnl);
      peak = Math.max(peak, equity);
      maxDD = Math.min(maxDD, equity - peak);
    });
    return {
      winRate: (wins.length / trades.length) * 100,
      profitFactor: grossLoss ? grossWin / grossLoss : grossWin,
      drawdown: maxDD,
      monthlyPnl,
    };
  },
};

/* ---------------- FINANCE ---------------- */
export const financeApi = {
  list: async (userId) => {
    const { data, error } = await supabase
      .from("finance_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  add: async (userId, tx) => {
    const { error } = await supabase.from("finance_transactions").insert({ user_id: userId, ...tx });
    if (error) throw error;
  },
  summary: (transactions) => {
    const sum = (type) => transactions.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);
    const income = sum("income");
    const expenses = sum("expense");
    const savings = sum("saving");
    const investments = sum("investment");
    return {
      netWorth: income - expenses + savings + investments,
      savings,
      investments,
      goalPct: income ? Math.min(100, Math.round(((income - expenses) / income) * 100)) : 0,
    };
  },
};

/* ---------------- TRAINING ---------------- */
export const trainingApi = {
  listWorkouts: async (userId) => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  addWorkout: async (userId, duration_minutes, note) => {
    const { error } = await supabase.from("workouts").insert({ user_id: userId, duration_minutes, note });
    if (error) throw error;
  },
  listWeights: async (userId) => {
    const { data, error } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true });
    if (error) throw error;
    return data;
  },
  addWeight: async (userId, kg) => {
    const { error } = await supabase.from("weight_logs").insert({ user_id: userId, kg });
    if (error) throw error;
  },
};

/* ---------------- DROPSHIPPING ---------------- */
export const dropshipApi = {
  listOrders: async (userId) => {
    const { data, error } = await supabase
      .from("dropship_orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  addOrder: async (userId, product_name, revenue, cost) => {
    const { error } = await supabase.from("dropship_orders").insert({ user_id: userId, product_name, revenue, cost });
    if (error) throw error;
  },
};

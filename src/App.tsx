import { lazy, Suspense, useEffect, useState } from "react";
import { useLedger } from "./context/LedgerContext";
import { MonthPage } from "./pages/MonthPage";
import { QuickEntryPage } from "./pages/QuickEntryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { currentMonth } from "./lib/date";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { applyPwaUpdate, hasPwaUpdate, subscribeToPwaUpdate } from "./lib/pwaUpdate";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);

type Page = "entry" | "month" | "dashboard" | "settings";

const navItems: Array<{ id: Page; label: string; icon: string }> = [
  { id: "entry", label: "记一笔", icon: "+" },
  { id: "month", label: "明细", icon: "≡" },
  { id: "dashboard", label: "分析", icon: "↗" },
  { id: "settings", label: "设置", icon: "⚙" },
];

export default function App() {
  const [page, setPage] = useState<Page>("entry");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [updateAvailable, setUpdateAvailable] = useState(hasPwaUpdate);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const {
    loading,
    busy,
    mode,
    message,
    clearMessage,
    households,
    householdId,
    selectHousehold,
    refreshLedger,
  } = useLedger();

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(clearMessage, 2600);
    return () => window.clearTimeout(timer);
  }, [clearMessage, message]);

  useEffect(() => {
    if (mode !== "supabase") return;
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshLedger(false);
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [mode, refreshLedger]);

  useEffect(() => subscribeToPwaUpdate(() => setUpdateAvailable(true)), []);

  function updateApp() {
    setApplyingUpdate(true);
    void applyPwaUpdate().catch(() => setApplyingUpdate(false));
    window.setTimeout(() => setApplyingUpdate(false), 10000);
  }

  if (loading) return <main className="center-screen">正在打开家庭账本…</main>;
  if (mode === "supabase" && households.length > 1 && !householdId) {
    return (
      <main className="auth-shell">
        <section className="auth-card household-card">
          <img src="/ledger-icon.svg" alt="" width="64" height="64" />
          <p className="eyebrow">选择账本</p>
          <h1>打开哪个家庭？</h1>
          <p className="muted">这个邮箱可以访问多个家庭账本。选定后，这台电脑会记住你的选择。</p>
          <div className="household-list">
            {households.map((household) => (
              <button key={household.id} type="button" onClick={() => selectHousehold(household.id)}>
                <strong>{household.name}</strong>
                <span>{household.transactionCount} 笔记录 · {household.role === "owner" ? "所有者" : "成员"}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/ledger-icon.svg" width="42" height="42" alt="" />
          <div><strong>家庭账本</strong><span>{mode === "local" ? "本机试用" : "家庭云端"}</span></div>
        </div>
        {mode === "supabase" && households.length > 1 && (
          <label className="sidebar-select">
            账本
            <select value={householdId ?? ""} onChange={(event) => selectHousehold(event.target.value)}>
              {households.map((household) => (
                <option key={household.id} value={household.id}>{household.name}</option>
              ))}
            </select>
          </label>
        )}
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => setPage(item.id)}
              aria-label={`打开${item.label}`}
            >
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        {isSupabaseConfigured && (
          <button className="sign-out" onClick={() => void supabase?.auth.signOut()}>退出登录</button>
        )}
      </aside>

      <main className="content">
        <div className="top-actions">
          {updateAvailable && (
            <button className="update-button" onClick={updateApp} disabled={applyingUpdate}>
              <span className="update-dot" aria-hidden="true" />
              {applyingUpdate ? "正在更新" : "有新版本"}
            </button>
          )}
          {mode === "supabase" && (
            <button className="sync-button" onClick={() => void refreshLedger()} disabled={busy}>
              {busy ? "同步中" : "同步"}
            </button>
          )}
        </div>
        {mode === "local" && (
          <div className="demo-banner"><strong>本机试用模式</strong><span>数据只保存在这个浏览器。配置 Supabase 后切换为跨设备家庭账本。</span></div>
        )}
        {page === "entry" && <QuickEntryPage />}
        {page === "month" && <MonthPage month={selectedMonth} onMonthChange={setSelectedMonth} />}
        {page === "dashboard" && (
          <Suspense fallback={<div className="center-screen">正在准备分析…</div>}>
            <DashboardPage month={selectedMonth} onMonthChange={setSelectedMonth} />
          </Suspense>
        )}
        {page === "settings" && <SettingsPage />}
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={page === item.id ? "active" : ""}
            onClick={() => setPage(item.id)}
            aria-label={`打开${item.label}`}
          >
            <span aria-hidden="true">{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
      {message && <div className={message.includes("失败") ? "toast error" : "toast"}>{message}</div>}
    </div>
  );
}

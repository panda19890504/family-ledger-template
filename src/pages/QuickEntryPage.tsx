import { useState } from "react";
import { TransactionForm } from "../components/TransactionForm";

type EntryDirection = "expense" | "income";
type ExpenseMode = "normal" | "fixed" | "allocation";

const expenseCopy: Record<ExpenseMode, { title: string; subtitle: string }> = {
  normal: {
    title: "记录支出",
    subtitle: "普通消费、临时开销和日常购物。",
  },
  fixed: {
    title: "记录固定支出",
    subtitle: "网费、电话费、Hausgeld 这类每月固定扣款。",
  },
  allocation: {
    title: "记录均摊费用",
    subtitle: "只保存一次，分析时自动分摊。",
  },
};

export function QuickEntryPage() {
  const [direction, setDirection] = useState<EntryDirection>("expense");
  const [expenseMode, setExpenseMode] = useState<ExpenseMode>("normal");
  const copy = direction === "income"
    ? { title: "记录收入", subtitle: "工资、其他收入和转售收入。" }
    : expenseCopy[expenseMode];

  return (
    <div className="page entry-page">
      <header className="page-header">
        <p className="eyebrow">快速记账</p>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>
      <div className="mode-tabs">
        <button className={direction === "expense" ? "active" : ""} onClick={() => setDirection("expense")}>支出</button>
        <button className={direction === "income" ? "active" : ""} onClick={() => setDirection("income")}>收入</button>
      </div>
      {direction === "expense" && (
        <div className="mode-tabs sub-mode-tabs">
          <button className={expenseMode === "normal" ? "active" : ""} onClick={() => setExpenseMode("normal")}>普通支出</button>
          <button className={expenseMode === "fixed" ? "active" : ""} onClick={() => setExpenseMode("fixed")}>固定支出</button>
          <button className={expenseMode === "allocation" ? "active" : ""} onClick={() => setExpenseMode("allocation")}>均摊支出</button>
        </div>
      )}
      <section className="surface entry-surface">
        <TransactionForm
          key={`${direction}-${expenseMode}`}
          forcedDirection={direction}
          fixed={direction === "expense" && expenseMode === "fixed"}
          allocation={direction === "expense" && expenseMode === "allocation"}
        />
      </section>
    </div>
  );
}

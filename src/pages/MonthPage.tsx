import { useMemo, useState } from "react";
import { TransactionForm } from "../components/TransactionForm";
import { MonthSelectField } from "../components/DateFields";
import { useLedger } from "../context/LedgerContext";
import { formatDate, formatMonth } from "../lib/date";
import { formatMoney } from "../lib/money";
import {
  allocationsForMonth,
  isMonthlyFixedCashCommitment,
  monthlyFixedCashCommitmentsForMonth,
  transactionsForMonth,
} from "../lib/analytics";
import type { LedgerTransaction } from "../types";

type MonthTab = "expense" | "fixed" | "income" | "allocation";
type SortOrder = "desc" | "asc";

interface DetailPreview {
  transaction: LedgerTransaction;
  categoryName: string;
  title: string;
  meta: string;
  dateLabel: string;
  amount: number;
  amountPrefix: "+" | "-";
}

interface MonthPageProps {
  month: string;
  onMonthChange(month: string): void;
}

function cleanMigrationNote(detail: string): string {
  return detail.replace(/\s*\[迁移:.*?\]\s*$/, "");
}

function billedNote(transaction: LedgerTransaction): string {
  if (!transaction.billedAmount || !transaction.billedCurrency || !transaction.exchangeRate) return "";
  return ` · 账单 ${formatMoney(transaction.billedAmount, transaction.billedCurrency)} × ${transaction.exchangeRate}`;
}

function currencyTotals(transactions: LedgerTransaction[]): string {
  const totals = transactions.reduce<Record<string, number>>((result, transaction) => {
    result[transaction.currency] = (result[transaction.currency] ?? 0) + transaction.amount;
    return result;
  }, {});
  return Object.entries(totals)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => formatMoney(amount, currency as LedgerTransaction["currency"]))
    .join(" / ");
}

export function MonthPage({ month, onMonthChange }: MonthPageProps) {
  const { transactions, categories, deleteTransaction } = useLedger();
  const [editing, setEditing] = useState<LedgerTransaction | null>(null);
  const [activeTab, setActiveTab] = useState<MonthTab>("expense");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [detailPreview, setDetailPreview] = useState<DetailPreview | null>(null);
  const rows = useMemo(() => transactionsForMonth(transactions, month), [month, transactions]);
  const allocations = useMemo(() => allocationsForMonth(transactions, month), [month, transactions]);
  const fixedRows = useMemo(() => monthlyFixedCashCommitmentsForMonth(transactions, month), [month, transactions]);
  const expenseRows = useMemo(
    () => rows.filter((transaction) => transaction.direction === "expense" && !isMonthlyFixedCashCommitment(transaction)),
    [rows],
  );
  const incomeRows = useMemo(() => rows.filter((transaction) => transaction.direction === "income"), [rows]);
  const tabRows = activeTab === "income" ? incomeRows : activeTab === "fixed" ? fixedRows : expenseRows;
  const filterCategories = useMemo(() => {
    const ids = new Set(tabRows.map((transaction) => transaction.categoryId));
    return categories
      .filter((category) => ids.has(category.id))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [categories, tabRows]);
  const selectedCategoryFilter = filterCategories.some((category) => category.id === categoryFilter)
    ? categoryFilter
    : "all";
  const visibleRows = useMemo(() => {
    const filtered = selectedCategoryFilter === "all"
      ? tabRows
      : tabRows.filter((transaction) => transaction.categoryId === selectedCategoryFilter);
    return [...filtered].sort((a, b) => {
      const comparison = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [selectedCategoryFilter, sortOrder, tabRows]);
  const categoryById = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  const activeCount = activeTab === "allocation" ? allocations.length : visibleRows.length;
  const fixedTotal = currencyTotals(fixedRows);
  const emptyTitle = activeTab === "allocation"
    ? "这个月没有月末均摊"
    : activeTab === "income"
      ? "这个月没有收入流水"
      : activeTab === "fixed"
        ? "这个月没有固定支出"
        : "这个月没有日常支出";
  const emptyHint = activeTab === "allocation"
    ? "固定费用和历史均摊规则会出现在这里。"
    : activeTab === "fixed"
      ? "原 Excel 的固定支出块和手动标记的固定扣款会出现在这里。"
      : "换一个月份查看历史记录，或从“记一笔”开始。";

  async function remove(transaction: LedgerTransaction) {
    if (!confirm(`删除“${transaction.detail || categoryById.get(transaction.categoryId)?.name || "这笔记录"}”？`)) return;
    await deleteTransaction(transaction.id);
  }

  function startEdit(transaction: LedgerTransaction) {
    setDetailPreview(null);
    setEditing(transaction);
  }

  function previewTransaction(transaction: LedgerTransaction, amount = transaction.amount, dateLabel = formatDate(transaction.date)) {
    const category = categoryById.get(transaction.categoryId);
    const title = cleanMigrationNote(transaction.detail) || category?.name || "未分类";
    const categoryName = category?.name || "未分类";
    setDetailPreview({
      transaction,
      categoryName,
      title,
      meta: `${categoryName}${billedNote(transaction)} ${transaction.allocationMonths ? `· 均摊 ${transaction.allocationMonths} 个月` : ""}`.trim(),
      dateLabel,
      amount,
      amountPrefix: transaction.direction === "income" ? "+" : "-",
    });
  }

  return (
    <div className="page">
      <header className="page-header split-header">
        <div>
          <p className="eyebrow">月度明细</p>
          <h1>{formatMonth(month)}</h1>
          <p>日常支出 {expenseRows.length} 笔，固定 {fixedRows.length} 笔，收入 {incomeRows.length} 笔，均摊 {allocations.length} 项。</p>
        </div>
        <MonthSelectField label="选择月份" value={month} onChange={onMonthChange} />
      </header>

      {editing && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <section
            className="surface transaction-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-edit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title">
              <div>
                <p className="eyebrow">编辑记录</p>
                <h2 id="transaction-edit-title">{cleanMigrationNote(editing.detail) || categoryById.get(editing.categoryId)?.name || "这笔记录"}</h2>
              </div>
              <button type="button" className="text-button" onClick={() => setEditing(null)}>关闭</button>
            </div>
            <TransactionForm
              initial={editing}
              allocation={Boolean(editing.allocationStartMonth && editing.allocationMonths)}
              fixed={isMonthlyFixedCashCommitment(editing)}
              onSaved={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          </section>
        </div>
      )}

      {detailPreview && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDetailPreview(null)}>
          <section
            className="surface transaction-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title">
              <div>
                <p className="eyebrow">{detailPreview.dateLabel}</p>
                <h2 id="transaction-detail-title">{detailPreview.title}</h2>
              </div>
              <button type="button" className="text-button" onClick={() => setDetailPreview(null)}>关闭</button>
            </div>
            <dl className="transaction-detail-list">
              <div>
                <dt>类别</dt>
                <dd>{detailPreview.categoryName}</dd>
              </div>
              <div>
                <dt>完整明细</dt>
                <dd>{detailPreview.title}</dd>
              </div>
              {detailPreview.meta !== detailPreview.categoryName && (
                <div>
                  <dt>备注</dt>
                  <dd>{detailPreview.meta}</dd>
                </div>
              )}
              <div>
                <dt>金额</dt>
                <dd className={detailPreview.amountPrefix === "+" ? "income-text" : "expense-text"}>
                  {detailPreview.amountPrefix}{formatMoney(detailPreview.amount, detailPreview.transaction.currency)}
                </dd>
              </div>
            </dl>
            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={() => startEdit(detailPreview.transaction)}
              >
                编辑这笔
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="month-tabs" role="tablist" aria-label="月度明细分类">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "expense"}
          className={activeTab === "expense" ? "active expense" : ""}
          onClick={() => setActiveTab("expense")}
        >
          支出明细 <span>{expenseRows.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "fixed"}
          className={activeTab === "fixed" ? "active" : ""}
          onClick={() => setActiveTab("fixed")}
        >
          固定支出 <span>{fixedRows.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "income"}
          className={activeTab === "income" ? "active income" : ""}
          onClick={() => setActiveTab("income")}
        >
          收入 <span>{incomeRows.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "allocation"}
          className={activeTab === "allocation" ? "active" : ""}
          onClick={() => setActiveTab("allocation")}
        >
          月末均摊 <span>{allocations.length}</span>
        </button>
      </div>

      {activeTab !== "allocation" && (
        <div className="list-tools" aria-label="明细筛选和排序">
          <label>
            类别
            <select value={selectedCategoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">全部类别</option>
              {filterCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            日期排序
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
              <option value="desc">新到旧</option>
              <option value="asc">旧到新</option>
            </select>
          </label>
        </div>
      )}

      <section className="surface transaction-list">
        {activeTab === "allocation" && allocations.length > 0 && (
          <div className="allocation-list-header">
            <div>
              <p className="eyebrow">月末均摊</p>
              <h2>{formatMonth(month)} 管理成本</h2>
            </div>
            <span>来自年度/固定费用规则，不计为当天现金付款</span>
          </div>
        )}

        {activeTab === "fixed" && fixedRows.length > 0 && (
          <div className="allocation-list-header fixed-list-header">
            <div>
              <p className="eyebrow">固定支出</p>
              <h2>{formatMonth(month)} 固定扣款</h2>
            </div>
            <span>本月固定合计 {fixedTotal}</span>
          </div>
        )}

        {activeCount === 0 ? (
          <div className="empty-state">
            <strong>{emptyTitle}</strong>
            <span>{emptyHint}</span>
          </div>
        ) : activeTab === "allocation" ? (
          allocations.map(({ transaction, amount, monthEndDate }) => {
            const category = categoryById.get(transaction.categoryId);
            return (
              <article className="transaction-row allocation-row" key={`${transaction.id}-${month}`}>
                <time dateTime={monthEndDate}>月末均摊</time>
                <span className="category-dot" style={{ background: category?.color }} />
                <button
                  type="button"
                  className="transaction-main transaction-main-button"
                  onClick={() => previewTransaction(transaction, amount, "月末均摊")}
                >
                  <strong>{cleanMigrationNote(transaction.detail) || category?.name || "未分类"}</strong>
                  <span>
                    {category?.name} · 原始 {formatMoney(transaction.amount, transaction.currency)}
                    {` · 支付 ${formatDate(transaction.date)}`}
                    {transaction.allocationMonths ? ` / ${transaction.allocationMonths} 个月` : ""}
                  </span>
                </button>
                <strong className="money expense-text">-{formatMoney(amount, transaction.currency)}</strong>
                <div className="row-actions">
                  <button onClick={() => startEdit(transaction)}>编辑</button>
                  <button onClick={() => void remove(transaction)}>删除</button>
                </div>
              </article>
            );
          })
        ) : (
          visibleRows.map((transaction) => {
            const category = categoryById.get(transaction.categoryId);
            return (
              <article className="transaction-row" key={transaction.id}>
                <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
                <span className="category-dot" style={{ background: category?.color }} />
                <button
                  type="button"
                  className="transaction-main transaction-main-button"
                  onClick={() => previewTransaction(transaction)}
                >
                  <strong>{transaction.detail || category?.name || "未分类"}</strong>
                  <span>{category?.name}{billedNote(transaction)} {transaction.allocationMonths ? `· 均摊 ${transaction.allocationMonths} 个月` : ""}</span>
                </button>
                <strong className={transaction.direction === "income" ? "money income-text" : "money expense-text"}>
                  {transaction.direction === "income" ? "+" : "-"}{formatMoney(transaction.amount, transaction.currency)}
                </strong>
                <div className="row-actions">
                  <button onClick={() => startEdit(transaction)}>编辑</button>
                  <button onClick={() => void remove(transaction)}>删除</button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

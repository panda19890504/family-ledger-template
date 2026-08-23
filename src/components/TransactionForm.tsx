import { useMemo, useState, type FormEvent } from "react";
import { currentMonth, todayIso } from "../lib/date";
import { isMonthlyFixedCashCommitment } from "../lib/analytics";
import { findRate } from "../lib/money";
import { cleanDecimalInput, parseDecimalInput } from "../lib/numberInput";
import { useLedger } from "../context/LedgerContext";
import { DateSelectField, MonthSelectField } from "./DateFields";
import { buildDetailSuggestions, matchingDetailSuggestions } from "../lib/detailSuggestions";
import type {
  BusinessType,
  Currency,
  Direction,
  LedgerTransaction,
  TransactionInput,
} from "../types";

type FixedEditScope = "current" | "future";

interface TransactionFormProps {
  allocation?: boolean;
  fixed?: boolean;
  forcedDirection?: Exclude<Direction, "neutral">;
  initial?: LedgerTransaction;
  onSaved?: () => void;
  onCancel?: () => void;
}

function inferBusinessType(categoryName: string): BusinessType {
  if (categoryName === "转售") return "resale";
  if (categoryName === "贷款") return "repayment";
  if (categoryName === "理财") return "investment";
  return "daily";
}

function monthFromDate(value: string): string {
  return value.slice(0, 7);
}

function lastMonthOfYear(value: string): string {
  return `${value.slice(0, 4)}-12`;
}

function dayFromDate(value: string): number {
  return Number(value.slice(8, 10)) || 1;
}

function addMonths(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(startMonth: string, endMonth: string): string[] {
  const [startYear, start] = startMonth.split("-").map(Number);
  const [endYear, end] = endMonth.split("-").map(Number);
  const count = (endYear - startYear) * 12 + end - start + 1;
  if (count < 1) return [];
  return Array.from({ length: count }, (_, index) => addMonths(startMonth, index));
}

function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function dateInMonth(month: string, day: number): string {
  return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, "0")}`;
}

export function TransactionForm({
  allocation = false,
  fixed = false,
  forcedDirection,
  initial,
  onSaved,
  onCancel,
}: TransactionFormProps) {
  const { categories, transactions, exchangeRates, addTransaction, updateTransaction, busy } = useLedger();
  const allowsFixedExpense = !initial || initial.direction !== "income";
  const initialFixedExpense = forcedDirection === "income"
    ? false
    : allowsFixedExpense && (fixed || Boolean(initial?.isFixed && !initial.allocationStartMonth && !initial.allocationMonths));
  const [fixedEntry, setFixedEntry] = useState(initialFixedExpense);
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [direction, setDirection] = useState<Direction>(
    forcedDirection ?? (allocation || initialFixedExpense ? "expense" : initial?.direction ?? "expense"),
  );
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "EUR");
  const [foreignPriced, setForeignPriced] = useState(Boolean(initial?.billedAmount));
  const [billedAmount, setBilledAmount] = useState(initial?.billedAmount ? String(initial.billedAmount) : "");
  const [transactionRate, setTransactionRate] = useState(initial?.exchangeRate ? String(initial.exchangeRate) : "");
  const [allocationStartMonth, setAllocationStartMonth] = useState(
    initial?.allocationStartMonth ?? currentMonth(),
  );
  const [allocationMonths, setAllocationMonths] = useState(
    String(initial?.allocationMonths ?? 12),
  );
  const [fixedEndMonth, setFixedEndMonth] = useState(lastMonthOfYear(initial?.date ?? todayIso()));
  const [fixedDay, setFixedDay] = useState(String(dayFromDate(initial?.date ?? todayIso())));
  const [fixedEditScope, setFixedEditScope] = useState<FixedEditScope>("current");
  const [error, setError] = useState<string | null>(null);

  const availableCategories = useMemo(
    () => categories.filter((category) => category.active && category.direction === direction),
    [categories, direction],
  );
  const selectedCategoryId = availableCategories.some((category) => category.id === categoryId)
    ? categoryId
    : availableCategories[0]?.id || "";
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const businessType = selectedCategory ? inferBusinessType(selectedCategory.name) : initial?.businessType ?? "daily";
  const billedNumeric = parseDecimalInput(billedAmount);
  const rateNumeric = parseDecimalInput(transactionRate);
  const canUseSpecialRate = direction === "expense" && currency === "CNY";
  const usesSpecialRate = canUseSpecialRate && foreignPriced;
  const computedCnyAmount = usesSpecialRate && billedNumeric > 0 && rateNumeric > 0
    ? Number((billedNumeric * rateNumeric).toFixed(2))
    : null;
  const displayedAmount = computedCnyAmount === null ? amount : computedCnyAmount.toFixed(2);
  const missingRate = currency === "CNY" && !foreignPriced && findRate(exchangeRates, currency, date) === null;
  const fixedMonths = fixedEntry && !initial ? monthsBetween(monthFromDate(date), fixedEndMonth) : [];
  const directionLocked = Boolean(forcedDirection || allocation);
  const futureFixedTargets = useMemo(() => {
    if (!initial || !fixedEntry || fixedEditScope !== "future") return [];
    const initialMonth = monthFromDate(initial.date);
    const initialDetail = initial.detail.trim();
    return transactions
      .filter((transaction) =>
        transaction.id !== initial.id &&
        monthFromDate(transaction.date) >= initialMonth &&
        transaction.direction === initial.direction &&
        transaction.categoryId === initial.categoryId &&
        transaction.currency === initial.currency &&
        transaction.detail.trim() === initialDetail &&
        isMonthlyFixedCashCommitment(transaction),
      )
      .sort((left, right) => left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt));
  }, [fixedEditScope, fixedEntry, initial, transactions]);
  const detailSuggestions = useMemo(
    () => buildDetailSuggestions(transactions, { categoryId: selectedCategoryId, direction }),
    [direction, selectedCategoryId, transactions],
  );
  const visibleDetailSuggestions = matchingDetailSuggestions(detailSuggestions, detail);

  function changeDate(nextDate: string) {
    setDate(nextDate);
    if (!fixedEntry || initial) return;
    setFixedDay(String(dayFromDate(nextDate)));
    if (fixedEndMonth < monthFromDate(nextDate)) setFixedEndMonth(lastMonthOfYear(nextDate));
  }

  function changeDirection(nextDirection: Exclude<Direction, "neutral">) {
    setDirection(nextDirection);
    if (nextDirection === "income") {
      setFixedEntry(false);
      setForeignPriced(false);
    }
    const firstCategory = categories.find((category) => category.direction === nextDirection);
    setCategoryId(firstCategory?.id ?? "");
  }

  function changeRecordType(nextFixed: boolean) {
    setFixedEntry(nextFixed);
    if (nextFixed) {
      setDirection("expense");
      const firstExpenseCategory = categories.find((category) => category.direction === "expense");
      setCategoryId(firstExpenseCategory?.id ?? "");
    }
  }

  function changeCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
  }

  function changeAmountMode(nextForeignPriced: boolean) {
    if (nextForeignPriced && !canUseSpecialRate) return;
    setForeignPriced(nextForeignPriced);
    if (nextForeignPriced) {
      setCurrency("CNY");
    } else if (computedCnyAmount !== null && !amount) {
      setAmount(computedCnyAmount.toFixed(2));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const numericAmount = usesSpecialRate ? computedCnyAmount ?? Number.NaN : parseDecimalInput(amount);
    if (!selectedCategoryId) return setError("请选择类别");
    if (usesSpecialRate && (!Number.isFinite(billedNumeric) || billedNumeric <= 0)) return setError("请输入大于 0 的账单金额");
    if (usesSpecialRate && (!Number.isFinite(rateNumeric) || rateNumeric <= 0)) return setError("请输入大于 0 的当笔汇率");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setError("请输入大于 0 的金额");
    if (fixedEntry && !initial && fixedMonths.length === 0) return setError("结束月份不能早于开始月份");
    if (fixedEntry && !initial && (!Number(fixedDay) || Number(fixedDay) < 1 || Number(fixedDay) > 31)) {
      return setError("扣款日需要在 1 到 31 之间");
    }

    const input: TransactionInput = {
      date,
      direction,
      categoryId: selectedCategoryId,
      amount: numericAmount,
      currency,
      exchangeRate: usesSpecialRate ? rateNumeric : null,
      billedAmount: usesSpecialRate ? billedNumeric : null,
      billedCurrency: usesSpecialRate ? "EUR" : null,
      detail: detail.trim(),
      businessType,
      isFixed: allocation || fixedEntry,
      allocationStartMonth: allocation ? allocationStartMonth : null,
      allocationMonths: allocation ? Number(allocationMonths) : null,
    };

    try {
      if (initial) {
        await updateTransaction(initial.id, input);
        for (const transaction of futureFixedTargets) {
          await updateTransaction(transaction.id, {
            ...input,
            date: transaction.date,
          });
        }
      }
      else if (fixedEntry) {
        for (const month of fixedMonths) {
          await addTransaction({
            ...input,
            date: dateInMonth(month, Number(fixedDay)),
          });
        }
      } else {
        await addTransaction(input);
      }
      if (!initial) {
        setAmount("");
        setBilledAmount("");
        setTransactionRate("");
        setDetail("");
      }
      onSaved?.();
    } catch {
      setError("没有保存成功，请检查网络后重试");
    }
  }

  return (
    <form className="transaction-form" onSubmit={submit}>
      <div className={directionLocked ? "form-grid" : "form-grid two-columns"}>
        <DateSelectField label={fixedEntry && !initial ? "首次扣款日期" : "日期"} value={date} onChange={changeDate} />
        {!directionLocked && (
          <fieldset className="segmented-field">
            <legend>收支</legend>
            <div className="segmented-control">
              <button
                type="button"
                className={direction === "expense" ? "active expense" : ""}
                onClick={() => changeDirection("expense")}
              >
                支出
              </button>
              <button
                type="button"
                className={direction === "income" ? "active income" : ""}
                onClick={() => changeDirection("income")}
              >
                收入
              </button>
            </div>
          </fieldset>
        )}
      </div>

      {!allocation && initial && direction !== "income" && (
        <fieldset className="segmented-field">
          <legend>记录类型</legend>
          <div className="segmented-control">
            <button
              type="button"
              className={!fixedEntry ? "active" : ""}
              onClick={() => changeRecordType(false)}
            >
              普通流水
            </button>
            <button
              type="button"
              className={fixedEntry ? "active expense" : ""}
              onClick={() => changeRecordType(true)}
            >
              固定支出
            </button>
          </div>
        </fieldset>
      )}

      {fixedEntry && !initial && (
        <div className="allocation-panel">
          <div className="form-grid two-columns">
            <MonthSelectField label="自动生成到" value={fixedEndMonth} onChange={setFixedEndMonth} />
            <label>
              每月扣款日
              <input
                type="number"
                min="1"
                max="31"
                value={fixedDay}
                onChange={(event) => setFixedDay(event.target.value)}
                required
              />
            </label>
          </div>
          <p>
            会创建 {fixedMonths.length} 笔固定支出；遇到月底没有这一天，会自动放到当月最后一天。
          </p>
        </div>
      )}
      {fixedEntry && initial && (
        <div className="fixed-edit-panel">
          <fieldset className="segmented-field fixed-scope-field">
            <legend>修改范围</legend>
            <div className="segmented-control fixed-scope-control">
              <button
                type="button"
                className={fixedEditScope === "current" ? "active" : ""}
                onClick={() => setFixedEditScope("current")}
              >
                只改本月
              </button>
              <button
                type="button"
                className={fixedEditScope === "future" ? "active expense" : ""}
                onClick={() => setFixedEditScope("future")}
              >
                本月起同步后续
              </button>
            </div>
          </fieldset>
          <p>
            {fixedEditScope === "future"
              ? `会修改当前这一笔，并同步 ${futureFixedTargets.length} 笔已存在的后续固定支出；不会新增记录。`
              : "只修改当前月份这一笔，后续月份保持不变。"}
          </p>
        </div>
      )}

      <label>
        类别
        <select value={selectedCategoryId} onChange={(event) => changeCategory(event.target.value)} required>
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </label>

      <fieldset className="segmented-field currency-field">
        <legend>币种</legend>
        <div className="segmented-control currency-control">
          <button
            type="button"
            className={currency === "EUR" ? "active" : ""}
            onClick={() => setCurrency("EUR")}
            disabled={usesSpecialRate}
          >
            EUR 欧元
          </button>
          <button
            type="button"
            className={currency === "CNY" ? "active" : ""}
            onClick={() => setCurrency("CNY")}
          >
            CNY 人民币
          </button>
        </div>
      </fieldset>

      {canUseSpecialRate && (
        <fieldset className="segmented-field amount-mode-field">
          <legend>金额模式</legend>
          <div className="segmented-control amount-mode-control">
            <button
              type="button"
              className={!foreignPriced ? "active" : ""}
              onClick={() => changeAmountMode(false)}
            >
              普通金额
            </button>
            <button
              type="button"
              className={foreignPriced ? "active" : ""}
              onClick={() => changeAmountMode(true)}
            >
              特殊汇率
            </button>
          </div>
        </fieldset>
      )}

      {usesSpecialRate && (
        <div className="foreign-price-panel">
          <div className="form-grid three-columns">
            <label>
              账单金额
              <input
                type="text"
                inputMode="decimal"
                placeholder="50.00"
                value={billedAmount}
                onChange={(event) => setBilledAmount(cleanDecimalInput(event.target.value))}
                required
              />
            </label>
            <label>
              账单币种
              <select value="EUR" disabled>
                <option value="EUR">EUR 欧元</option>
              </select>
            </label>
            <label>
              当笔汇率
              <input
                type="text"
                inputMode="decimal"
                placeholder="5.9000"
                value={transactionRate}
                onChange={(event) => setTransactionRate(cleanDecimalInput(event.target.value))}
                required
              />
            </label>
          </div>
          <p>
            实际扣款 {computedCnyAmount === null ? "待计算" : `¥${computedCnyAmount.toFixed(2)}`}
          </p>
        </div>
      )}

      <div className="amount-field">
        <span>{currency === "EUR" ? "€" : "¥"}</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={displayedAmount}
          onChange={(event) => setAmount(cleanDecimalInput(event.target.value))}
          readOnly={foreignPriced}
          required
          aria-label={foreignPriced ? "实际扣款" : "金额"}
        />
      </div>

      <label>
        明细
        <input
          type="text"
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder="商家、对象或用途"
          maxLength={160}
        />
      </label>
      {visibleDetailSuggestions.length > 0 && (
        <div className="detail-suggestions" aria-label="常用明细建议">
          {visibleDetailSuggestions.map((suggestion) => (
            <button
              key={suggestion.value}
              type="button"
              onClick={() => setDetail(suggestion.value)}
            >
              {suggestion.value}
            </button>
          ))}
        </div>
      )}

      {allocation && (
        <div className="allocation-panel">
          <div className="form-grid two-columns">
            <MonthSelectField label="从哪个月开始均摊" value={allocationStartMonth} onChange={setAllocationStartMonth} />
            <label>
              均摊月数
              <input
                type="number"
                min="1"
                max="120"
                value={allocationMonths}
                onChange={(event) => setAllocationMonths(event.target.value)}
                required
              />
            </label>
          </div>
          {parseDecimalInput(amount) > 0 && Number(allocationMonths) > 0 && (
            <p>每月约 {currency === "EUR" ? "€" : "¥"}{(parseDecimalInput(amount) / Number(allocationMonths)).toFixed(2)}</p>
          )}
        </div>
      )}

      {missingRate && <p className="warning-text">该日期没有可用汇率。不影响保存和 CNY 原币统计，只影响可选的折算 EUR 视图。</p>}

      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        {onCancel && <button type="button" className="ghost-button" onClick={onCancel}>取消</button>}
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "正在保存…" : initial ? "保存修改" : allocation ? "记录并均摊" : fixedEntry ? "记录固定支出" : "记一笔"}
        </button>
      </div>
      {!initial && <p className="submit-hint">{fixedEntry ? "提交后会出现在对应月份的固定支出。" : "提交后会自动出现在对应月份。"}</p>}
      {selectedCategory && businessType !== "daily" && (
        <p className="submit-hint">{selectedCategory.name} 默认不计入家庭日常收支。</p>
      )}
    </form>
  );
}

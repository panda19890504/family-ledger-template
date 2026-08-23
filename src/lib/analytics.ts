import { monthDistance } from "./date";
import type { AnalysisCurrency, AnalysisScope, Category, Currency, ExchangeRate, LedgerTransaction } from "../types";

export interface MonthlyAllocation {
  transaction: LedgerTransaction;
  amount: number;
  monthEndDate: string;
}

type ConversionRates = Partial<Record<Exclude<Currency, "EUR">, number>>;

export function isHouseholdCashFlow(transaction: LedgerTransaction): boolean {
  return !["exchange", "loan", "repayment", "transfer", "investment", "resale"].includes(
    transaction.businessType,
  );
}

export function transactionsForAnalysisScope(
  transactions: LedgerTransaction[],
  scope: AnalysisScope,
): LedgerTransaction[] {
  if (scope === "all_cash") return transactions;
  return transactions.filter(isHouseholdCashFlow);
}

export function latestConversionRates(rates: ExchangeRate[]): ConversionRates {
  const latest = new Map<Exclude<Currency, "EUR">, ExchangeRate>();
  for (const rate of rates) {
    const current = latest.get(rate.currency);
    if (!current || rate.effectiveDate > current.effectiveDate) latest.set(rate.currency, rate);
  }
  return Object.fromEntries([...latest].map(([currency, rate]) => [currency, rate.unitsPerEur])) as ConversionRates;
}

function isIncludedInAnalysis(transaction: LedgerTransaction, scope: AnalysisScope): boolean {
  if (scope === "all_cash") return transaction.isCashTransaction !== false;
  return isHouseholdCashFlow(transaction);
}

export function transactionsForMonth(
  transactions: LedgerTransaction[],
  month: string,
): LedgerTransaction[] {
  return transactions
    .filter((transaction) => transaction.isCashTransaction !== false && transaction.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

function parseCellAddress(address: string | null): { column: number; row: number } | null {
  const match = address?.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const column = [...match[1]].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0);
  return { column, row: Number(match[2]) };
}

function isLegacy2026MonthlyFixedBlock(transaction: LedgerTransaction): boolean {
  if (transaction.sourceSheet !== "2026") return false;
  const cell = parseCellAddress(transaction.sourceCell);
  if (!cell) return false;

  const inJanToMarFixedBlock = cell.row >= 92 && cell.row <= 102 && [7, 15, 23].includes(cell.column);
  const inAprToMayFixedBlock = cell.row >= 186 && cell.row <= 196 && [7, 15].includes(cell.column);
  return inJanToMarFixedBlock || inAprToMayFixedBlock;
}

export function isMonthlyFixedCashCommitment(transaction: LedgerTransaction): boolean {
  if (transaction.direction !== "expense" || transaction.isCashTransaction === false) return false;
  if (transaction.allocationStartMonth || transaction.allocationMonths) return false;
  return (transaction.isFixed && transaction.isCashTransaction) || isLegacy2026MonthlyFixedBlock(transaction);
}

export function monthlyFixedCashCommitmentsForMonth(
  transactions: LedgerTransaction[],
  month: string,
): LedgerTransaction[] {
  return transactionsForMonth(transactions, month).filter(isMonthlyFixedCashCommitment);
}

export function availableTransactionMonths(transactions: LedgerTransaction[]): string[] {
  return Array.from(
    new Set(
      transactions.flatMap((transaction) => {
        const months = transaction.isCashTransaction !== false ? [transaction.date.slice(0, 7)] : [];
        if (!transaction.allocationStartMonth || !transaction.allocationMonths) return months;
        return [
          ...months,
          ...Array.from({ length: transaction.allocationMonths }, (_, index) =>
            addMonths(transaction.allocationStartMonth ?? transaction.date.slice(0, 7), index),
          ),
        ];
      }),
    ),
  ).sort((a, b) => b.localeCompare(a));
}

function addMonths(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthEndDate(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function valueForCurrency(
  transaction: LedgerTransaction,
  analysisCurrency: AnalysisCurrency,
  conversionRates: ConversionRates = {},
): number | null {
  if (analysisCurrency === "EUR_CONVERTED") {
    if (transaction.currency === "EUR") return transaction.amount;
    const rate = conversionRates[transaction.currency];
    return rate ? transaction.amount / rate : null;
  }
  return transaction.currency === analysisCurrency ? transaction.amount : null;
}

export function allocatedAmountForMonth(
  transaction: LedgerTransaction,
  month: string,
  analysisCurrency: AnalysisCurrency = "EUR",
  conversionRates: ConversionRates = {},
): number {
  const value = valueForCurrency(transaction, analysisCurrency, conversionRates);
  if (value === null) return 0;
  if (!transaction.allocationStartMonth || !transaction.allocationMonths) {
    return transaction.isCashTransaction !== false && transaction.date.startsWith(month) ? value : 0;
  }
  const distance = monthDistance(transaction.allocationStartMonth, month);
  return distance >= 0 && distance < transaction.allocationMonths
    ? value / transaction.allocationMonths
    : 0;
}

export function allocationsForMonth(
  transactions: LedgerTransaction[],
  month: string,
): MonthlyAllocation[] {
  return transactions
    .filter((transaction) => {
      if (!isHouseholdCashFlow(transaction) || transaction.direction !== "expense") return false;
      if (!transaction.allocationStartMonth || !transaction.allocationMonths) return false;
      const distance = monthDistance(transaction.allocationStartMonth, month);
      return distance >= 0 && distance < transaction.allocationMonths;
    })
    .map((transaction) => ({
      transaction,
      amount: transaction.amount / (transaction.allocationMonths ?? 1),
      monthEndDate: monthEndDate(month),
    }))
    .sort((a, b) =>
      a.transaction.currency.localeCompare(b.transaction.currency) ||
      a.transaction.detail.localeCompare(b.transaction.detail) ||
      a.transaction.id.localeCompare(b.transaction.id),
    );
}

export interface MonthMetrics {
  income: number;
  expense: number;
  balance: number;
  allocatedExpense: number;
  pendingConversion: number;
}

export function calculateMonthMetrics(
  transactions: LedgerTransaction[],
  month: string,
  analysisCurrency: AnalysisCurrency = "EUR",
  analysisScope: AnalysisScope = "household",
  conversionRates: ConversionRates = {},
): MonthMetrics {
  let income = 0;
  let expense = 0;
  let allocatedExpense = 0;
  let pendingConversion = 0;

  for (const transaction of transactions) {
    if (!isIncludedInAnalysis(transaction, analysisScope)) continue;
    const isCashInMonth = transaction.isCashTransaction !== false && transaction.date.startsWith(month);
    if (
      analysisCurrency === "EUR_CONVERTED" &&
      isCashInMonth &&
      transaction.currency !== "EUR" &&
      !conversionRates[transaction.currency]
    ) {
      pendingConversion += 1;
    }
    const value = valueForCurrency(transaction, analysisCurrency, conversionRates);
    if (isCashInMonth && value !== null) {
      if (transaction.direction === "income") income += value;
      if (transaction.direction === "expense") expense += value;
    }
    if (transaction.direction === "expense") {
      allocatedExpense += allocatedAmountForMonth(transaction, month, analysisCurrency, conversionRates);
    }
  }

  return { income, expense, balance: income - expense, allocatedExpense, pendingConversion };
}

export function categoryExpenseData(
  transactions: LedgerTransaction[],
  categories: Category[],
  month: string,
  analysisCurrency: AnalysisCurrency = "EUR",
  analysisScope: AnalysisScope = "household",
  conversionRates: ConversionRates = {},
): Array<{ name: string; value: number; color: string }> {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.direction !== "expense" || !isIncludedInAnalysis(transaction, analysisScope)) {
      continue;
    }
    const value = allocatedAmountForMonth(transaction, month, analysisCurrency, conversionRates);
    if (value > 0) totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + value);
  }
  return categories
    .map((category) => ({
      name: category.name,
      value: totals.get(category.id) ?? 0,
      color: category.color,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function categoryExpenseDataForMonths(
  transactions: LedgerTransaction[],
  categories: Category[],
  months: string[],
  analysisCurrency: AnalysisCurrency = "EUR",
  analysisScope: AnalysisScope = "household",
  conversionRates: ConversionRates = {},
): Array<{ name: string; value: number; color: string }> {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.direction !== "expense" || !isIncludedInAnalysis(transaction, analysisScope)) {
      continue;
    }
    const value = months.reduce(
      (sum, month) => sum + allocatedAmountForMonth(transaction, month, analysisCurrency, conversionRates),
      0,
    );
    if (value > 0) totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + value);
  }
  return categories
    .map((category) => ({
      name: category.name,
      value: totals.get(category.id) ?? 0,
      color: category.color,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function categoryIncomeData(
  transactions: LedgerTransaction[],
  categories: Category[],
  months: string[],
  analysisCurrency: AnalysisCurrency = "EUR",
  analysisScope: AnalysisScope = "household",
  conversionRates: ConversionRates = {},
): Array<{ name: string; value: number; color: string }> {
  const monthSet = new Set(months);
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.direction !== "income" || !isIncludedInAnalysis(transaction, analysisScope)) {
      continue;
    }
    if (transaction.isCashTransaction === false || !monthSet.has(transaction.date.slice(0, 7))) continue;
    const value = valueForCurrency(transaction, analysisCurrency, conversionRates);
    if (value !== null && value > 0) totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + value);
  }
  return categories
    .map((category) => ({
      name: category.name,
      value: totals.get(category.id) ?? 0,
      color: category.color,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function yearTrend(
  transactions: LedgerTransaction[],
  year: string,
  analysisCurrency: AnalysisCurrency = "EUR",
  analysisScope: AnalysisScope = "household",
  conversionRates: ConversionRates = {},
): Array<{ month: string; income: number; expense: number; balance: number; allocatedExpense: number }> {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    return {
      month: `${index + 1}月`,
      ...calculateMonthMetrics(transactions, month, analysisCurrency, analysisScope, conversionRates),
    };
  });
}

export function displayCurrency(analysisCurrency: AnalysisCurrency): Currency {
  return analysisCurrency === "CNY" ? "CNY" : "EUR";
}

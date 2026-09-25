import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLedger } from "../context/LedgerContext";
import { MonthSelectField } from "../components/DateFields";
import {
  calculateMonthMetrics,
  categoryExpenseData,
  categoryExpenseDataForMonths,
  categoryIncomeData,
  latestConversionRates,
  transactionsForAnalysisScope,
  yearTrend,
} from "../lib/analytics";
import { formatMonth } from "../lib/date";
import { formatMoney } from "../lib/money";
import type { AnalysisCurrency, AnalysisScope, Currency } from "../types";

interface DashboardPageProps {
  month: string;
  onMonthChange(month: string): void;
}

interface BarLabelProps {
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  value?: unknown;
  index?: unknown;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: unknown;
  payload?: Array<{
    name?: unknown;
    value?: unknown;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  hiddenKey: string | null;
  title: string;
  formatValue(value: unknown, name?: unknown): string;
  onClose(key: string): void;
}

interface CompositionDatum {
  name: string;
  value: number;
  color: string;
  details?: Array<{ name: string; value: number }>;
}

const compositionPalette = [
  "#2f7f6f",
  "#d06f4f",
  "#557fa0",
  "#d7a04f",
  "#7769a5",
  "#6ea37c",
  "#b85f79",
  "#8a7345",
  "#5b8f8f",
  "#9a7464",
];
const compositionMaxItems = 6;

interface AxisAlignedBarShapeProps {
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  fill?: string;
  value?: unknown;
}

function AxisAlignedBarShape({ x, y, width, height, fill, value }: AxisAlignedBarShapeProps) {
  const barX = Number(x);
  const barY = Number(y);
  const barWidth = Number(width);
  const rawHeight = Number(height);
  if (![barX, barY, barWidth, rawHeight].every(Number.isFinite) || barWidth <= 0 || rawHeight === 0) return <g />;

  const barHeight = Math.abs(rawHeight);
  const numericValue = Number(Array.isArray(value) ? value[value.length - 1] : value);
  const isPositive = Number.isFinite(numericValue) ? numericValue >= 0 : rawHeight >= 0;
  const top = isPositive ? barY : barY - barHeight;
  const bottom = isPositive ? barY + barHeight : barY;
  const radius = Math.min(7, barWidth / 2, barHeight);
  const right = barX + barWidth;
  const path = isPositive
    ? [
      `M ${barX} ${bottom}`,
      `L ${barX} ${top + radius}`,
      `Q ${barX} ${top} ${barX + radius} ${top}`,
      `L ${right - radius} ${top}`,
      `Q ${right} ${top} ${right} ${top + radius}`,
      `L ${right} ${bottom}`,
      "Z",
    ].join(" ")
    : [
      `M ${barX} ${top}`,
      `L ${right} ${top}`,
      `L ${right} ${bottom - radius}`,
      `Q ${right} ${bottom} ${right - radius} ${bottom}`,
      `L ${barX + radius} ${bottom}`,
      `Q ${barX} ${bottom} ${barX} ${bottom - radius}`,
      "Z",
    ].join(" ");

  return <path d={path} fill={fill} />;
}

function buildCompositionData(
  data: Array<{ name: string; value: number }>,
  offset = 0,
): CompositionDatum[] {
  const visible = data.slice(0, compositionMaxItems);
  const details = data.slice(compositionMaxItems);
  const restValue = details.reduce((sum, item) => sum + item.value, 0);
  const chartData = restValue > 0 ? [...visible, { name: "其余分类", value: restValue, details }] : visible;
  return chartData.map((item, index) => ({
    ...item,
    color: compositionPalette[(index + offset) % compositionPalette.length],
  }));
}

function niceAxisMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 100;
  const padded = value * 1.16;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 4 ? 4 : normalized <= 6 ? 6 : normalized <= 8 ? 8 : 10;
  return niceNormalized * magnitude;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? false
      : window.matchMedia(query).matches
  ));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function tooltipKey(label: unknown, payload?: ChartTooltipProps["payload"]): string {
  const firstPayload = payload?.[0]?.payload;
  return String(firstPayload?.name ?? label ?? "");
}

function ChartTooltip({ active, label, payload, hiddenKey, title, formatValue, onClose }: ChartTooltipProps) {
  const key = tooltipKey(label, payload);
  if (!active || !payload?.length || key === hiddenKey) return null;
  const rawDetails = payload[0]?.payload?.details;
  const details = Array.isArray(rawDetails)
    ? rawDetails.filter((item): item is { name: string; value: number } => (
      typeof item === "object"
      && item !== null
      && typeof (item as { name?: unknown }).name === "string"
      && typeof (item as { value?: unknown }).value === "number"
    ))
    : [];
  const stopTooltipEvent = (event: SyntheticEvent) => {
    event.stopPropagation();
  };
  return (
    <div className="chart-tooltip" onPointerDown={stopTooltipEvent} onClick={stopTooltipEvent}>
      <div className="chart-tooltip-head">
        <strong>{key || title}</strong>
        <button
          type="button"
          aria-label="关闭图表提示"
          onPointerDown={stopTooltipEvent}
          onMouseDown={stopTooltipEvent}
          onClick={(event) => {
            stopTooltipEvent(event);
            onClose(key);
          }}
        >
          ×
        </button>
      </div>
      <span>{title}</span>
      {payload.map((item, index) => (
        <div className="chart-tooltip-row" key={`${String(item.name)}-${index}`}>
          <i style={{ background: item.color }} />
          <small>{String(item.name ?? "数值")}</small>
          <b>{formatValue(item.value, item.name)}</b>
        </div>
      ))}
      {details.length > 0 && (
        <div className="chart-tooltip-breakdown">
          {details.map((item) => (
            <div key={item.name}>
              <small>{item.name}</small>
              <b>{formatValue(item.value)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompositionRankList({
  data,
  valueClassName,
  formatValue,
}: {
  data: CompositionDatum[];
  valueClassName: string;
  formatValue(value: number): string;
}) {
  return (
    <div className="rank-list">
      {data.map((item) => item.details?.length ? (
        <details className="composition-rest" key={item.name}>
          <summary aria-label={`${item.name}，包含 ${item.details.length} 项`}>
            <span>
              <i style={{ background: item.color }} />
              {item.name}
              <small>{item.details.length} 项</small>
            </span>
            <strong className={valueClassName}>{formatValue(item.value)}</strong>
          </summary>
          <div className="composition-rest-popover" role="tooltip">
            {item.details.map((detail) => (
              <div key={detail.name}>
                <span>{detail.name}</span>
                <strong className={valueClassName}>{formatValue(detail.value)}</strong>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <div key={item.name}>
          <span><i style={{ background: item.color }} />{item.name}</span>
          <strong className={valueClassName}>{formatValue(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage({ month, onMonthChange }: DashboardPageProps) {
  const { transactions, categories, exchangeRates } = useLedger();
  const [analysisCurrency, setAnalysisCurrency] = useState<AnalysisCurrency>("EUR");
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>("all_cash");
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [hiddenTooltipKey, setHiddenTooltipKey] = useState<string | null>(null);
  const isNarrowChart = useMediaQuery("(max-width: 640px)");
  const year = month.slice(0, 4);
  const selectedMonthIndex = Number(month.slice(5, 7)) - 1;
  const yearToDateMonths = useMemo(
    () => Array.from({ length: selectedMonthIndex + 1 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`),
    [selectedMonthIndex, year],
  );
  const displayCurrency: Currency = analysisCurrency === "CNY" ? "CNY" : "EUR";
  const scopeLabel = analysisScope === "all_cash" ? "全部流水" : "家庭日常";
  const analysisNoun = analysisScope === "all_cash" ? "流水" : "家庭";
  const monthlyIncomeLabel = `${analysisNoun}月收入`;
  const monthlyExpenseLabel = `${analysisNoun}月支出（含均摊）`;
  const monthlyBalanceLabel = `${analysisNoun}月结余`;
  const monthlyCashExpenseLabel = `${analysisNoun}月支出（实际）`;
  const yearlyBalanceLabel = `${year} 年${analysisNoun}结余`;
  const currencyLabel = analysisCurrency === "EUR_CONVERTED"
    ? "折算 EUR"
    : displayCurrency;
  const scopeDescription = analysisScope === "all_cash"
    ? "全部流水包含转售、理财、转账等所有现金记录。"
    : "家庭日常会排除转售、理财、转账、贷款和换汇。";
  const currencyDescription = analysisCurrency === "EUR_CONVERTED"
    ? "当前把 CNY 按统一报表汇率折成 EUR 后合并查看。"
    : `当前只看 ${displayCurrency} 记录，不做汇率折算。`;
  const conversionRates = useMemo(() => latestConversionRates(exchangeRates), [exchangeRates]);
  const scopedTransactions = useMemo(
    () => transactionsForAnalysisScope(transactions, analysisScope),
    [analysisScope, transactions],
  );
  const cnyReportRate = useMemo(
    () => exchangeRates
      .filter((rate) => rate.currency === "CNY")
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null,
    [exchangeRates],
  );
  const metrics = useMemo(
    () => calculateMonthMetrics(scopedTransactions, month, analysisCurrency, analysisScope, conversionRates),
    [analysisCurrency, analysisScope, conversionRates, month, scopedTransactions],
  );
  const categoryData = useMemo(
    () => categoryExpenseData(scopedTransactions, categories, month, analysisCurrency, analysisScope, conversionRates),
    [analysisCurrency, analysisScope, categories, conversionRates, month, scopedTransactions],
  );
  const trend = useMemo(
    () => yearTrend(scopedTransactions, year, analysisCurrency, analysisScope, conversionRates),
    [analysisCurrency, analysisScope, conversionRates, scopedTransactions, year],
  );
  const previousYear = String(Number(year) - 1);
  const previousYearTrend = useMemo(
    () => yearTrend(scopedTransactions, previousYear, analysisCurrency, analysisScope, conversionRates),
    [analysisCurrency, analysisScope, conversionRates, previousYear, scopedTransactions],
  );
  const yearToDateTrend = trend.slice(0, selectedMonthIndex + 1);
  const previousYearToDateTrend = previousYearTrend.slice(0, selectedMonthIndex + 1);
  const annualIncomeData = useMemo(
    () => categoryIncomeData(scopedTransactions, categories, yearToDateMonths, analysisCurrency, analysisScope, conversionRates),
    [analysisCurrency, analysisScope, categories, conversionRates, scopedTransactions, yearToDateMonths],
  );
  const annualExpenseData = useMemo(
    () => categoryExpenseDataForMonths(scopedTransactions, categories, yearToDateMonths, analysisCurrency, analysisScope, conversionRates),
    [analysisCurrency, analysisScope, categories, conversionRates, scopedTransactions, yearToDateMonths],
  );
  const annualIncomeChartData = useMemo(
    () => buildCompositionData(annualIncomeData),
    [annualIncomeData],
  );
  const annualExpenseChartData = useMemo(
    () => buildCompositionData(annualExpenseData, 3),
    [annualExpenseData],
  );
  const yearToDateIncome = yearToDateTrend.reduce((sum, item) => sum + item.income, 0);
  const yearToDateAllocatedExpense = yearToDateTrend.reduce((sum, item) => sum + item.allocatedExpense, 0);
  const yearToDateCashExpense = yearToDateTrend.reduce((sum, item) => sum + item.expense, 0);
  const yearToDateBalance = yearToDateIncome - yearToDateAllocatedExpense;
  const previousYearToDateIncome = previousYearToDateTrend.reduce((sum, item) => sum + item.income, 0);
  const previousYearToDateAllocatedExpense = previousYearToDateTrend.reduce((sum, item) => sum + item.allocatedExpense, 0);
  const previousYearToDateBalance = previousYearToDateIncome - previousYearToDateAllocatedExpense;
  const hasPreviousYearData = previousYearToDateTrend.some((item) => item.income > 0 || item.expense > 0 || item.allocatedExpense > 0);
  const monthlyCost = metrics.allocatedExpense;
  const monthlyBalance = metrics.income - monthlyCost;
  const signedMoney = (value: number) => {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${formatMoney(Math.abs(value), displayCurrency)}`;
  };
  const signedClass = (value: number) => value >= 0 ? "metric-positive" : "metric-negative";
  const expenseMoney = (value: number) => signedMoney(-Math.abs(value));
  const deltaMoney = (value: number) => value === 0 ? "持平" : signedMoney(value);
  const deltaClass = (value: number) => value === 0 ? "" : signedClass(value);
  const barMoney = (value: unknown) => expenseMoney(Math.abs(Number(value)));
  const categoryChartHeight = Math.max(330, categoryData.length * 34);
  const categoryAxisMax = niceAxisMax(Math.max(0, ...categoryData.map((item) => item.value)));
  const categoryChartData = useMemo(
    () => categoryData.map((item) => ({ ...item, expenseValue: -item.value })),
    [categoryData],
  );
  const categoryChartMargin = isNarrowChart
    ? { left: 58, right: 0, top: 4, bottom: 4 }
    : { left: 64, right: 0, top: 4, bottom: 4 };
  const categoryAxisWidth = isNarrowChart ? 62 : 70;
  const categoryTickFontSize = isNarrowChart ? 11 : 12;
  const chartTickStyle = { fontSize: categoryTickFontSize, fontFamily: "inherit" };
  const renderCategoryBarLabel = ({ x, y, width, height, value, index }: BarLabelProps) => {
    const labelX = Number(x);
    const labelY = Number(y);
    const labelWidth = Number(width);
    const labelHeight = Number(height);
    if (![labelX, labelY, labelWidth, labelHeight].every(Number.isFinite)) return <g />;
    const leftEdge = Math.min(labelX, labelX + labelWidth);
    const rowIndex = Number(index);
    const labelColor = Number.isInteger(rowIndex) ? categoryChartData[rowIndex]?.color ?? "#56655f" : "#56655f";
    return (
      <text
        x={leftEdge - 10}
        y={labelY + labelHeight / 2}
        className="bar-value-label"
        fill={labelColor}
        textAnchor="end"
        dominantBaseline="middle"
      >
        {barMoney(value)}
      </text>
    );
  };
  const trendData = useMemo(
    () => trend.map((item) => ({
      ...item,
      expense: -item.allocatedExpense,
      balance: item.income - item.allocatedExpense,
    })),
    [trend],
  );
  const comparisonRows = yearToDateTrend.map((item, index) => {
    const previous = index > 0 ? yearToDateTrend[index - 1] : previousYearTrend[11] ?? null;
    const balance = item.income - item.allocatedExpense;
    const expenseDelta = previous ? item.allocatedExpense - previous.allocatedExpense : 0;
    return {
      month: item.month,
      income: item.income,
      allocatedExpense: item.allocatedExpense,
      cashExpense: item.expense,
      balance,
      expenseDelta,
    };
  });
  const comparisonChartData = comparisonRows.map((item) => ({
    ...item,
    expense: -item.allocatedExpense,
  }));
  const signedAxisMoney = (value: unknown) => {
    const numeric = Number(value);
    const sign = numeric < 0 ? "-" : "";
    return `${sign}${displayCurrency === "CNY" ? "¥" : "€"}${Math.round(Math.abs(numeric))}`;
  };
  const trendTooltip = (value: unknown, name: unknown) => {
    const numeric = Number(value);
    const label = String(name);
    if (label.includes("支出")) return [expenseMoney(Math.abs(numeric)), label] as [string, string];
    return [signedMoney(numeric), label] as [string, string];
  };

  return (
    <div className="page dashboard-page">
      <header className="page-header split-header">
        <div>
          <div className="dashboard-title-row">
            <p className="eyebrow">分析</p>
            <button
              type="button"
              className="definition-button"
              aria-label="查看分析口径说明"
              onClick={() => setShowDefinitions(true)}
            >
              i
            </button>
          </div>
          <h1>{formatMonth(month)}</h1>
          <p>{scopeDescription}{currencyDescription}</p>
        </div>
        <div className="dashboard-filters">
          <MonthSelectField label="分析月份" value={month} onChange={onMonthChange} />
          <fieldset className="segmented-field currency-view">
            <legend>统计范围</legend>
            <div className="segmented-control">
              {([['all_cash', '全部流水'], ['household', '家庭日常']] as const).map(([value, label]) => (
                <button key={value} type="button" className={analysisScope === value ? "active" : ""} onClick={() => setAnalysisScope(value)}>{label}</button>
              ))}
            </div>
          </fieldset>
          <fieldset className="segmented-field currency-view">
            <legend>统计口径</legend>
            <div className="segmented-control three-options">
              {([['EUR', 'EUR'], ['CNY', 'CNY'], ['EUR_CONVERTED', '折算 EUR']] as const).map(([value, label]) => (
                <button key={value} type="button" className={analysisCurrency === value ? "active" : ""} onClick={() => setAnalysisCurrency(value)}>{label}</button>
              ))}
            </div>
          </fieldset>
        </div>
      </header>

      {showDefinitions && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowDefinitions(false)}>
          <section
            className="surface definition-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-definitions-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-title">
              <div>
                <p className="eyebrow">统计定义</p>
                <h2 id="analysis-definitions-title">这些数字怎么算</h2>
              </div>
              <button type="button" className="text-button" onClick={() => setShowDefinitions(false)}>关闭</button>
            </div>
            <dl className="definition-list">
              <div>
                <dt>EUR / CNY</dt>
                <dd>只统计原始币种就是 EUR 或 CNY 的记录，不做汇率折算。</dd>
              </div>
              <div>
                <dt>折算 EUR</dt>
                <dd>把 CNY 记录按设置里的统一报表汇率折成 EUR，再和 EUR 记录合并查看。</dd>
              </div>
              <div>
                <dt>月支出（实际）</dt>
                <dd>这个月真实发生的现金支出，按付款日期统计；年费、季度费会全部落在实际付款月。</dd>
              </div>
              <div>
                <dt>月支出（含均摊）</dt>
                <dd>用于预算观察的月成本：普通支出按当月计入，年费/季度费按均摊规则分到每个月。</dd>
              </div>
              <div>
                <dt>月结余</dt>
                <dd>月收入 - 月支出（含均摊）。它不是纯现金流水结余。</dd>
              </div>
              <div>
                <dt>全部流水 / 家庭日常</dt>
                <dd>全部流水包含所有现金记录；家庭日常会排除转售、理财、转账、贷款和换汇。</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {analysisCurrency === "EUR_CONVERTED" && cnyReportRate && (
        <div className="info-banner">
          折算 EUR 使用统一报表汇率：1 EUR = {cnyReportRate.unitsPerEur.toFixed(4)} CNY（{cnyReportRate.effectiveDate}）。
        </div>
      )}

      {analysisCurrency === "EUR_CONVERTED" && metrics.pendingConversion > 0 && (
        <div className="warning-banner">缺少 CNY 折算汇率，{metrics.pendingConversion} 笔人民币流水暂未计入折算 EUR；原币统计不受影响。</div>
      )}

      <section className="kpi-grid">
        <article className="kpi-card income-card"><span>{monthlyIncomeLabel}</span><strong className="metric-positive">{signedMoney(metrics.income)}</strong></article>
        <article className="kpi-card book-expense-card"><span>{monthlyExpenseLabel}</span><strong className="metric-negative">{expenseMoney(monthlyCost)}</strong></article>
        <article className="kpi-card balance-card"><span>{monthlyBalanceLabel}</span><strong className={signedClass(monthlyBalance)}>{signedMoney(monthlyBalance)}</strong></article>
        <article className="kpi-card cash-payment-card"><span>{monthlyCashExpenseLabel}</span><strong className="metric-negative">{expenseMoney(metrics.expense)}</strong></article>
      </section>

      <section className="surface year-summary-card">
        <span>{yearlyBalanceLabel}（截至 {selectedMonthIndex + 1} 月）</span>
        <strong className={signedClass(yearToDateBalance)}>{signedMoney(yearToDateBalance)}</strong>
        <small>{scopeLabel} · {currencyLabel}</small>
      </section>

      <section className="kpi-grid annual-kpi-grid">
        <article className="kpi-card income-card"><span>{year} 年累计收入</span><strong className="metric-positive">{signedMoney(yearToDateIncome)}</strong></article>
        <article className="kpi-card book-expense-card"><span>{year} 年累计支出（含均摊）</span><strong className="metric-negative">{expenseMoney(yearToDateAllocatedExpense)}</strong></article>
        <article className="kpi-card balance-card"><span>{year} 年累计结余</span><strong className={signedClass(yearToDateBalance)}>{signedMoney(yearToDateBalance)}</strong></article>
        <article className="kpi-card cash-payment-card"><span>{year} 年实际现金支出</span><strong className="metric-negative">{expenseMoney(yearToDateCashExpense)}</strong></article>
      </section>

      <section className="surface comparison-card">
        <div className="section-title">
          <div>
            <p className="eyebrow">去年同期</p>
            <h2>{year} vs {previousYear}</h2>
            <span>比较 1-{selectedMonthIndex + 1} 月累计</span>
          </div>
        </div>
        {hasPreviousYearData ? (
          <div className="comparison-metrics">
            <div><span>收入变化</span><strong className={deltaClass(yearToDateIncome - previousYearToDateIncome)}>{deltaMoney(yearToDateIncome - previousYearToDateIncome)}</strong></div>
            <div><span>支出变化（含均摊）</span><strong className={deltaClass(-(yearToDateAllocatedExpense - previousYearToDateAllocatedExpense))}>{deltaMoney(-(yearToDateAllocatedExpense - previousYearToDateAllocatedExpense))}</strong></div>
            <div><span>结余变化</span><strong className={deltaClass(yearToDateBalance - previousYearToDateBalance)}>{deltaMoney(yearToDateBalance - previousYearToDateBalance)}</strong></div>
          </div>
        ) : (
          <p className="muted">去年同期有记录后，这里会显示同比变化。</p>
        )}
      </section>

      <div className="chart-grid">
        <section className="surface chart-card">
          <div className="section-title">
            <div>
              <p className="eyebrow">支出去向</p>
              <h2>分类支出金额</h2>
              <span>{analysisNoun}月支出（含均摊）</span>
            </div>
          </div>
          {categoryData.length === 0 ? (
            <div className="empty-chart">本月有支出后，这里会显示分类占比。</div>
          ) : (
            <ResponsiveContainer className="category-chart-container" width="100%" height={categoryChartHeight}>
              <BarChart data={categoryChartData} layout="vertical" margin={categoryChartMargin} onClick={() => setHiddenTooltipKey(null)}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8e3d8" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickFormatter={signedAxisMoney}
                  domain={[-categoryAxisMax, 0]}
                  tick={chartTickStyle}
                />
                <ReferenceLine x={0} stroke="#9a9387" strokeWidth={1.2} />
                <YAxis
                  dataKey="name"
                  type="category"
                  orientation="right"
                  width={categoryAxisWidth}
                  tickMargin={8}
                  interval={0}
                  tick={chartTickStyle}
                  tickLine={false}
                />
                <Tooltip
                  trigger="click"
                  cursor={{ fill: "rgba(30, 54, 47, 0.05)" }}
                  wrapperStyle={{ pointerEvents: "auto" }}
                  content={(
                    <ChartTooltip
                      hiddenKey={hiddenTooltipKey}
                      title="分类支出（含均摊）"
                      formatValue={(value) => expenseMoney(Math.abs(Number(value)))}
                      onClose={setHiddenTooltipKey}
                    />
                  )}
                />
                <Bar dataKey="expenseValue" name="金额" radius={[0, 8, 8, 0]}>
                  <LabelList dataKey="expenseValue" content={renderCategoryBarLabel} />
                  {categoryChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="surface chart-card">
          <div className="section-title"><div><p className="eyebrow">全年走势</p><h2>每月收支结余</h2></div></div>
          <ResponsiveContainer width="100%" height={330}>
            <LineChart data={trendData} margin={{ left: 4, right: 16, top: 4, bottom: 4 }} onClick={() => setHiddenTooltipKey(null)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e3d8" />
              <XAxis dataKey="month" interval={0} tick={chartTickStyle} />
              <YAxis tickFormatter={signedAxisMoney} width={68} allowDecimals={false} tick={chartTickStyle} />
              <Tooltip
                trigger="click"
                wrapperStyle={{ pointerEvents: "auto" }}
                content={(
                  <ChartTooltip
                    hiddenKey={hiddenTooltipKey}
                    title="每月收支结余"
                    formatValue={(value, name) => trendTooltip(value, name)[0]}
                    onClose={setHiddenTooltipKey}
                  />
                )}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="plainline"
                wrapperStyle={{ fontFamily: "inherit", fontSize: `${categoryTickFontSize}px`, paddingBottom: 8 }}
              />
              <ReferenceLine y={0} stroke="#9a9387" strokeWidth={1.2} />
              <Line type="monotone" dataKey="income" name={`${analysisNoun}月收入`} stroke="#297a64" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="expense" name={`${analysisNoun}月支出（含均摊）`} stroke="#c7664c" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="balance" name={`${analysisNoun}月结余`} stroke="#4f7896" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="analysis-grid">
        <section className="surface analysis-card composition-card">
          <div className="section-title">
            <div>
              <p className="eyebrow">年度构成</p>
              <h2>收入与支出构成</h2>
              <span>{year} 年 1-{selectedMonthIndex + 1} 月 · {scopeLabel} · {currencyLabel}</span>
            </div>
          </div>
          <div className="composition-grid">
            <div className="composition-panel">
              <h3>年度收入构成</h3>
              {annualIncomeChartData.length === 0 ? (
                <div className="empty-chart compact-empty-chart">有收入记录后，这里会显示收入来源。</div>
              ) : (
                <div className="composition-chart">
                  <div className="composition-donut" aria-label="年度收入构成图">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart onClick={() => setHiddenTooltipKey(null)}>
                        <Pie
                          data={annualIncomeChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          {annualIncomeChartData.map((item) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip
                          trigger="click"
                          wrapperStyle={{ pointerEvents: "auto" }}
                          content={(
                            <ChartTooltip
                              hiddenKey={hiddenTooltipKey}
                              title="年度收入构成"
                              formatValue={(value) => signedMoney(Number(value))}
                              onClose={setHiddenTooltipKey}
                            />
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <CompositionRankList
                    data={annualIncomeChartData}
                    valueClassName="income-text"
                    formatValue={signedMoney}
                  />
                </div>
              )}
            </div>

            <div className="composition-panel">
              <h3>年度支出构成</h3>
              {annualExpenseChartData.length === 0 ? (
                <div className="empty-chart compact-empty-chart">有支出记录后，这里会显示支出去向。</div>
              ) : (
                <div className="composition-chart">
                  <div className="composition-donut" aria-label="年度支出构成图">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart onClick={() => setHiddenTooltipKey(null)}>
                        <Pie
                          data={annualExpenseChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          {annualExpenseChartData.map((item) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip
                          trigger="click"
                          wrapperStyle={{ pointerEvents: "auto" }}
                          content={(
                            <ChartTooltip
                              hiddenKey={hiddenTooltipKey}
                              title="年度支出构成（含均摊）"
                              formatValue={(value) => expenseMoney(Number(value))}
                              onClose={setHiddenTooltipKey}
                            />
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <CompositionRankList
                    data={annualExpenseChartData}
                    valueClassName="expense-text"
                    formatValue={expenseMoney}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="surface analysis-card month-comparison-card">
          <div className="section-title">
            <div>
              <p className="eyebrow">月份对比</p>
              <h2>每月收支表</h2>
              <span>{scopeLabel} · {currencyLabel}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonChartData} margin={{ left: 4, right: 16, top: 6, bottom: 4 }} onClick={() => setHiddenTooltipKey(null)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e3d8" />
              <XAxis dataKey="month" interval={0} tick={chartTickStyle} />
              <YAxis tickFormatter={signedAxisMoney} width={68} allowDecimals={false} tick={chartTickStyle} />
              <ReferenceLine y={0} stroke="#9a9387" strokeWidth={1.2} />
              <Tooltip
                trigger="click"
                wrapperStyle={{ pointerEvents: "auto" }}
                content={(
                  <ChartTooltip
                    hiddenKey={hiddenTooltipKey}
                    title="月份对比"
                    formatValue={(value, name) => trendTooltip(value, name)[0]}
                    onClose={setHiddenTooltipKey}
                  />
                )}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="plainline"
                wrapperStyle={{ fontFamily: "inherit", fontSize: `${categoryTickFontSize}px`, paddingBottom: 8 }}
              />
              <Bar dataKey="income" name={`${analysisNoun}月收入`} fill="#297a64" shape={AxisAlignedBarShape} />
              <Bar dataKey="expense" name={`${analysisNoun}月支出（含均摊）`} fill="#c7664c" shape={AxisAlignedBarShape} />
              <Bar dataKey="balance" name={`${analysisNoun}月结余`} fill="#5d8193" shape={AxisAlignedBarShape} />
            </BarChart>
          </ResponsiveContainer>
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>月份</th>
                  <th>收入</th>
                  <th>支出</th>
                  <th>结余</th>
                  <th>较上月支出</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td className="income-text">{signedMoney(row.income)}</td>
                    <td className="expense-text">{expenseMoney(row.allocatedExpense)}</td>
                    <td className={row.balance >= 0 ? "income-text" : "expense-text"}>{signedMoney(row.balance)}</td>
                    <td className={row.expenseDelta > 0 ? "expense-text" : row.expenseDelta < 0 ? "income-text" : ""}>
                      {row.expenseDelta === 0 ? "持平" : signedMoney(row.expenseDelta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

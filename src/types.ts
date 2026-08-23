export type Direction = "income" | "expense" | "neutral";
export type Currency = "EUR" | "CNY";
export type AnalysisCurrency = Currency | "EUR_CONVERTED";
export type AnalysisScope = "all_cash" | "household";
export type BusinessType =
  | "daily"
  | "resale"
  | "exchange"
  | "loan"
  | "repayment"
  | "transfer"
  | "investment";

export interface Category {
  id: string;
  name: string;
  direction: Exclude<Direction, "neutral">;
  color: string;
  sortOrder: number;
  active: boolean;
}

export interface ExchangeRate {
  id: string;
  effectiveDate: string;
  currency: Exclude<Currency, "EUR">;
  unitsPerEur: number;
  source: string;
}

export interface LedgerTransaction {
  id: string;
  date: string;
  direction: Direction;
  categoryId: string;
  amount: number;
  currency: Currency;
  eurAmount: number | null;
  exchangeRate: number | null;
  billedAmount: number | null;
  billedCurrency: Currency | null;
  detail: string;
  businessType: BusinessType;
  isCashTransaction: boolean;
  isFixed: boolean;
  allocationStartMonth: string | null;
  allocationMonths: number | null;
  payerAccount: string | null;
  migrationId: string | null;
  sourceSheet: string | null;
  sourceCell: string | null;
  originalCategory: string | null;
  migrationStatus: "auto" | "review" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface TransactionInput {
  date: string;
  direction: Direction;
  categoryId: string;
  amount: number;
  currency: Currency;
  exchangeRate?: number | null;
  billedAmount?: number | null;
  billedCurrency?: Currency | null;
  detail: string;
  businessType?: BusinessType;
  isCashTransaction?: boolean;
  isFixed?: boolean;
  allocationStartMonth?: string | null;
  allocationMonths?: number | null;
  payerAccount?: string | null;
  migrationId?: string | null;
  sourceSheet?: string | null;
  sourceCell?: string | null;
  originalCategory?: string | null;
  migrationStatus?: "auto" | "review" | "manual";
}

export interface CategoryUpdateInput {
  name: string;
  color: string;
  active: boolean;
}

export interface LedgerSnapshot {
  categories: Category[];
  transactions: LedgerTransaction[];
  exchangeRates: ExchangeRate[];
}

export interface HouseholdOption {
  id: string;
  name: string;
  role: string;
  transactionCount: number;
}

export interface HouseholdMember {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

export interface HouseholdInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface LedgerStore {
  readonly mode: "local" | "supabase";
  load(): Promise<LedgerSnapshot>;
  addTransaction(input: TransactionInput): Promise<LedgerTransaction>;
  importTransactions(inputs: TransactionInput[]): Promise<number>;
  updateTransaction(id: string, input: TransactionInput): Promise<LedgerTransaction>;
  updateTransactionDetails(oldDetail: string, newDetail: string): Promise<number>;
  deleteTransaction(id: string): Promise<void>;
  addCategory(input: Pick<Category, "name" | "direction" | "color">): Promise<Category>;
  updateCategory(id: string, input: CategoryUpdateInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  addExchangeRate(input: Omit<ExchangeRate, "id">): Promise<ExchangeRate>;
}

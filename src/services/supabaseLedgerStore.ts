import type {
  Category,
  CategoryUpdateInput,
  ExchangeRate,
  LedgerSnapshot,
  LedgerStore,
  LedgerTransaction,
  HouseholdInvite,
  HouseholdMember,
  HouseholdOption,
  TransactionInput,
} from "../types";
import { defaultCategories } from "../data/defaultCategories";
import { supabase } from "../lib/supabase";

type DbRecord = Record<string, unknown>;
const SUPABASE_PAGE_SIZE = 1000;

interface HouseholdMembership {
  household_id: string;
  role?: string;
}

function mapHouseholdMember(row: DbRecord): HouseholdMember {
  return {
    userId: String(row.user_id),
    email: String(row.email ?? ""),
    displayName: String(row.display_name ?? ""),
    role: String(row.role ?? "member"),
    createdAt: String(row.created_at),
  };
}

function mapHouseholdInvite(row: DbRecord): HouseholdInvite {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    role: String(row.role ?? "member"),
    createdAt: String(row.created_at),
  };
}

function requireClient() {
  if (!supabase) throw new Error("Supabase 尚未配置");
  return supabase;
}

function mapCategory(row: DbRecord): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    direction: row.direction as Category["direction"],
    color: String(row.color),
    sortOrder: Number(row.sort_order),
    active: Boolean(row.active),
  };
}

function mapRate(row: DbRecord): ExchangeRate {
  return {
    id: String(row.id),
    effectiveDate: String(row.effective_date),
    currency: row.currency as ExchangeRate["currency"],
    unitsPerEur: Number(row.units_per_eur),
    source: String(row.source ?? ""),
  };
}

function mapTransaction(row: DbRecord): LedgerTransaction {
  return {
    id: String(row.id),
    date: String(row.transaction_date),
    direction: row.direction as LedgerTransaction["direction"],
    categoryId: String(row.category_id),
    amount: Number(row.amount),
    currency: row.currency as LedgerTransaction["currency"],
    eurAmount: row.eur_amount === null ? null : Number(row.eur_amount),
    exchangeRate: row.exchange_rate === null || row.exchange_rate === undefined ? null : Number(row.exchange_rate),
    billedAmount: row.billed_amount === null || row.billed_amount === undefined ? null : Number(row.billed_amount),
    billedCurrency: row.billed_currency ? row.billed_currency as LedgerTransaction["billedCurrency"] : null,
    detail: String(row.detail ?? ""),
    businessType: row.business_type as LedgerTransaction["businessType"],
    isCashTransaction: row.is_cash_transaction === undefined ? true : Boolean(row.is_cash_transaction),
    isFixed: Boolean(row.is_fixed),
    allocationStartMonth: row.allocation_start_month
      ? String(row.allocation_start_month).slice(0, 7)
      : null,
    allocationMonths: row.allocation_months === null ? null : Number(row.allocation_months),
    payerAccount: row.payer_account ? String(row.payer_account) : null,
    migrationId: row.migration_id ? String(row.migration_id) : null,
    sourceSheet: row.source_sheet ? String(row.source_sheet) : null,
    sourceCell: row.source_cell ? String(row.source_cell) : null,
    originalCategory: row.original_category ? String(row.original_category) : null,
    migrationStatus: (row.migration_status ?? "manual") as LedgerTransaction["migrationStatus"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function transactionPayload(householdId: string, input: TransactionInput) {
  return {
    household_id: householdId,
    transaction_date: input.date,
    direction: input.direction,
    category_id: input.categoryId,
    amount: input.amount,
    currency: input.currency,
    exchange_rate: input.exchangeRate ?? null,
    billed_amount: input.billedAmount ?? null,
    billed_currency: input.billedCurrency ?? null,
    detail: input.detail,
    business_type: input.businessType ?? "daily",
    is_cash_transaction: input.isCashTransaction ?? true,
    is_fixed: input.isFixed ?? false,
    allocation_start_month: input.allocationStartMonth
      ? `${input.allocationStartMonth}-01`
      : null,
    allocation_months: input.allocationMonths ?? null,
    payer_account: input.payerAccount ?? null,
    migration_id: input.migrationId ?? null,
    source_sheet: input.sourceSheet ?? null,
    source_cell: input.sourceCell ?? null,
    original_category: input.originalCategory ?? null,
    migration_status: input.migrationStatus ?? "manual",
  };
}

async function selectAllHouseholdRows(
  table: "categories" | "transactions" | "exchange_rates",
  householdId: string,
  orderColumn: string,
  ascending: boolean,
): Promise<DbRecord[]> {
  const client = requireClient();
  const rows: DbRecord[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("household_id", householdId)
      .order(orderColumn, { ascending })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as DbRecord[];
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
  }

  return rows;
}

export async function listHouseholds(): Promise<HouseholdOption[]> {
  const client = requireClient();
  const { data: memberships, error } = await client
    .from("household_members")
    .select("household_id, role");
  if (error) throw error;

  return Promise.all(
    ((memberships ?? []) as HouseholdMembership[]).map(async (membership) => {
      const householdId = String(membership.household_id);
      const [{ data: household, error: householdError }, { count, error: countError }] = await Promise.all([
        client.from("households").select("name").eq("id", householdId).single(),
        client.from("transactions").select("id", { count: "exact", head: true }).eq("household_id", householdId),
      ]);
      if (householdError) throw householdError;
      if (countError) throw countError;
      return {
        id: householdId,
        name: String((household as DbRecord | null)?.name ?? "我的家庭"),
        role: String(membership.role ?? "member"),
        transactionCount: count ?? 0,
      };
    }),
  );
}

export async function acceptPendingHouseholdInvites(): Promise<number> {
  const client = requireClient();
  const { data, error } = await client.rpc("accept_household_invites");
  if (error) throw error;
  return Number(data ?? 0);
}

export async function createDefaultHousehold(): Promise<string> {
  const client = requireClient();
  const { data, error: createError } = await client.rpc("create_household", {
    household_name: "我的家庭",
  });
  if (createError) throw createError;
  return String(data);
}

export async function listHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const client = requireClient();
  const { data, error } = await client.rpc("list_household_members", {
    target_household_id: householdId,
  });
  if (error) throw error;
  return ((data ?? []) as DbRecord[]).map(mapHouseholdMember);
}

export async function listHouseholdInvites(householdId: string): Promise<HouseholdInvite[]> {
  const client = requireClient();
  const { data, error } = await client.rpc("list_household_invites", {
    target_household_id: householdId,
  });
  if (error) throw error;
  return ((data ?? []) as DbRecord[]).map(mapHouseholdInvite);
}

export async function inviteHouseholdMember(householdId: string, email: string): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.rpc("invite_household_member", {
    target_household_id: householdId,
    target_email: email,
  });
  if (error) throw error;
  return String(data);
}

export async function renameHousehold(householdId: string, name: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc("rename_household", {
    target_household_id: householdId,
    next_name: name,
  });
  if (error) throw error;
}

export async function deleteEmptyHousehold(householdId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc("delete_empty_household", {
    target_household_id: householdId,
  });
  if (error) throw error;
}

export async function updateHouseholdMemberName(
  householdId: string,
  userId: string,
  displayName: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc("update_household_member_name", {
    target_household_id: householdId,
    target_user_id: userId,
    next_display_name: displayName,
  });
  if (error) throw error;
}

export class SupabaseLedgerStore implements LedgerStore {
  readonly mode = "supabase" as const;

  constructor(private readonly householdId: string) {}

  async load(): Promise<LedgerSnapshot> {
    const snapshot = await this.loadSnapshot();
    const missingCategories = defaultCategories.filter(
      (category) =>
        !snapshot.categories.some(
          (existing) => existing.direction === category.direction && existing.name === category.name,
        ),
    );
    if (missingCategories.length === 0) return snapshot;

    await this.seedMissingCategories(missingCategories);
    return this.loadSnapshot();
  }

  private async loadSnapshot(): Promise<LedgerSnapshot> {
    const [categories, transactions, rates] = await Promise.all([
      selectAllHouseholdRows("categories", this.householdId, "sort_order", true),
      selectAllHouseholdRows("transactions", this.householdId, "transaction_date", false),
      selectAllHouseholdRows("exchange_rates", this.householdId, "effective_date", false),
    ]);
    return {
      categories: categories.map(mapCategory),
      transactions: transactions.map(mapTransaction),
      exchangeRates: rates.map(mapRate),
    };
  }

  private async seedMissingCategories(categories: Category[]): Promise<void> {
    const client = requireClient();
    await client.rpc("ensure_default_categories", {
      target_household_id: this.householdId,
    });

    const { error } = await requireClient()
      .from("categories")
      .upsert(
        categories.map((category) => ({
          household_id: this.householdId,
          name: category.name,
          direction: category.direction,
          color: category.color,
          sort_order: category.sortOrder,
          active: true,
        })),
        { onConflict: "household_id,direction,name", ignoreDuplicates: true },
      );
    if (error) throw error;
  }

  async addTransaction(input: TransactionInput): Promise<LedgerTransaction> {
    const { data, error } = await requireClient()
      .from("transactions")
      .insert(transactionPayload(this.householdId, input))
      .select()
      .single();
    if (error) throw error;
    return mapTransaction(data);
  }

  async updateTransaction(id: string, input: TransactionInput): Promise<LedgerTransaction> {
    const { data, error } = await requireClient()
      .from("transactions")
      .update(transactionPayload(this.householdId, input))
      .eq("id", id)
      .eq("household_id", this.householdId)
      .select()
      .single();
    if (error) throw error;
    return mapTransaction(data);
  }

  async updateTransactionDetails(oldDetail: string, newDetail: string): Promise<number> {
    const from = oldDetail.trim();
    const to = newDetail.trim();
    if (!from || !to) throw new Error("明细不能为空");
    const client = requireClient();
    const { count, error: countError } = await client
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("household_id", this.householdId)
      .eq("detail", from);
    if (countError) throw countError;
    if (!count) return 0;
    const { error } = await client
      .from("transactions")
      .update({ detail: to })
      .eq("household_id", this.householdId)
      .eq("detail", from);
    if (error) throw error;
    return count;
  }

  async importTransactions(inputs: TransactionInput[]): Promise<number> {
    const client = requireClient();
    const migrationIds = inputs
      .map((input) => input.migrationId)
      .filter((id): id is string => Boolean(id));
    const existing = new Set<string>();
    for (let offset = 0; offset < migrationIds.length; offset += 200) {
      const { data, error } = await client
        .from("transactions")
        .select("migration_id")
        .eq("household_id", this.householdId)
        .in("migration_id", migrationIds.slice(offset, offset + 200));
      if (error) throw error;
      for (const row of data ?? []) if (row.migration_id) existing.add(String(row.migration_id));
    }
    const pending = inputs.filter((input) => !input.migrationId || !existing.has(input.migrationId));
    for (let offset = 0; offset < pending.length; offset += 200) {
      const { error } = await client
        .from("transactions")
        .insert(pending.slice(offset, offset + 200).map((input) => transactionPayload(this.householdId, input)));
      if (error) throw error;
    }
    return pending.length;
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await requireClient()
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("household_id", this.householdId);
    if (error) throw error;
  }

  async addCategory(input: Pick<Category, "name" | "direction" | "color">): Promise<Category> {
    const name = input.name.trim();
    if (!name) throw new Error("类别名称不能为空");
    const { data, error } = await requireClient()
      .from("categories")
      .insert({ household_id: this.householdId, ...input, name })
      .select()
      .single();
    if (error) throw error;
    return mapCategory(data);
  }

  async updateCategory(id: string, input: CategoryUpdateInput): Promise<Category> {
    const name = input.name.trim();
    if (!name) throw new Error("类别名称不能为空");
    const { data, error } = await requireClient()
      .from("categories")
      .update({
        name,
        color: input.color,
        active: input.active,
      })
      .eq("id", id)
      .eq("household_id", this.householdId)
      .select()
      .single();
    if (error) throw error;
    return mapCategory(data);
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await requireClient()
      .rpc("delete_unused_category", { target_category_id: id });
    if (error) throw error;
  }

  async addExchangeRate(input: Omit<ExchangeRate, "id">): Promise<ExchangeRate> {
    const { data, error } = await requireClient()
      .from("exchange_rates")
      .insert({
        household_id: this.householdId,
        effective_date: input.effectiveDate,
        currency: input.currency,
        units_per_eur: input.unitsPerEur,
        source: input.source,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRate(data);
  }
}

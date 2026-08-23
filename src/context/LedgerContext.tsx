import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { chooseInitialHousehold } from "./householdSelection";
import { LocalLedgerStore } from "../services/localLedgerStore";
import {
  acceptPendingHouseholdInvites,
  createDefaultHousehold,
  deleteEmptyHousehold,
  inviteHouseholdMember,
  listHouseholdInvites,
  listHouseholdMembers,
  listHouseholds,
  renameHousehold,
  SupabaseLedgerStore,
  updateHouseholdMemberName,
} from "../services/supabaseLedgerStore";
import type {
  Category,
  ExchangeRate,
  HouseholdInvite,
  HouseholdMember,
  HouseholdOption,
  LedgerStore,
  LedgerTransaction,
  TransactionInput,
} from "../types";

const SELECTED_HOUSEHOLD_KEY = "family-ledger:selected-household-id";

interface LedgerContextValue {
  categories: Category[];
  transactions: LedgerTransaction[];
  exchangeRates: ExchangeRate[];
  households: HouseholdOption[];
  householdMembers: HouseholdMember[];
  householdInvites: HouseholdInvite[];
  householdId: string | null;
  loading: boolean;
  busy: boolean;
  mode: "local" | "supabase";
  message: string | null;
  clearMessage(): void;
  refreshLedger(showMessage?: boolean): Promise<void>;
  selectHousehold(householdId: string): void;
  inviteHouseholdMember(email: string): Promise<void>;
  renameHousehold(name: string): Promise<void>;
  deleteHousehold(householdId: string): Promise<void>;
  updateHouseholdMemberName(userId: string, displayName: string): Promise<void>;
  addTransaction(input: TransactionInput): Promise<void>;
  importTransactions(inputs: TransactionInput[]): Promise<number>;
  updateTransaction(id: string, input: TransactionInput): Promise<void>;
  updateTransactionDetails(oldDetail: string, newDetail: string): Promise<number>;
  deleteTransaction(id: string): Promise<void>;
  addCategory(input: Pick<Category, "name" | "direction" | "color">): Promise<void>;
  updateCategory(id: string, input: Pick<Category, "name" | "color" | "active">): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  addExchangeRate(input: Omit<ExchangeRate, "id">): Promise<void>;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = record.message ?? record.details ?? record.hint ?? record.code;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<LedgerStore | null>(
    isSupabaseConfigured ? null : new LocalLedgerStore(),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [householdInvites, setHouseholdInvites] = useState<HouseholdInvite[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(() =>
    isSupabaseConfigured ? window.localStorage.getItem(SELECTED_HOUSEHOLD_KEY) : null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshCloudMetadata = useCallback(async (nextHouseholdId: string | null = householdId) => {
    if (!isSupabaseConfigured) return [] as HouseholdOption[];
    const availableHouseholds = await listHouseholds();
    setHouseholds(availableHouseholds);
    if (!nextHouseholdId || !availableHouseholds.some((household) => household.id === nextHouseholdId)) {
      setHouseholdMembers([]);
      setHouseholdInvites([]);
      return availableHouseholds;
    }
    const [members, invites] = await Promise.all([
      listHouseholdMembers(nextHouseholdId),
      listHouseholdInvites(nextHouseholdId),
    ]);
    setHouseholdMembers(members);
    setHouseholdInvites(invites);
    return availableHouseholds;
  }, [householdId]);

  useEffect(() => {
    let active = true;

    function clearSnapshot() {
      setCategories([]);
      setTransactions([]);
      setExchangeRates([]);
      setHouseholdMembers([]);
      setHouseholdInvites([]);
      setStore(null);
    }

    async function loadSharing(nextHouseholdId: string) {
      if (!isSupabaseConfigured) return;
      const [members, invites] = await Promise.all([
        listHouseholdMembers(nextHouseholdId),
        listHouseholdInvites(nextHouseholdId),
      ]);
      if (!active) return;
      setHouseholdMembers(members);
      setHouseholdInvites(invites);
    }

    async function connect() {
      try {
        setLoading(true);
        if (!isSupabaseConfigured) {
          const connectedStore = new LocalLedgerStore();
          if (!active) return;
          setStore(connectedStore);
          const snapshot = await connectedStore.load();
          if (!active) return;
          setCategories(snapshot.categories);
          setTransactions(snapshot.transactions);
          setExchangeRates(snapshot.exchangeRates);
          setHouseholdMembers([]);
          setHouseholdInvites([]);
          return;
        }

        await acceptPendingHouseholdInvites();
        let availableHouseholds = await listHouseholds();
        if (availableHouseholds.length === 0) {
          const createdHouseholdId = await createDefaultHousehold();
          availableHouseholds = await listHouseholds();
          if (active) {
            window.localStorage.setItem(SELECTED_HOUSEHOLD_KEY, createdHouseholdId);
            setHouseholdId(createdHouseholdId);
          }
        }
        if (!active) return;
        setHouseholds(availableHouseholds);

        const selectedHouseholdId = chooseInitialHousehold(availableHouseholds, householdId);
        if (!selectedHouseholdId) {
          if (householdId) {
            window.localStorage.removeItem(SELECTED_HOUSEHOLD_KEY);
            setHouseholdId(null);
          }
          clearSnapshot();
          return;
        }

        if (selectedHouseholdId !== householdId) {
          window.localStorage.setItem(SELECTED_HOUSEHOLD_KEY, selectedHouseholdId);
          setHouseholdId(selectedHouseholdId);
        }

        const connectedStore = new SupabaseLedgerStore(selectedHouseholdId);
        if (!active) return;
        setStore(connectedStore);
        const snapshot = await connectedStore.load();
        if (!active) return;
        setCategories(snapshot.categories);
        setTransactions(snapshot.transactions);
        setExchangeRates(snapshot.exchangeRates);
        await loadSharing(selectedHouseholdId);
      } catch (error) {
        if (active) setMessage(errorMessage(error, "账本加载失败"));
      } finally {
        if (active) setLoading(false);
      }
    }
    void connect();
    return () => {
      active = false;
    };
  }, [householdId]);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await action();
    } catch (error) {
      setMessage(errorMessage(error, "操作失败，请重试"));
      throw error;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<LedgerContextValue>(
    () => ({
      categories,
      transactions,
      exchangeRates,
      households,
      householdMembers,
      householdInvites,
      householdId,
      loading,
      busy,
      mode: store?.mode ?? (isSupabaseConfigured ? "supabase" : "local"),
      message,
      clearMessage: () => setMessage(null),
      refreshLedger: async (showMessage = true) => {
        if (!store) return;
        const snapshot = await run(() => store.load());
        setCategories(snapshot.categories);
        setTransactions(snapshot.transactions);
        setExchangeRates(snapshot.exchangeRates);
        if (householdId) await refreshCloudMetadata(householdId);
        if (showMessage) setMessage("已同步最新记录");
      },
      selectHousehold: (nextHouseholdId) => {
        window.localStorage.setItem(SELECTED_HOUSEHOLD_KEY, nextHouseholdId);
        setLoading(true);
        setHouseholdId(nextHouseholdId);
        setStore(null);
        setCategories([]);
        setTransactions([]);
        setExchangeRates([]);
        setHouseholdMembers([]);
        setHouseholdInvites([]);
      },
      inviteHouseholdMember: async (email) => {
        if (!householdId) return;
        await run(() => inviteHouseholdMember(householdId, email));
        await refreshCloudMetadata(householdId);
        setMessage("邀请已创建。对方用这个邮箱登录后会自动加入。");
      },
      renameHousehold: async (name) => {
        if (!householdId) return;
        await run(() => renameHousehold(householdId, name));
        await refreshCloudMetadata(householdId);
        setMessage("账本名称已保存");
      },
      deleteHousehold: async (deletedHouseholdId) => {
        await run(() => deleteEmptyHousehold(deletedHouseholdId));
        const availableHouseholds = await refreshCloudMetadata(null);
        const nextHousehold = availableHouseholds.find((household) => household.id !== deletedHouseholdId) ?? null;
        if (householdId === deletedHouseholdId) {
          if (nextHousehold) {
            window.localStorage.setItem(SELECTED_HOUSEHOLD_KEY, nextHousehold.id);
            setHouseholdId(nextHousehold.id);
          } else {
            window.localStorage.removeItem(SELECTED_HOUSEHOLD_KEY);
            setHouseholdId(null);
            setStore(null);
            setCategories([]);
            setTransactions([]);
            setExchangeRates([]);
          }
        }
        setMessage("空账本已删除");
      },
      updateHouseholdMemberName: async (userId, displayName) => {
        if (!householdId) return;
        await run(() => updateHouseholdMemberName(householdId, userId, displayName));
        await refreshCloudMetadata(householdId);
        setMessage("成员名称已保存");
      },
      addTransaction: async (input) => {
        if (!store) return;
        const transaction = await run(() => store.addTransaction(input));
        setTransactions((current) => [...current, transaction]);
        setMessage("已记录");
      },
      importTransactions: async (inputs) => {
        if (!store) return 0;
        const imported = await run(() => store.importTransactions(inputs));
        const snapshot = await store.load();
        setTransactions(snapshot.transactions);
        setMessage(`已导入 ${imported} 笔；重复记录已跳过`);
        return imported;
      },
      updateTransaction: async (id, input) => {
        if (!store) return;
        const updated = await run(() => store.updateTransaction(id, input));
        setTransactions((current) => current.map((item) => (item.id === id ? updated : item)));
        setMessage("修改已保存");
      },
      updateTransactionDetails: async (oldDetail, newDetail) => {
        if (!store) return 0;
        const updatedCount = await run(() => store.updateTransactionDetails(oldDetail, newDetail));
        if (updatedCount > 0) {
          const snapshot = await store.load();
          setTransactions(snapshot.transactions);
        }
        setMessage(updatedCount > 0 ? `已修正 ${updatedCount} 笔明细` : "没有找到需要修正的明细");
        return updatedCount;
      },
      deleteTransaction: async (id) => {
        if (!store) return;
        await run(() => store.deleteTransaction(id));
        setTransactions((current) => current.filter((item) => item.id !== id));
        setMessage("记录已删除");
      },
      addCategory: async (input) => {
        if (!store) return;
        await run(() => store.addCategory(input));
        const snapshot = await store.load();
        setCategories(snapshot.categories);
        setMessage("类别已添加");
      },
      updateCategory: async (id, input) => {
        if (!store) return;
        await run(() => store.updateCategory(id, input));
        const snapshot = await store.load();
        setCategories(snapshot.categories);
        setTransactions(snapshot.transactions);
        setMessage("类别已保存");
      },
      deleteCategory: async (id) => {
        if (!store) return;
        await run(() => store.deleteCategory(id));
        const snapshot = await store.load();
        setCategories(snapshot.categories);
        setMessage("类别已删除");
      },
      addExchangeRate: async (input) => {
        if (!store) return;
        const rate = await run(() => store.addExchangeRate(input));
        const snapshot = await store.load();
        setExchangeRates(snapshot.exchangeRates.length ? snapshot.exchangeRates : [rate]);
        setTransactions(snapshot.transactions);
        setMessage("汇率已添加");
      },
    }),
    [
      busy,
      categories,
      exchangeRates,
      householdId,
      householdInvites,
      householdMembers,
      households,
      loading,
      message,
      refreshCloudMetadata,
      run,
      store,
      transactions,
    ],
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

// Context and its hook intentionally share one module so consumers cannot import the wrong instance.
// eslint-disable-next-line react-refresh/only-export-components
export function useLedger(): LedgerContextValue {
  const context = useContext(LedgerContext);
  if (!context) throw new Error("useLedger 必须在 LedgerProvider 中使用");
  return context;
}

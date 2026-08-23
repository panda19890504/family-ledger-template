import type { Direction, LedgerTransaction } from "../types";

const HIDDEN_DETAIL_SUGGESTIONS_KEY = "family-ledger:hidden-detail-suggestions";

export interface DetailSuggestion {
  value: string;
  count: number;
  lastUsedAt: string;
}

function normalizeDetail(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function detailKey(value: string): string {
  return normalizeDetail(value).toLocaleLowerCase();
}

export function hiddenDetailSuggestions(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HIDDEN_DETAIL_SUGGESTIONS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function setDetailSuggestionHidden(value: string, hidden: boolean): void {
  const normalized = normalizeDetail(value);
  if (!normalized) return;
  const hiddenKeys = new Set(hiddenDetailSuggestions().map(detailKey));
  if (hidden) hiddenKeys.add(detailKey(normalized));
  else hiddenKeys.delete(detailKey(normalized));
  window.localStorage.setItem(HIDDEN_DETAIL_SUGGESTIONS_KEY, JSON.stringify([...hiddenKeys]));
}

export function buildDetailSuggestions(
  transactions: LedgerTransaction[],
  options: {
    categoryId?: string;
    direction?: Direction;
    includeHidden?: boolean;
  } = {},
): DetailSuggestion[] {
  const hiddenKeys = new Set(hiddenDetailSuggestions().map(detailKey));
  const suggestions = new Map<string, DetailSuggestion & { score: number }>();

  for (const transaction of transactions) {
    const value = normalizeDetail(transaction.detail);
    if (!value) continue;
    const key = detailKey(value);
    if (!options.includeHidden && hiddenKeys.has(key)) continue;
    const directionMatch = options.direction && transaction.direction === options.direction ? 1 : 0;
    const categoryMatch = options.categoryId && transaction.categoryId === options.categoryId ? 1 : 0;
    const score = categoryMatch * 4 + directionMatch * 2;
    const existing = suggestions.get(key);
    if (existing) {
      existing.count += 1;
      existing.score += score;
      if (transaction.date > existing.lastUsedAt) existing.lastUsedAt = transaction.date;
      continue;
    }
    suggestions.set(key, {
      value,
      count: 1,
      lastUsedAt: transaction.date,
      score,
    });
  }

  return [...suggestions.values()]
    .sort((left, right) =>
      right.score - left.score ||
      right.count - left.count ||
      right.lastUsedAt.localeCompare(left.lastUsedAt) ||
      left.value.localeCompare(right.value),
    )
    .map((suggestion) => ({
      value: suggestion.value,
      count: suggestion.count,
      lastUsedAt: suggestion.lastUsedAt,
    }));
}

export function matchingDetailSuggestions(
  suggestions: DetailSuggestion[],
  query: string,
  limit = 5,
): DetailSuggestion[] {
  const normalizedQuery = detailKey(query);
  if (normalizedQuery.length < 2) return [];
  return suggestions
    .filter((suggestion) => {
      const key = detailKey(suggestion.value);
      return key.includes(normalizedQuery) && key !== normalizedQuery;
    })
    .slice(0, limit);
}

export function isDetailSuggestionHidden(value: string): boolean {
  const key = detailKey(value);
  return hiddenDetailSuggestions().some((item) => detailKey(item) === key);
}

export function normalizeDetailForSuggestion(value: string): string {
  return normalizeDetail(value);
}

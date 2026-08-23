import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useLedger } from "../context/LedgerContext";
import { todayIso } from "../lib/date";
import {
  buildDetailSuggestions,
  isDetailSuggestionHidden,
  normalizeDetailForSuggestion,
  setDetailSuggestionHidden,
} from "../lib/detailSuggestions";
import { cleanDecimalInput, parseDecimalInput } from "../lib/numberInput";
import type { BusinessType, Category, Currency, TransactionInput } from "../types";

interface MigrationRow {
  migration_id: string;
  date: string;
  direction: "income" | "expense";
  category_name: string;
  original_category: string;
  amount: number;
  currency: Currency | null;
  detail: string;
  business_type: BusinessType;
  payer_account: string | null;
  is_fixed: boolean;
  is_cash_transaction: boolean;
  allocation_start_month: string | null;
  allocation_months: number | null;
  source_sheet: string;
  source_cell: string;
  migration_status: "auto" | "review";
}

interface MigrationBundle {
  version: number;
  transactions: MigrationRow[];
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function migrationCategoryName(row: MigrationRow): string {
  if (row.direction !== "income") return row.category_name;
  return row.category_name || "收入";
}

export function SettingsPage() {
  const {
    categories,
    transactions,
    exchangeRates,
    addCategory,
    updateCategory,
    deleteCategory,
    addExchangeRate,
    importTransactions,
    updateTransactionDetails,
    mode,
    busy,
    households,
    householdMembers,
    householdInvites,
    householdId,
    selectHousehold,
    inviteHouseholdMember,
    renameHousehold,
    deleteHousehold,
    updateHouseholdMemberName,
  } = useLedger();
  const [categoryName, setCategoryName] = useState("");
  const [categoryDirection, setCategoryDirection] = useState<"income" | "expense">("expense");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryColor, setEditingCategoryColor] = useState("#56876d");
  const [editingCategoryActive, setEditingCategoryActive] = useState(true);
  const [rateDate, setRateDate] = useState(todayIso());
  const [rateValue, setRateValue] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showChangelog, setShowChangelog] = useState(false);
  const [detailSuggestionVersion, setDetailSuggestionVersion] = useState(0);
  const [selectedDetailSuggestion, setSelectedDetailSuggestion] = useState("");
  const [replacementDetail, setReplacementDetail] = useState("");

  const currentHousehold = households.find((household) => household.id === householdId);
  const canManageHousehold = mode === "supabase" && currentHousehold?.role === "owner";
  const deletableHouseholds = households.filter(
    (household) => household.role === "owner" && household.transactionCount === 0 && households.length > 1,
  );
  const visibleCategories = categories
    .filter((item) => item.direction === categoryDirection)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  const categoryUsage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const transaction of transactions) {
      counts.set(transaction.categoryId, (counts.get(transaction.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [transactions]);
  const editingCategory = visibleCategories.find((category) => category.id === editingCategoryId) ?? null;
  const editingCategoryUsage = editingCategory ? categoryUsage.get(editingCategory.id) ?? 0 : 0;
  const detailSuggestions = useMemo(
    () => {
      void detailSuggestionVersion;
      return buildDetailSuggestions(transactions, { includeHidden: true });
    },
    [detailSuggestionVersion, transactions],
  );
  const selectedDetail = detailSuggestions.find((suggestion) => suggestion.value === selectedDetailSuggestion) ?? null;
  const selectedDetailHidden = selectedDetail ? isDetailSuggestionHidden(selectedDetail.value) : false;

  async function submitCategory(event: FormEvent) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    await addCategory({ name: categoryName.trim(), direction: categoryDirection, color: "#56876d" });
    setCategoryName("");
  }

  function startEditCategory(category: Category) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryColor(category.color);
    setEditingCategoryActive(category.active);
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setEditingCategoryColor("#56876d");
    setEditingCategoryActive(true);
  }

  async function submitCategoryEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    await updateCategory(editingCategoryId, {
      name: editingCategoryName.trim(),
      color: editingCategoryColor,
      active: editingCategoryActive,
    });
  }

  async function removeCategory(category: Category) {
    const usageCount = categoryUsage.get(category.id) ?? 0;
    if (usageCount > 0) return;
    if (!window.confirm(`删除未使用类别“${category.name}”？`)) return;
    await deleteCategory(category.id);
    if (editingCategoryId === category.id) cancelEditCategory();
  }

  async function submitRate(event: FormEvent) {
    event.preventDefault();
    const unitsPerEur = parseDecimalInput(rateValue);
    if (!Number.isFinite(unitsPerEur) || unitsPerEur <= 0) return;
    await addExchangeRate({
      effectiveDate: rateDate,
      currency: "CNY" as Exclude<Currency, "EUR">,
      unitsPerEur,
      source: "手工录入",
    });
    setRateValue("");
  }

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    await inviteHouseholdMember(email);
    setInviteEmail("");
  }

  async function submitHouseholdName(event: FormEvent) {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const nextName = String(form.get("householdName") ?? "");
    const name = nextName.trim();
    if (!name || name === currentHousehold?.name) return;
    await renameHousehold(name);
  }

  async function submitMemberName(event: FormEvent, userId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    await updateHouseholdMemberName(userId, String(form.get("displayName") ?? "").trim());
  }

  function toggleDetailSuggestionHidden(value: string, hidden: boolean) {
    setDetailSuggestionHidden(value, hidden);
    setDetailSuggestionVersion((version) => version + 1);
  }

  async function submitDetailCorrection(event: FormEvent) {
    event.preventDefault();
    if (!selectedDetail) return;
    const replacement = normalizeDetailForSuggestion(replacementDetail);
    if (!replacement || replacement === selectedDetail.value) return;
    if (!window.confirm(`把所有“${selectedDetail.value}”改成“${replacement}”？`)) return;
    await updateTransactionDetails(selectedDetail.value, replacement);
    setDetailSuggestionHidden(selectedDetail.value, false);
    setSelectedDetailSuggestion(replacement);
    setReplacementDetail("");
    setDetailSuggestionVersion((version) => version + 1);
  }

  async function deleteEmptySelectedHousehold(targetHouseholdId: string, targetName: string) {
    if (!window.confirm(`删除空账本“${targetName}”？这个操作只会删除 0 笔记录的账本。`)) return;
    await deleteHousehold(targetHouseholdId);
  }

  function exportCsv() {
    const header = ["日期", "收支", "类别", "金额", "币种", "可选EUR折算", "明细", "是否现金流水", "是否固定", "均摊开始", "均摊月数", "付款人/账户", "来源"];
    const rows = transactions.map((item) => [
      item.date,
      item.direction,
      categories.find((category) => category.id === item.categoryId)?.name ?? "",
      item.amount,
      item.currency,
      item.eurAmount,
      item.detail,
      item.isCashTransaction ? "是" : "否",
      item.isFixed ? "是" : "否",
      item.allocationStartMonth,
      item.allocationMonths,
      item.payerAccount,
      item.sourceSheet && item.sourceCell ? `${item.sourceSheet}!${item.sourceCell}` : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    download(`家庭账本-${todayIso()}.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
  }

  async function importMigration(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportStatus("正在检查迁移包…");
    try {
      const parsed = JSON.parse(await file.text()) as MigrationBundle;
      if (parsed.version !== 1 || !Array.isArray(parsed.transactions)) {
        throw new Error("这不是受支持的迁移包");
      }
      let skipped = 0;
      const inputs: TransactionInput[] = [];
      for (const row of parsed.transactions) {
        if (row.migration_status !== "auto" || !row.currency) {
          skipped += 1;
          continue;
        }
        const categoryName = migrationCategoryName(row);
        const category = categories.find((item) => item.direction === row.direction && item.name === categoryName);
        if (!category || !row.migration_id || !row.date || !(row.amount > 0)) {
          skipped += 1;
          continue;
        }
        inputs.push({
          date: row.date,
          direction: row.direction,
          categoryId: category.id,
          amount: row.amount,
          currency: row.currency,
          detail: row.detail ?? "",
          businessType: row.business_type ?? "daily",
          isCashTransaction: row.is_cash_transaction,
          isFixed: row.is_fixed,
          allocationStartMonth: row.allocation_start_month,
          allocationMonths: row.allocation_months,
          payerAccount: row.payer_account,
          migrationId: row.migration_id,
          sourceSheet: row.source_sheet,
          sourceCell: row.source_cell,
          originalCategory: row.original_category,
          migrationStatus: "auto",
        });
      }
      const imported = await importTransactions(inputs);
      setImportStatus(`导入完成：新增 ${imported} 笔，跳过 ${skipped} 笔待复核记录；重复记录自动忽略。`);
    } catch (error) {
      setImportStatus(error instanceof Error ? `导入失败：${error.message}` : "导入失败：文件格式不正确");
    }
  }

  function exportBackup() {
    download(
      `家庭账本备份-${todayIso()}.json`,
      JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), categories, exchangeRates, transactions }, null, 2),
      "application/json",
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">设置与数据</p>
        <h1>低频的事，放在这里</h1>
        <p>当前数据模式：{mode === "local" ? "本机试用" : "家庭云端"}</p>
      </header>

      <div className="settings-grid">
        {mode === "supabase" && (
          <section className="surface settings-card backup-card">
            <div className="section-title"><h2>当前账本</h2><span>{households.length} 个可用账本</span></div>
            <p>切换后，明细、分析和导入都会写入所选家庭账本。</p>
            {households.length > 1 && (
              <select value={householdId ?? ""} onChange={(event) => selectHousehold(event.target.value)}>
                {households.map((household) => (
                  <option key={household.id} value={household.id}>
                    {household.name} · {household.transactionCount} 笔
                  </option>
                ))}
              </select>
            )}
            {canManageHousehold && (
              <form onSubmit={submitHouseholdName} className="inline-form account-name-form">
                <input
                  key={currentHousehold.id}
                  name="householdName"
                  defaultValue={currentHousehold.name}
                  placeholder="账本名称"
                  required
                />
                <button className="secondary-button" disabled={busy}>
                  保存名称
                </button>
              </form>
            )}
            {deletableHouseholds.length > 0 && (
              <div className="compact-list danger-list">
                {deletableHouseholds.map((household) => (
                  <div key={household.id}>
                    <span>{household.name} · 0 笔</span>
                    <button
                      type="button"
                      className="ghost-button danger-button"
                      disabled={busy}
                      onClick={() => void deleteEmptySelectedHousehold(household.id, household.name)}
                    >
                      删除空账本
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {mode === "supabase" && (
          <section className="surface settings-card backup-card">
            <div className="section-title">
              <h2>家庭成员</h2>
              <span>{householdMembers.length} 人</span>
            </div>
            <p>同一个家庭账本由成员关系控制。家人使用自己的邮箱登录，不需要共享账号。</p>
            {canManageHousehold && (
              <form onSubmit={submitInvite} className="inline-form">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="家人的邮箱"
                  required
                />
                <button className="secondary-button" disabled={busy}>邀请</button>
              </form>
            )}
            <div className="compact-list member-list">
              {householdMembers.map((member) => (
                <div key={member.userId}>
                  <span>
                    <strong>
                      {member.displayName && member.displayName !== member.email
                        ? member.displayName
                        : member.email || "家庭成员"}
                    </strong>
                    {member.displayName && member.displayName !== member.email && member.email && <small>{member.email}</small>}
                  </span>
                  <strong>{member.role === "owner" ? "所有者" : "成员"}</strong>
                </div>
              ))}
              {householdMembers.length === 0 && <p className="muted">成员列表会在云端账本加载后显示。</p>}
            </div>
            {canManageHousehold && householdMembers.length > 0 && (
              <div className="member-edit-list">
                {householdMembers.map((member) => (
                  <form key={member.userId} onSubmit={(event) => void submitMemberName(event, member.userId)} className="inline-form member-name-form">
                    <input
                      key={`${member.userId}:${member.displayName}`}
                      name="displayName"
                      defaultValue={member.displayName}
                      placeholder={member.email || "成员名称"}
                    />
                    <button className="secondary-button" disabled={busy}>
                      保存名称
                    </button>
                  </form>
                ))}
              </div>
            )}
            {canManageHousehold && householdInvites.length > 0 && (
              <>
                <p className="muted">等待对方登录接受：</p>
                <div className="compact-list member-list">
                  {householdInvites.map((invite) => (
                    <div key={invite.id}>
                      <span>{invite.email}</span>
                      <strong>待加入</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        <section className="surface settings-card">
          <div className="section-title"><h2>可选折算汇率</h2><span>1 EUR = ? CNY</span></div>
          <p>CNY 原币统计不需要汇率。折算 EUR 会使用最新一条汇率作为报表汇率，不按每笔交易日期变化。</p>
          <form onSubmit={submitRate} className="inline-form">
            <input type="date" value={rateDate} onChange={(event) => setRateDate(event.target.value)} required />
            <input
              type="text"
              inputMode="decimal"
              value={rateValue}
              onChange={(event) => setRateValue(cleanDecimalInput(event.target.value))}
              placeholder="例如 7.8500"
              required
            />
            <button className="secondary-button" disabled={busy}>添加</button>
          </form>
          <div className="compact-list">
            {exchangeRates.slice(0, 5).map((rate) => (
              <div key={rate.id}><span>{rate.effectiveDate}</span><strong>{rate.unitsPerEur.toFixed(4)}</strong></div>
            ))}
            {exchangeRates.length === 0 && <p className="muted">尚未添加汇率。EUR、CNY 原币统计都不受影响。</p>}
          </div>
        </section>

        <section className="surface settings-card">
          <div className="section-title"><h2>类别管理</h2><span>{categories.length} 个类别</span></div>
          <div className="category-manager">
            <div className="category-panel">
              <h3>添加新类别</h3>
              <form onSubmit={submitCategory} className="inline-form">
                <select
                  value={categoryDirection}
                  onChange={(event) => {
                    setCategoryDirection(event.target.value as "income" | "expense");
                    cancelEditCategory();
                  }}
                >
                  <option value="expense">支出</option>
                  <option value="income">收入</option>
                </select>
                <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="类别名称" required />
                <button className="secondary-button" disabled={busy}>添加</button>
              </form>
            </div>

            <div className="category-panel">
              <h3>编辑旧类别</h3>
              <label>
                选择类别
                <select
                  value={editingCategory?.id ?? ""}
                  onChange={(event) => {
                    const category = visibleCategories.find((item) => item.id === event.target.value);
                    if (category) startEditCategory(category);
                    else cancelEditCategory();
                  }}
                >
                  <option value="">选择要编辑的类别</option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}{category.active ? "" : "（已停用）"}
                    </option>
                  ))}
                </select>
              </label>

              {editingCategory ? (
                <form className="category-edit-form" onSubmit={submitCategoryEdit}>
                  <input
                    type="color"
                    value={editingCategoryColor}
                    onChange={(event) => setEditingCategoryColor(event.target.value)}
                    aria-label="类别颜色"
                  />
                  <input
                    value={editingCategoryName}
                    onChange={(event) => setEditingCategoryName(event.target.value)}
                    required
                  />
                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={editingCategoryActive}
                      onChange={(event) => setEditingCategoryActive(event.target.checked)}
                    />
                    新记账可选
                  </label>
                  <span className="category-usage">
                    {editingCategoryUsage > 0 ? `已使用 ${editingCategoryUsage} 笔` : "未使用，可以删除"}
                  </span>
                  <div className="category-actions">
                    <button className="secondary-button" disabled={busy}>保存</button>
                    {editingCategoryUsage === 0 ? (
                      <button className="danger-button" type="button" onClick={() => removeCategory(editingCategory)}>
                        删除
                      </button>
                    ) : null}
                  </div>
                </form>
              ) : (
                <p className="muted">选择一个类别后，可以改名、换颜色或停用。</p>
              )}
            </div>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="section-title"><h2>常用明细</h2><span>{detailSuggestions.length} 个词条</span></div>
          <p>这些词条从历史明细自动生成。隐藏只是不再推荐；改正会批量修改历史记录。</p>
          {detailSuggestions.length > 0 ? (
            <div className="detail-manager">
              <label>
                选择词条
                <select
                  value={selectedDetail?.value ?? ""}
                  onChange={(event) => {
                    setSelectedDetailSuggestion(event.target.value);
                    setReplacementDetail("");
                  }}
                >
                  <option value="">选择要管理的明细</option>
                  {detailSuggestions.map((suggestion) => (
                    <option key={suggestion.value} value={suggestion.value}>
                      {suggestion.value} · {suggestion.count} 笔{isDetailSuggestionHidden(suggestion.value) ? " · 已隐藏" : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedDetail ? (
                <>
                  <div className="detail-manager-actions">
                    <span>{selectedDetail.count} 笔记录使用过，上次使用 {selectedDetail.lastUsedAt}</span>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={busy}
                      onClick={() => toggleDetailSuggestionHidden(selectedDetail.value, !selectedDetailHidden)}
                    >
                      {selectedDetailHidden ? "恢复推荐" : "隐藏推荐"}
                    </button>
                  </div>
                  <form className="inline-form detail-correction-form" onSubmit={submitDetailCorrection}>
                    <input
                      value={replacementDetail}
                      onChange={(event) => setReplacementDetail(event.target.value)}
                      placeholder={`改成，例如 ${selectedDetail.value}`}
                      aria-label="正确明细"
                      maxLength={160}
                      required
                    />
                    <button className="secondary-button" disabled={busy}>批量改正</button>
                  </form>
                </>
              ) : (
                <p className="muted">选择一个常用明细后，可以隐藏错误推荐，或把错词批量改成正确词。</p>
              )}
            </div>
          ) : (
            <p className="muted">有历史明细后，这里会自动出现常用词条。</p>
          )}
        </section>

        <section className="surface settings-card backup-card">
          <div className="section-title"><h2>带走自己的数据</h2><span>{transactions.length} 笔记录</span></div>
          <p>CSV 用于 Excel 查看；JSON 是包含设置与汇率的完整备份。</p>
          <div className="button-row">
            <button className="secondary-button" onClick={exportCsv}>导出 CSV</button>
            <button className="ghost-button" onClick={exportBackup}>完整备份</button>
          </div>
        </section>

        <section className="surface settings-card backup-card">
          <div className="section-title"><h2>导入旧账本</h2><span>第二阶段</span></div>
          <p>选择脚本生成的 <code>migration_bundle.json</code>。只导入币种、日期和类别已明确的记录，待复核项留在审核清单。</p>
          <label className="secondary-button file-button">
            选择迁移包
            <input type="file" accept="application/json,.json" onChange={importMigration} disabled={busy} />
          </label>
          {importStatus && <p className="muted">{importStatus}</p>}
        </section>

        <section className="surface settings-card backup-card changelog-card">
          <div className="section-title">
            <div>
              <h2>更新日志</h2>
              <span>最近更新：2026/08/23</span>
            </div>
            <button type="button" className="ghost-button" onClick={() => setShowChangelog((value) => !value)}>
              {showChangelog ? "收起" : "展开"}
            </button>
          </div>
          {showChangelog && (
            <>
              <div className="changelog-entry">
                <p className="eyebrow">2026/08/23</p>
                <h3>更新</h3>
                <ul>
                  <li>分析页新增年度累计、去年同期对比、年度收入构成图和月份对比图。</li>
                  <li>分析页年度构成区新增年度支出环形图，并使用更容易区分的图表配色。</li>
                  <li>年度构成区改为两张摘要卡片，长尾分类合并为“其余分类”，减少空白和列表拥挤。</li>
                  <li>年度构成里的“其余分类”支持悬停或点击查看所包含的分类和金额。</li>
                  <li>记一笔明细会按历史记录联想常用词，设置里可以隐藏错误推荐或批量改正常用明细。</li>
                </ul>
                <h3>修复</h3>
                <ul>
                  <li>月份对比里 1 月的“较上月支出”改为对比上一年 12 月，不再显示为持平。</li>
                  <li>月份对比柱状图改为贴近 0 轴的一侧保持平直，远离 0 轴的一侧保留圆角。</li>
                  <li>固定支出编辑改为明确选择“只改本月”或“本月起同步后续”；同步后续只修改已存在月份，不再额外新增重复记录。</li>
                  <li>月度明细里编辑历史记录时改为弹窗，不再让用户点完后还停在列表底部误以为没有反应。</li>
                </ul>
              </div>
              <div className="changelog-entry">
                <p className="eyebrow">2026/07/30</p>
                <h3>更新</h3>
                <ul>
                  <li>月度明细里点击商家/明细文字，可以打开完整记录弹窗，查看被省略的长明细。</li>
                </ul>
              </div>
              <div className="changelog-entry">
                <p className="eyebrow">2026/07/04</p>
                <h3>更新</h3>
                <ul>
                  <li>月末均摊明细显示原始支付日期，并可直接编辑或删除源记录。</li>
                  <li>类别管理改为“添加新类别”和“编辑旧类别”两块；旧类别通过下拉选择后再编辑。</li>
                  <li>记一笔金额模式里的“外币标价”改名为“特殊汇率”。</li>
                  <li>分析页“支出去向”改为按月支出（含均摊）展示分类金额。</li>
                </ul>
                <h3>修复</h3>
                <ul>
                  <li>切换支出/收入或记账类型时，不再自动跳到金额输入框。</li>
                  <li>补充均摊支出回归测试，避免实际付款和均摊金额在账本月支出里重复计算。</li>
                  <li>分析图表提示改为半透明浮层，并增加关闭按钮。</li>
                  <li>修正支出去向图表提示里的字段名，不再显示内部字段 <code>expenseValue</code>。</li>
                </ul>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

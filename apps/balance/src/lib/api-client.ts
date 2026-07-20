import type {
  AccountDto,
  CreateAccountInput,
  UpdateAccountInput,
  CostCenterDto,
  CreateCostCenterInput,
  UpdateCostCenterInput,
  JournalEntryDto,
  CreateJournalEntryInput,
  TrialBalanceEntry,
  BalanceSheetEntry,
  IncomeStatementEntry,
  FiscalYearDto,
} from "@hubilee/contracts";
import { ApiClient } from "@hubilee/shared";
import { getBalanceApiBaseUrl } from "@/lib/api-origin";

const API_URL = getBalanceApiBaseUrl();
const client = new ApiClient(API_URL, { refreshOn401: true });

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ----- Accounts -----

export const accountsApi = {
  list: () =>
    client.get<ApiResponse<AccountDto[]>>("/v1/balance/accounts"),

  tree: () =>
    client.get<ApiResponse<AccountDto[]>>("/v1/balance/accounts/tree"),

  getById: (id: string) =>
    client.get<ApiResponse<AccountDto>>(`/v1/balance/accounts/${id}`),

  create: (body: CreateAccountInput) =>
    client.post<ApiResponse<AccountDto>>("/v1/balance/accounts", body),

  update: (id: string, body: UpdateAccountInput) =>
    client.put<ApiResponse<AccountDto>>(`/v1/balance/accounts/${id}`, body),

  delete: (id: string) =>
    client.delete<ApiResponse<void>>(`/v1/balance/accounts/${id}`),
};

// ----- Cost Centers -----

export const costCentersApi = {
  list: () =>
    client.get<ApiResponse<CostCenterDto[]>>("/v1/balance/cost-centers"),

  create: (body: CreateCostCenterInput) =>
    client.post<ApiResponse<CostCenterDto>>("/v1/balance/cost-centers", body),

  update: (id: string, body: UpdateCostCenterInput) =>
    client.put<ApiResponse<CostCenterDto>>(`/v1/balance/cost-centers/${id}`, body),

  delete: (id: string) =>
    client.delete<ApiResponse<void>>(`/v1/balance/cost-centers/${id}`),
};

// ----- Journal Entries -----

export const journalEntriesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return client.get<ApiResponse<JournalEntryDto[]> & { total?: number; totalPages?: number }>(
      `/v1/balance/journal-entries${qs}`
    );
  },

  getById: (id: string) =>
    client.get<ApiResponse<JournalEntryDto>>(`/v1/balance/journal-entries/${id}`),

  create: (body: CreateJournalEntryInput) =>
    client.post<ApiResponse<JournalEntryDto>>("/v1/balance/journal-entries", body),

  approve: (id: string) =>
    client.post<ApiResponse<JournalEntryDto>>(`/v1/balance/journal-entries/${id}/approve`, {}),
};

// ----- Reports -----

export const reportsApi = {
  trialBalance: (date?: string) => {
    const qs = date ? `?date=${date}` : "";
    return client.get<ApiResponse<TrialBalanceEntry[]>>(`/v1/balance/reports/trial-balance${qs}`);
  },

  balanceSheet: (date?: string) => {
    const qs = date ? `?date=${date}` : "";
    return client.get<ApiResponse<BalanceSheetEntry[]>>(`/v1/balance/reports/balance-sheet${qs}`);
  },

  incomeStatement: (dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return client.get<ApiResponse<IncomeStatementEntry[]>>(`/v1/balance/reports/income-statement${qs}`);
  },
};

// ----- Fiscal -----

export const fiscalApi = {
  listYears: () =>
    client.get<ApiResponse<FiscalYearDto[]>>("/v1/balance/fiscal-years"),

  createYear: (year: number) =>
    client.post<ApiResponse<FiscalYearDto>>("/v1/balance/fiscal-years", { year }),

  closePeriod: (periodId: string) =>
    client.post<ApiResponse<void>>(`/v1/balance/fiscal-periods/${periodId}/close`, {}),
};

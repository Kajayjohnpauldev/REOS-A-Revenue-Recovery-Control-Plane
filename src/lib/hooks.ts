"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AgentsResponse,
  ApprovalsResponse,
  CaseActionResult,
  CaseDetailResponse,
  CasesResponse,
  GuardrailsResponse,
  LedgerResponse,
  MetricsResponse,
  PoliciesResponse,
  ReplayResult,
} from "@/lib/api-types";

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} failed: ${r.status}`);
  return r.json() as Promise<T>;
}
async function sendJSON<T>(
  url: string,
  method: "POST",
  body?: unknown,
): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : "{}",
  });
  if (!r.ok) throw new Error(`${method} ${url} failed: ${r.status}`);
  return r.json() as Promise<T>;
}

/** Invalidate everything that a money/state mutation can affect. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ["metrics", "cases", "approvals", "ledger", "case", "guardrails", "agents"].map(
        (k) => qc.invalidateQueries({ queryKey: [k] }),
      ),
    );
}

export function useCases(search: string) {
  return useQuery({
    queryKey: ["cases", search],
    queryFn: () => getJSON<CasesResponse>(`/api/cases${search ? `?${search}` : ""}`),
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: () => getJSON<MetricsResponse>("/api/metrics"),
  });
}

export function useApprovals() {
  return useQuery({
    queryKey: ["approvals"],
    queryFn: () => getJSON<ApprovalsResponse>("/api/approvals"),
  });
}

export function useCaseDetail(id: string) {
  return useQuery({
    queryKey: ["case", id],
    queryFn: () => getJSON<CaseDetailResponse>(`/api/cases/${id}`),
  });
}

export function useLedger(search = "") {
  return useQuery({
    queryKey: ["ledger", search],
    queryFn: () => getJSON<LedgerResponse>(`/api/ledger${search ? `?${search}` : ""}`),
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: () => getJSON<PoliciesResponse>("/api/policies"),
  });
}

export function useGuardrails() {
  return useQuery({
    queryKey: ["guardrails"],
    queryFn: () => getJSON<GuardrailsResponse>("/api/guardrails"),
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => getJSON<AgentsResponse>("/api/agents"),
  });
}

export function useCaseAction(id?: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: { caseId: string; action: string; note?: string }) =>
      sendJSON<CaseActionResult>(`/api/cases/${input.caseId}/actions`, "POST", {
        action: input.action,
        note: input.note,
      }),
    onSuccess: invalidate,
  });
}

export function useBulkAction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: { caseIds: string[]; action: string; note?: string }) =>
      sendJSON<{ applied: number; recovered: number }>(
        "/api/cases/bulk-actions",
        "POST",
        input,
      ),
    onSuccess: invalidate,
  });
}

export function useSimulateRefund() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (caseId?: string) =>
      sendJSON<{ amount: number; totals: LedgerResponse["totals"]; caseId: string }>(
        "/api/ledger/simulate-refund",
        "POST",
        { caseId },
      ),
    onSuccess: invalidate,
  });
}

export function useReplay() {
  return useMutation({
    mutationFn: (input?: { holdoutPct?: number }) =>
      sendJSON<ReplayResult>("/api/replay", "POST", input ?? {}),
  });
}

export function useSavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sendJSON<{ version: number }>("/api/policies", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export function useSaveAllowlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { agentKey: string; allowlist: string[]; enabled?: boolean }) =>
      sendJSON<{ config: unknown }>(
        `/api/agents/${input.agentKey}/allowlist`,
        "POST",
        { allowlist: input.allowlist, enabled: input.enabled },
      ),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["agents"] }),
        qc.invalidateQueries({ queryKey: ["guardrails"] }),
      ]),
  });
}

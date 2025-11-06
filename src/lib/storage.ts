import type { LayoutItem } from "@/components/LayoutGrid";
import { defaultMockData, type AlertRecord, type FollowRecord, type LayoutRecord } from "./mock-data";
import type { UserRole } from "./user";

const layoutStore = new Map<string, LayoutRecord[]>();
const followStore = new Map<string, FollowRecord[]>();
const alertStore = new Map<string, AlertRecord[]>();
const roleStore = new Map<string, UserRole>();

const shouldUseMocks = process.env.USE_AUTH_MOCKS !== "false";

if (shouldUseMocks) {
  layoutStore.set(defaultMockData.user.id, defaultMockData.layouts);
  followStore.set(defaultMockData.user.id, defaultMockData.follows);
  alertStore.set(defaultMockData.user.id, defaultMockData.alerts);
  roleStore.set(defaultMockData.user.id, defaultMockData.user.role);
}

function ensureUserStores(userId: string) {
  if (!layoutStore.has(userId)) layoutStore.set(userId, []);
  if (!followStore.has(userId)) followStore.set(userId, []);
  if (!alertStore.has(userId)) alertStore.set(userId, []);
  if (!roleStore.has(userId)) roleStore.set(userId, "free");
}

export function getUserRole(userId: string): UserRole {
  ensureUserStores(userId);
  return roleStore.get(userId) ?? "free";
}

export function setUserRole(userId: string, role: UserRole): void {
  ensureUserStores(userId);
  roleStore.set(userId, role);
}

export async function getLayouts(userId: string): Promise<LayoutRecord[]> {
  ensureUserStores(userId);
  return layoutStore.get(userId) ?? [];
}

export async function saveLayout(userId: string, layout: LayoutItem[]): Promise<void> {
  ensureUserStores(userId);
  const record: LayoutRecord = {
    id: `layout-${Date.now()}`,
    user_id: userId,
    layout_json: layout,
    updated_at: new Date().toISOString(),
  };
  layoutStore.set(userId, [record]);
}

export async function getFollows(userId: string): Promise<FollowRecord[]> {
  ensureUserStores(userId);
  return followStore.get(userId) ?? [];
}

export async function getAlerts(userId: string): Promise<AlertRecord[]> {
  ensureUserStores(userId);
  return alertStore.get(userId) ?? [];
}

export type { LayoutRecord, FollowRecord, AlertRecord };

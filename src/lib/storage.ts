import type { LayoutItem } from "@/components/LayoutGrid";
import { prisma } from "./prisma";
import { defaultMockData, type AlertRecord, type FollowRecord, type LayoutRecord } from "./mock-data";
import type { UserRole } from "./user";

const shouldUseMocks = process.env.USE_AUTH_MOCKS !== "false";

const layoutStore = new Map<string, LayoutRecord[]>();
const followStore = new Map<string, FollowRecord[]>();
const alertStore = new Map<string, AlertRecord[]>();
const roleStore = new Map<string, UserRole>();

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

function mapLayout(record: { id: string; userId: string; layoutJson: unknown; updatedAt: Date }): LayoutRecord {
  const layoutJson = Array.isArray(record.layoutJson) ? (record.layoutJson as LayoutItem[]) : [];
  return {
    id: record.id,
    user_id: record.userId,
    layout_json: layoutJson,
    updated_at: record.updatedAt.toISOString(),
  };
}

function mapFollow(record: { userId: string; channelId: string }): FollowRecord {
  return {
    user_id: record.userId,
    channel_id: record.channelId,
  };
}

function mapAlert(record: { userId: string; configJson: unknown }): AlertRecord {
  const configValue =
    record.configJson && typeof record.configJson === "object"
      ? (record.configJson as Record<string, unknown>)
      : {};
  return {
    user_id: record.userId,
    config_json: configValue,
  };
}

export async function getUserRole(userId: string): Promise<UserRole> {
  if (shouldUseMocks) {
    ensureUserStores(userId);
    return roleStore.get(userId) ?? "free";
  }

  const record = await prisma.userRole.findUnique({ where: { userId } });
  return (record?.role as UserRole | undefined) ?? "free";
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  if (shouldUseMocks) {
    ensureUserStores(userId);
    roleStore.set(userId, role);
    return;
  }

  await prisma.userRole.upsert({
    where: { userId },
    create: { userId, role },
    update: { role },
  });
}

export async function getLayouts(userId: string): Promise<LayoutRecord[]> {
  if (shouldUseMocks) {
    ensureUserStores(userId);
    return layoutStore.get(userId) ?? [];
  }

  const records = await prisma.layout.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return records.map(mapLayout);
}

export async function saveLayout(userId: string, layout: LayoutItem[]): Promise<void> {
  if (shouldUseMocks) {
    ensureUserStores(userId);
    const record: LayoutRecord = {
      id: `layout-${Date.now()}`,
      user_id: userId,
      layout_json: layout,
      updated_at: new Date().toISOString(),
    };
    layoutStore.set(userId, [record]);
    return;
  }

  await prisma.layout.upsert({
    where: { userId },
    create: {
      userId,
      layoutJson: layout,
    },
    update: {
      layoutJson: layout,
    },
  });
}

export async function getFollows(userId: string): Promise<FollowRecord[]> {
  if (shouldUseMocks) {
    ensureUserStores(userId);
    return followStore.get(userId) ?? [];
  }

  const records = await prisma.follow.findMany({ where: { userId } });
  return records.map(mapFollow);
}

export async function getAlerts(userId: string): Promise<AlertRecord[]> {
  if (shouldUseMocks) {
    ensureUserStores(userId);
    return alertStore.get(userId) ?? [];
  }

  const records = await prisma.alert.findMany({ where: { userId } });
  return records.map(mapAlert);
}

export type { LayoutRecord, FollowRecord, AlertRecord };

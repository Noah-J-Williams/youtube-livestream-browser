import type { LayoutItem } from "@/components/LayoutGrid";
import { prisma } from "./prisma";
import type { UserRole } from "./user";

type LayoutRecord = {
  id: string;
  user_id: string;
  layout_json: LayoutItem[];
  updated_at: string;
};

type FollowRecord = {
  user_id: string;
  channel_id: string;
};

type AlertRecord = {
  user_id: string;
  config_json: Record<string, unknown>;
};

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
  const record = await prisma.userRole.findUnique({ where: { userId } });
  return (record?.role as UserRole | undefined) ?? "free";
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  await prisma.userRole.upsert({
    where: { userId },
    create: { userId, role },
    update: { role },
  });
}

export async function getLayouts(userId: string): Promise<LayoutRecord[]> {
  const records = await prisma.layout.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return records.map(mapLayout);
}

export async function saveLayout(userId: string, layout: LayoutItem[]): Promise<void> {
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
  const records = await prisma.follow.findMany({ where: { userId } });
  return records.map(mapFollow);
}

export async function getAlerts(userId: string): Promise<AlertRecord[]> {
  const records = await prisma.alert.findMany({ where: { userId } });
  return records.map(mapAlert);
}

export type { LayoutRecord, FollowRecord, AlertRecord };

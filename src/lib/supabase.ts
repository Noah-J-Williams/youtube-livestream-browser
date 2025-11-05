import { cookies, headers } from "next/headers";
import type { LayoutItem } from "@/components/LayoutGrid";

type SupabaseUserRole = "free" | "pro" | "admin";

export type SupabaseUser = {
  id: string;
  email: string;
  role: SupabaseUserRole;
};

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

const mockUser: SupabaseUser = {
  id: "mock-user-id",
  email: "pro@example.com",
  role: "pro",
};

let mockLayouts: LayoutRecord[] = [
  {
    id: "layout-1",
    user_id: mockUser.id,
    layout_json: [
      { id: "mock-stream-1", x: 0, y: 0, w: 6, h: 4 },
      { id: "mock-stream-2", x: 6, y: 0, w: 6, h: 4 },
    ],
    updated_at: new Date().toISOString(),
  },
];

const mockFollows: FollowRecord[] = [
  { user_id: mockUser.id, channel_id: "UC-lHJZR3Gqxm24_Vd_AJ5Yw" },
  { user_id: mockUser.id, channel_id: "UC-9-kyTW8ZkZNDHQJ6FgpwQ" },
];

const mockAlerts: AlertRecord[] = [
  {
    user_id: mockUser.id,
    config_json: { categories: ["Gaming"], notifyMinutesBefore: 15 },
  },
];

export async function getCurrentUser(): Promise<SupabaseUser | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return process.env.USE_SUPABASE_MOCKS === "false" ? null : mockUser;
  }

  const authToken = cookies().get("sb-access-token")?.value ?? headers().get("authorization")?.replace("Bearer ", "");
  if (!authToken) return null;

  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${authToken}`,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("Failed to fetch Supabase user", response.statusText);
    return null;
  }
  const json = (await response.json()) as { id: string; email: string };
  const role = await fetchUserRole(json.id);
  return { id: json.id, email: json.email, role };
}

async function fetchUserRole(userId: string): Promise<SupabaseUserRole> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return mockUser.role;
  }
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("Failed to fetch Supabase role", response.statusText);
    return "free";
  }
  const rows = (await response.json()) as Array<{ role: SupabaseUserRole }>;
  return rows[0]?.role ?? "free";
}

export async function getLayouts(userId: string): Promise<LayoutRecord[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || process.env.USE_SUPABASE_MOCKS !== "false") {
    return mockLayouts.filter((layout) => layout.user_id === userId);
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/layouts?user_id=eq.${userId}`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    console.error("Failed to fetch layouts", response.statusText);
    return [];
  }
  const rows = (await response.json()) as LayoutRecord[];
  return rows;
}

export async function saveLayout(userId: string, layout: LayoutItem[]): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.USE_SUPABASE_MOCKS !== "false") {
    const record: LayoutRecord = {
      id: "layout-1",
      user_id: userId,
      layout_json: layout,
      updated_at: new Date().toISOString(),
    };
    mockLayouts = [record];
    return;
  }

  await fetch(`${process.env.SUPABASE_URL}/rest/v1/layouts`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ user_id: userId, layout_json: layout }),
  });
}

export async function getFollows(userId: string): Promise<FollowRecord[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || process.env.USE_SUPABASE_MOCKS !== "false") {
    return mockFollows.filter((follow) => follow.user_id === userId);
  }
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/follows?user_id=eq.${userId}`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    },
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    console.error("Failed to fetch follows", response.statusText);
    return [];
  }
  return (await response.json()) as FollowRecord[];
}

export async function getAlerts(userId: string): Promise<AlertRecord[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || process.env.USE_SUPABASE_MOCKS !== "false") {
    return mockAlerts.filter((alert) => alert.user_id === userId);
  }
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/alerts?user_id=eq.${userId}`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    },
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    console.error("Failed to fetch alerts", response.statusText);
    return [];
  }
  return (await response.json()) as AlertRecord[];
}

export async function setUserRole(userId: string, role: SupabaseUserRole): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.USE_SUPABASE_MOCKS !== "false") {
    if (mockUser.id === userId) {
      mockUser.role = role;
    }
    return;
  }

  await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ role }),
  });
}

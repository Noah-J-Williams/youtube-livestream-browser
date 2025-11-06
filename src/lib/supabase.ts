import type { LayoutItem } from "@/components/LayoutGrid";

export type SupabaseUserRole = "free" | "pro" | "admin";

export type SupabaseUser = {
  id: string;
  email: string;
  role: SupabaseUserRole;
  name?: string | null;
  image?: string | null;
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
  id: "mock-google-user-id",
  email: "pro@example.com",
  role: "pro",
  name: "Mock Pro", 
  image: "https://placehold.co/64x64",
};

const mockUsers = new Map<string, SupabaseUser>([[mockUser.id, mockUser]]);

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

function usingMocks() {
  return (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.USE_SUPABASE_MOCKS !== "false"
  );
}

export async function ensureUserProfile(user: SupabaseUser): Promise<SupabaseUser> {
  if (usingMocks()) {
    mockUsers.set(user.id, { ...mockUsers.get(user.id), ...user });
    return mockUsers.get(user.id)!;
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      image: user.image,
    }),
  });

  if (!response.ok) {
    console.error("Failed to upsert Supabase profile", await response.text());
  }

  const profile = await getUserProfile(user.id);
  return profile ?? { ...user, role: "free" };
}

export async function getUserProfile(userId: string): Promise<SupabaseUser | null> {
  if (usingMocks()) {
    return mockUsers.get(userId) ?? null;
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch Supabase profile", await response.text());
    return null;
  }

  const rows = (await response.json()) as Array<{
    id: string;
    email: string;
    role: SupabaseUserRole;
    name?: string | null;
    image?: string | null;
  }>;

  const record = rows[0];
  return record
    ? { id: record.id, email: record.email, role: record.role, name: record.name, image: record.image }
    : null;
}

export async function getUserRole(userId: string): Promise<SupabaseUserRole> {
  const profile = await getUserProfile(userId);
  return profile?.role ?? "free";
}

export async function getLayouts(userId: string): Promise<LayoutRecord[]> {
  if (usingMocks()) {
    return mockLayouts.filter((layout) => layout.user_id === userId);
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/layouts?user_id=eq.${userId}`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch layouts", await response.text());
    return [];
  }

  return (await response.json()) as LayoutRecord[];
}

export async function saveLayout(userId: string, layout: LayoutItem[]): Promise<void> {
  if (usingMocks()) {
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
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ user_id: userId, layout_json: layout }),
  });
}

export async function getFollows(userId: string): Promise<FollowRecord[]> {
  if (usingMocks()) {
    return mockFollows.filter((follow) => follow.user_id === userId);
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/follows?user_id=eq.${userId}`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch follows", await response.text());
    return [];
  }

  return (await response.json()) as FollowRecord[];
}

export async function getAlerts(userId: string): Promise<AlertRecord[]> {
  if (usingMocks()) {
    return mockAlerts.filter((alert) => alert.user_id === userId);
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/alerts?user_id=eq.${userId}`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch alerts", await response.text());
    return [];
  }

  return (await response.json()) as AlertRecord[];
}

export async function setUserRole(userId: string, role: SupabaseUserRole): Promise<void> {
  if (usingMocks()) {
    const user = mockUsers.get(userId);
    if (user) {
      mockUsers.set(userId, { ...user, role });
    }
    return;
  }

  await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ role }),
  });
}

export function getMockUser(): SupabaseUser {
  return mockUser;
}


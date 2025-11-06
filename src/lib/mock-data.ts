import type { LayoutItem } from "@/components/LayoutGrid";
import type { AppUser } from "./user";

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

export type MockData = {
  user: AppUser;
  layouts: LayoutRecord[];
  follows: FollowRecord[];
  alerts: AlertRecord[];
};

export const defaultMockData: MockData = {
  user: {
    id: "mock-google-user",
    email: "viewer@example.com",
    role: "pro",
    name: "YouTube Power User",
    image: "https://avatars.githubusercontent.com/u/6751787?v=4",
  },
  layouts: [
    {
      id: "layout-1",
      user_id: "mock-google-user",
      layout_json: [
        { id: "mock-stream-1", x: 0, y: 0, w: 6, h: 4 },
        { id: "mock-stream-2", x: 6, y: 0, w: 6, h: 4 },
      ],
      updated_at: new Date().toISOString(),
    },
  ],
  follows: [
    { user_id: "mock-google-user", channel_id: "UC-lHJZR3Gqxm24_Vd_AJ5Yw" },
    { user_id: "mock-google-user", channel_id: "UC-9-kyTW8ZkZNDHQJ6FgpwQ" },
  ],
  alerts: [
    {
      user_id: "mock-google-user",
      config_json: { categories: ["Gaming"], notifyMinutesBefore: 15 },
    },
  ],
};

export type { LayoutRecord, FollowRecord, AlertRecord };

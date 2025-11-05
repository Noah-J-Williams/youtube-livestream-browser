#!/usr/bin/env node
import { writeFileSync } from "node:fs";

const seed = {
  users: [
    { id: "mock-user-id", email: "pro@example.com", role: "pro" },
  ],
  follows: [
    { user_id: "mock-user-id", channel_id: "UC-lHJZR3Gqxm24_Vd_AJ5Yw" },
    { user_id: "mock-user-id", channel_id: "UC-9-kyTW8ZkZNDHQJ6FgpwQ" },
  ],
  layouts: [
    {
      user_id: "mock-user-id",
      layout_json: [
        { id: "mock-stream-1", x: 0, y: 0, w: 6, h: 4 },
        { id: "mock-stream-2", x: 6, y: 0, w: 6, h: 4 },
      ],
    },
  ],
  alerts: [
    { user_id: "mock-user-id", config_json: { categories: ["Gaming"], notifyMinutesBefore: 15 } },
  ],
};

writeFileSync("supabase-seed.json", JSON.stringify(seed, null, 2));
console.log("Seed data written to supabase-seed.json");

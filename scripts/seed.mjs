#!/usr/bin/env node
import { writeFileSync } from "node:fs";

const seed = {
  users: [
    { id: "mock-google-user", email: "viewer@example.com", role: "pro" },
  ],
  follows: [
    { user_id: "mock-google-user", channel_id: "UC-lHJZR3Gqxm24_Vd_AJ5Yw" },
    { user_id: "mock-google-user", channel_id: "UC-9-kyTW8ZkZNDHQJ6FgpwQ" },
  ],
  layouts: [
    {
      user_id: "mock-google-user",
      layout_json: [
        { id: "mock-stream-1", x: 0, y: 0, w: 6, h: 4 },
        { id: "mock-stream-2", x: 6, y: 0, w: 6, h: 4 },
      ],
    },
  ],
  alerts: [
    { user_id: "mock-google-user", config_json: { categories: ["Gaming"], notifyMinutesBefore: 15 } },
  ],
};

writeFileSync("auth-mock-seed.json", JSON.stringify(seed, null, 2));
console.log("Seed data written to auth-mock-seed.json");


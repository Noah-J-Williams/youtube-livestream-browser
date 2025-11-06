export type UserRole = "free" | "pro" | "admin";

export type AppUser = {
  id: string;
  email: string;
  role: UserRole;
  name?: string | null;
  image?: string | null;
};

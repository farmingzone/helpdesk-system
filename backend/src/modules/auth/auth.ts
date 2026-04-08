import { Request } from "express";

export type UserRole = "ADMIN" | "AGENT" | "REQUESTER";

export type UserContext = {
  role: UserRole;
  userName: string;
};

export function getUserContext(req: Request): UserContext {
  const rawRole = String(req.header("x-role") ?? "ADMIN").toUpperCase();
  const rawUser = String(req.header("x-user") ?? "demo-admin");

  const role: UserRole =
    rawRole === "AGENT" || rawRole === "REQUESTER" || rawRole === "ADMIN"
      ? rawRole
      : "ADMIN";

  return {
    role,
    userName: rawUser
  };
}

export function canChangeStatus(role: UserRole) {
  return role === "ADMIN" || role === "AGENT";
}

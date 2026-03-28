import { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";

let baseUrl = "";
let closeServer: (() => Promise<void>) | null = null;

beforeAll(async () => {
  const server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  closeServer = () =>
    new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
});

afterAll(async () => {
  if (closeServer) {
    await closeServer();
  }
});

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body };
}

describe("E2E ticket flow", () => {
  it("register -> done -> stats reflected", async () => {
    const created = await api("/api/tickets", {
      method: "POST",
      headers: {
        "x-role": "ADMIN",
        "x-user": "admin-e2e"
      },
      body: JSON.stringify({
        title: "E2E create",
        description: "E2E flow first scenario",
        requesterName: "user-e2e-a"
      })
    });

    expect(created.status).toBe(201);
    const ticketId = String(created.body.id);

    const inProgress = await api(`/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: {
        "x-role": "AGENT",
        "x-user": "agent-e2e"
      },
      body: JSON.stringify({
        toStatus: "IN_PROGRESS",
        actorName: "agent-e2e"
      })
    });
    expect(inProgress.status).toBe(200);

    const done = await api(`/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: {
        "x-role": "AGENT",
        "x-user": "agent-e2e"
      },
      body: JSON.stringify({
        toStatus: "DONE",
        actorName: "agent-e2e"
      })
    });
    expect(done.status).toBe(200);

    const stats = await api("/api/stats/average-resolution-time", {
      headers: {
        "x-role": "ADMIN",
        "x-user": "admin-e2e"
      }
    });
    expect(stats.status).toBe(200);
    expect(stats.body.completedCount).toBe(1);
  });

  it("reopen and re-complete flow keeps history and summary", async () => {
    const created = await api("/api/tickets", {
      method: "POST",
      headers: {
        "x-role": "ADMIN",
        "x-user": "admin-e2e"
      },
      body: JSON.stringify({
        title: "E2E reopen",
        description: "E2E flow second scenario",
        requesterName: "user-e2e-b"
      })
    });
    const ticketId = String(created.body.id);

    await api(`/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "x-role": "AGENT", "x-user": "agent-e2e" },
      body: JSON.stringify({ toStatus: "IN_PROGRESS", actorName: "agent-e2e" })
    });
    await api(`/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "x-role": "AGENT", "x-user": "agent-e2e" },
      body: JSON.stringify({ toStatus: "DONE", actorName: "agent-e2e" })
    });

    const reopen = await api(`/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "x-role": "AGENT", "x-user": "agent-e2e" },
      body: JSON.stringify({ toStatus: "IN_PROGRESS", actorName: "agent-e2e", note: "reopen" })
    });
    expect(reopen.status).toBe(200);

    const doneAgain = await api(`/api/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "x-role": "AGENT", "x-user": "agent-e2e" },
      body: JSON.stringify({ toStatus: "DONE", actorName: "agent-e2e", note: "done again" })
    });
    expect(doneAgain.status).toBe(200);

    const detail = await api(`/api/tickets/${ticketId}`, {
      headers: { "x-role": "ADMIN", "x-user": "admin-e2e" }
    });
    expect(detail.status).toBe(200);
    expect(detail.body.status).toBe("DONE");
    expect(Array.isArray(detail.body.histories)).toBe(true);
    expect((detail.body.histories as unknown[]).length).toBe(5);

    const summary = await api("/api/stats/resolution-summary", {
      headers: { "x-role": "ADMIN", "x-user": "admin-e2e" }
    });
    expect(summary.status).toBe(200);
    expect(summary.body.completedCount).toBe(1);
    expect(summary.body).toHaveProperty("slaOver24HoursCompletedCount");
  });
});

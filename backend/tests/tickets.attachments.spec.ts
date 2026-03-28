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

async function createTicket(requesterName: string) {
  const response = await fetch(`${baseUrl}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-role": "ADMIN",
      "x-user": "admin-attach"
    },
    body: JSON.stringify({
      title: "Attachment ticket",
      description: "Attachment tests",
      requesterName
    })
  });

  const body = (await response.json()) as { id: string };
  return { status: response.status, ticketId: body.id };
}

describe("Ticket attachments", () => {
  it("uploads, lists and downloads attachment", async () => {
    const created = await createTicket("requester-a");
    expect(created.status).toBe(201);

    const form = new FormData();
    form.append("file", new Blob(["hello attachment"], { type: "text/plain" }), "note.txt");
    const uploaded = await fetch(`${baseUrl}/api/tickets/${created.ticketId}/attachments`, {
      method: "POST",
      headers: {
        "x-role": "AGENT",
        "x-user": "agent-a"
      },
      body: form
    });

    expect(uploaded.status).toBe(201);
    const uploadedBody = (await uploaded.json()) as { id: string };
    expect(uploadedBody.id).toBeTruthy();

    const listed = await fetch(`${baseUrl}/api/tickets/${created.ticketId}/attachments`, {
      headers: {
        "x-role": "REQUESTER",
        "x-user": "requester-a"
      }
    });
    expect(listed.status).toBe(200);
    const listedBody = (await listed.json()) as Array<{ id: string }>;
    expect(listedBody).toHaveLength(1);

    const downloaded = await fetch(
      `${baseUrl}/api/tickets/${created.ticketId}/attachments/${uploadedBody.id}`,
      {
        headers: {
          "x-role": "REQUESTER",
          "x-user": "requester-a"
        }
      }
    );
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers.get("content-type")).toContain("text/plain");
    expect(await downloaded.text()).toBe("hello attachment");
  });

  it("blocks requester from another ticket owner", async () => {
    const created = await createTicket("requester-owner");
    const listForbidden = await fetch(`${baseUrl}/api/tickets/${created.ticketId}/attachments`, {
      headers: {
        "x-role": "REQUESTER",
        "x-user": "another-user"
      }
    });

    expect(listForbidden.status).toBe(403);
  });

  it("blocks unsupported extension", async () => {
    const created = await createTicket("requester-ext");
    const form = new FormData();
    form.append("file", new Blob(["do not allow"], { type: "application/octet-stream" }), "bad.exe");
    const response = await fetch(`${baseUrl}/api/tickets/${created.ticketId}/attachments`, {
      method: "POST",
      headers: {
        "x-role": "ADMIN",
        "x-user": "admin-attach"
      },
      body: form
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toContain("Unsupported file extension");
  });

  it("blocks over-limit file size", async () => {
    const created = await createTicket("requester-size");
    const oversizedBytes = new Uint8Array(5 * 1024 * 1024 + 1);
    const form = new FormData();
    form.append("file", new Blob([oversizedBytes], { type: "application/pdf" }), "big.pdf");

    const response = await fetch(`${baseUrl}/api/tickets/${created.ticketId}/attachments`, {
      method: "POST",
      headers: {
        "x-role": "ADMIN",
        "x-user": "admin-attach"
      },
      body: form
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toContain("max size");
  });
});

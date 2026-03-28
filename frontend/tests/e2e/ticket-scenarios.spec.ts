import { expect, Page, test } from "@playwright/test";

function unique(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function switchUser(page: Page, role: "ADMIN" | "AGENT" | "REQUESTER", userName: string) {
  await page.getByTestId("role-select").selectOption(role);
  await page.getByTestId("user-name-input").fill(userName);
}

async function createTicket(
  page: Page,
  input: { requesterName: string; title: string; description: string; dueAt?: string }
) {
  await page.getByTestId("create-requester-input").fill(input.requesterName);
  await page.getByTestId("create-title-input").fill(input.title);
  await page.getByTestId("create-description-input").fill(input.description);
  if (input.dueAt) {
    await page.getByTestId("create-due-at-input").fill(input.dueAt);
  }
  await page.getByTestId("create-submit-button").click();
  await expect(page.locator("tbody tr", { hasText: input.title }).first()).toBeVisible();
}

async function findTicketIdByTitle(page: Page, title: string) {
  const row = page.locator("tbody tr", { hasText: title }).first();
  await expect(row).toBeVisible();
  const detailButton = row.locator("button", { hasText: "보기" });
  const testId = await detailButton.getAttribute("data-testid");
  if (!testId) {
    throw new Error("Ticket detail button test id is missing");
  }
  return testId.replace("open-detail-", "");
}

test.describe("Playwright E2E scenarios", () => {
  test("scenario 1: 티켓 생성 -> 담당자 지정 -> 완료", async ({ page }) => {
    const title = unique("pw-flow");
    await page.goto("/");
    await switchUser(page, "ADMIN", "admin-e2e");

    await createTicket(page, {
      requesterName: "requester-e2e",
      title,
      description: "playwright scenario 1"
    });

    const ticketId = await findTicketIdByTitle(page, title);

    await page.getByTestId("assignee-ticket-select").selectOption(ticketId);
    await page.getByTestId("assignee-actor-input").fill("agent-e2e");
    await page.getByTestId("assignee-name-input").fill("agent-kim");
    await page.getByTestId("assignee-submit-button").click();
    const row = page.locator("tbody tr", { hasText: title }).first();
    await expect(row).toContainText("agent-kim");

    await page.getByTestId("status-ticket-select").selectOption(ticketId);
    await page.getByTestId("status-actor-input").fill("agent-e2e");
    await page.getByTestId("status-to-select").selectOption("IN_PROGRESS");
    await page.getByTestId("status-submit-button").click();
    await expect(row).toContainText("처리중");

    await page.getByTestId("status-to-select").selectOption("DONE");
    await page.getByTestId("status-submit-button").click();
    await expect(row).toContainText("agent-kim");
    await expect(row).toContainText("완료");
  });

  test("scenario 2: REQUESTER는 상태/담당자 변경 불가", async ({ page }) => {
    const requesterName = unique("requester");
    const title = unique("pw-forbidden");
    await page.goto("/");
    await switchUser(page, "ADMIN", "admin-e2e");

    await createTicket(page, {
      requesterName,
      title,
      description: "playwright scenario 2"
    });

    const ticketId = await findTicketIdByTitle(page, title);

    await switchUser(page, "REQUESTER", requesterName);

    await page.getByTestId("status-ticket-select").selectOption(ticketId);
    await page.getByTestId("status-actor-input").fill(requesterName);
    await page.getByTestId("status-submit-button").click();

    await page.getByTestId("assignee-ticket-select").selectOption(ticketId);
    await page.getByTestId("assignee-actor-input").fill(requesterName);
    await page.getByTestId("assignee-name-input").fill("blocked-agent");
    await page.getByTestId("assignee-submit-button").click();

    const row = page.locator("tbody tr", { hasText: title }).first();
    await expect(row).toContainText("접수");
    await expect(row).toContainText("-");
  });

  test("scenario 3: SLA 지연 건수/필터 반영", async ({ page }) => {
    const title = unique("pw-overdue");
    const overdueLocalDateTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().slice(0, 16);

    await page.goto("/");
    await switchUser(page, "ADMIN", "admin-e2e");

    const baseline = Number(await page.getByTestId("overdue-count").innerText());

    await createTicket(page, {
      requesterName: "requester-overdue",
      title,
      description: "playwright scenario 3",
      dueAt: overdueLocalDateTime
    });

    await expect
      .poll(async () => Number(await page.getByTestId("overdue-count").innerText()))
      .toBeGreaterThanOrEqual(baseline + 1);

    await page.getByTestId("overdue-only-checkbox").check();
    await expect(page.locator("tbody tr", { hasText: title }).first()).toBeVisible();
  });
});

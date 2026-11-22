import { expect, test } from "@playwright/test";

const incident = {
  id: "inc_test_001",
  payment_id: "pay_test_001",
  severity: "high",
  exposure_minor: 12345,
  evidence_ids: ["evt_capture_1"],
  journal_ids: ["jrnl_test_002"],
  status: "open",
};

async function stubApi(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/auth/keyword", async route => {
    const accepted = route.request().postDataJSON().keyword === "local-demo-approval";
    await route.fulfill({ status: accepted ? 200 : 403, json: accepted ? { status: "accepted" } : { detail: "keyword not accepted" } });
  });
  await page.route("**/api/v1/overview", route => route.fulfill({ json: {
    data_origin: "generated simulation", open_incidents: 1, affected_payments: 1,
    suspected_exposure_minor: 12345, verified_loss_minor: null,
    severity_counts: { high: 1 }, event_source_counts: { merchant: 1, gateway: 2, webhook: 1 },
    event_count: 4, journal_count: 2, ledger_version: 2,
  } }));
  await page.route("**/api/v1/audit", route => route.fulfill({ json: { items: [] } }));
  await page.route("**/api/v1/incidents", route =>
    route.fulfill({ json: { data: "generated simulation", items: [incident] } }),
  );
  await page.route("**/api/v1/incidents/*/evidence", route =>
    route.fulfill({
      json: {
        nodes: [
          { id: "inc_test_001", type: "incident" },
          { id: "evt_capture_1", type: "event", event_type: "payment.captured", source: "gateway" },
          { id: "jrnl_test_002", type: "ledger_entry" },
        ],
        edges: [{ source: "inc_test_001", target: "evt_capture_1", relation: "references", inferred: false }, { source: "inc_test_001", target: "jrnl_test_002", relation: "references", inferred: false }],
      },
    }),
  );
  await page.route("**/api/v1/incidents/*/investigate", route =>
    route.fulfill({
      json: {
        engine: "deterministic_rules_v1",
        root_cause: "duplicate_internal_posting",
        summary: "An extra capture posting was detected.",
        uncertainty: "The upstream cause is not established.",
        observed_facts: [{ claim: "Posting count mismatch", evidence_ids: ["evt_capture_1"] }],
      },
    }),
  );
  await page.route("**/api/v1/recoveries", route =>
    route.fulfill({ status: 201, json: { id: "rec_test_001" } }),
  );
  await page.route("**/api/v1/recoveries/rec_test_001/simulate", route =>
    route.fulfill({ json: { status: "verified_simulation_only" } }),
  );
  await page.route("**/api/v1/recoveries/rec_test_001/approve", async route => {
    expect(route.request().headers()["x-approval-token"]).toBe("local-demo-approval");
    await route.fulfill({ json: { status: "approved" } });
  });
  await page.route("**/api/v1/recoveries/rec_test_001/execute", route =>
    route.fulfill({ json: { status: "executed_in_sandbox", journal_id: "jrnl_sandbox_003" } }),
  );
}

async function enterWorkspace(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Open demo workspace" }).click();
  await expect(page.getByRole("heading", { name: "Incident investigation" })).toBeVisible();
}

test("landing page explains and checks the demo keyword", async ({ page }) => {
  await stubApi(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("img", { name: "LedgerLens mark" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment records do not match." })).toBeVisible();
  await expect(page.getByLabel("Incident review process: read events, compare the ledger, verify a recovery")).toBeVisible();
  await expect(page.locator(".process-step")).toHaveCount(3);
  await expect(page.locator(".brand-lockup small")).toHaveCount(0);
  const ledeSize = await page.locator(".landing-lede").evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(ledeSize).toBeGreaterThanOrEqual(16);
  const themeButton = page.getByRole("button", { name: "Switch to light theme" });
  await themeButton.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const keyword = page.getByLabel("Workspace keyword");
  await keyword.fill("bad-keyword");
  await page.getByRole("button", { name: "Open demo workspace" }).click();
  await expect(page.locator(".access-error")).toContainText("keyword not accepted");
  await keyword.fill("local-demo-approval");
  await enterWorkspace(page);
});

test("layout remains within the viewport from mobile to desktop", async ({ page }) => {
  await stubApi(page);
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const landingDimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(landingDimensions.document, "landing overflow at " + width + "px").toBeLessThanOrEqual(landingDimensions.viewport);
    await enterWorkspace(page);
    await expect(page.getByRole("heading", { name: "Incident investigation" })).toBeVisible();
    await expect(page.locator("tbody")).toContainText("$123.45");
    await expect(page.getByRole("heading", { name: "Evidence by source" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Event count by source" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Evidence graph with incident, event, and ledger records" })).toBeVisible();
    await expect(page.getByLabel("Local demo approval keyword")).toHaveValue("local-demo-approval");
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document, "document overflow at " + width + "px").toBeLessThanOrEqual(dimensions.viewport);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  const table = page.getByRole("region", { name: "Open incidents table" });
  expect(await table.evaluate(element => element.scrollWidth)).toBeGreaterThan(
    await table.evaluate(element => element.clientWidth),
  );
});

test("theme toggle preserves readable light mode", async ({ page }) => {
  await stubApi(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await enterWorkspace(page);
  await expect(page.getByLabel("How demo keyword approval works")).toBeVisible();
  const toggle = page.getByRole("button", { name: "Switch to light theme" });
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "Open incidents" })).toBeVisible();
  const lightBackground = await page.locator("body").evaluate(element => getComputedStyle(element).backgroundColor);
  expect(lightBackground).toBe("rgb(243, 245, 247)");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("demo keyword approval explains its sandbox boundary", async ({ page }) => {
  await stubApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await enterWorkspace(page);
  await page.getByRole("button", { name: "Simulate proposed reversal" }).click();
  await expect(page.getByLabel("How demo keyword approval works")).toBeVisible();
  await expect(page.getByText("not account login, identity verification, or production-grade authorization.")).toBeVisible();
  const keyword = page.getByLabel("Local demo approval keyword");
  await expect(keyword).toHaveValue("local-demo-approval");
  await page.getByRole("button", { name: "Verify keyword & execute in sandbox" }).click();
  await expect(page.getByRole("status")).toContainText("jrnl_sandbox_003");
});

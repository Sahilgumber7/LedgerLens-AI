import { expect, test } from "@playwright/test";

const incident = { id: "inc_test_001", payment_id: "pay_test_001", severity: "high", exposure_minor: 12345, evidence_ids: ["evt_capture_1"], journal_ids: ["jrnl_test_002"], status: "open" };

async function stubApi(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/auth/keyword", async route => { const accepted = route.request().postDataJSON().keyword === "local-demo-approval"; await route.fulfill({ status: accepted ? 200 : 403, json: accepted ? { status: "accepted" } : { detail: "keyword not accepted" } }); });
  await page.route("**/api/v1/overview", route => route.fulfill({ json: { data_origin: "generated simulation", open_incidents: 1, affected_payments: 1, suspected_exposure_minor: 12345, verified_loss_minor: null, severity_counts: { high: 1 }, event_source_counts: { merchant: 1, gateway: 2, webhook: 1 }, event_count: 4, journal_count: 2, ledger_version: 2 } }));
  await page.route("**/api/v1/incidents", route => route.fulfill({ json: { data: "generated simulation", items: [incident] } }));
  await page.route("**/api/v1/payments", route => route.fulfill({ json: { items: [{ id: "pay_test_001", observed_state: "payment.captured", amount_minor: 12345, currency: "USD", event_count: 4, journal_ids: ["jrnl_test_002"], settlement_observation: null, data_origin: "generated simulation observations" }] } }));
  await page.route("**/api/v1/audit", route => route.fulfill({ json: { items: [] } }));
  await page.route("**/api/v1/benchmarks", route => route.fulfill({ json: { scorecard: "LedgerLens Deterministic Baseline Score", scorecard_version: 1, headline_score_percent: 100, counts: { cases_total: 100 }, metrics: { root_cause_accuracy: 100, evidence_reference_validity: 100 }, limitations: ["One fault family only."], generation: { source: "seeded simulator", fault_family_count: 1, cases_per_class: 50 } } }));
  await page.route("**/api/v1/incidents/*/evidence", route => route.fulfill({ json: { nodes: [{ id: "inc_test_001", type: "incident" }, { id: "evt_capture_1", type: "event", event_type: "payment.captured", source: "gateway" }, { id: "jrnl_test_002", type: "ledger_entry" }], edges: [{ source: "inc_test_001", target: "evt_capture_1", relation: "references", inferred: false }, { source: "inc_test_001", target: "jrnl_test_002", relation: "references", inferred: false }] } }));
  await page.route("**/api/v1/incidents/*/investigate", route => route.fulfill({ json: { engine: "deterministic_rules_v1", root_cause: "duplicate_internal_posting", summary: "An extra capture posting was detected.", uncertainty: "The upstream cause is not established.", observed_facts: [{ claim: "Posting count mismatch", evidence_ids: ["evt_capture_1"] }] } }));
  await page.route("**/api/v1/recoveries", route => route.fulfill({ status: 201, json: { id: "rec_test_001" } }));
  await page.route("**/api/v1/recoveries/rec_test_001/simulate", route => route.fulfill({ json: { status: "verified_simulation_only" } }));
  await page.route("**/api/v1/recoveries/rec_test_001/approve", async route => { expect(route.request().headers()["x-approval-token"]).toBe("local-demo-approval"); await route.fulfill({ json: { status: "approved" } }); });
  await page.route("**/api/v1/recoveries/rec_test_001/execute", route => route.fulfill({ json: { status: "executed_in_sandbox", journal_id: "jrnl_sandbox_003" } }));
}

async function enterWorkspace(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Open demo workspace" }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
}

test("landing explains the focused investigation agents and keyword gate", async ({ page }) => {
  await stubApi(page); await page.setViewportSize({ width: 1280, height: 900 }); await page.goto("/");
  await expect(page.getByRole("img", { name: "Tracewire mark" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Catch payment anomalies. Trace every alert." })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.fonts.check("16px Sora"))).toBe(true);
  await expect(page.getByLabel("Investigation process: track payment signals, trace alerts, verify a recovery")).toBeVisible();
  await expect(page.locator(".process-step")).toHaveCount(3);
  const keyword = page.getByLabel("Workspace keyword"); await keyword.fill("bad-keyword"); await page.getByRole("button", { name: "Open demo workspace" }).click(); await expect(page.locator(".access-error")).toContainText("keyword not accepted");
  await keyword.fill("local-demo-approval"); await enterWorkspace(page);
});

test("sidebar opens independent pages with page-specific API data", async ({ page }) => {
  await stubApi(page); await page.goto("/"); await enterWorkspace(page);
  await page.getByRole("link", { name: "Fraud alerts" }).click(); await expect(page).toHaveURL(/\/incidents$/); await expect(page.getByRole("heading", { name: "Fraud and payment alerts" })).toBeVisible(); await expect(page.getByRole("table")).toContainText("$123.45"); await expect(page.getByRole("img", { name: "Evidence graph with incident, event, and ledger records" })).toBeVisible();
  await page.getByRole("link", { name: "Payments" }).click(); await expect(page).toHaveURL(/\/payments$/); await expect(page.getByRole("heading", { name: "Observed payment records" })).toBeVisible(); await expect(page.getByRole("table")).toContainText("No record");
  await page.getByRole("link", { name: "Recovery studio" }).click(); await expect(page).toHaveURL(/\/recovery$/); await expect(page.getByRole("heading", { name: "Simulate, verify, approve" })).toBeVisible();
  await page.getByRole("link", { name: "Audit trail" }).click(); await expect(page).toHaveURL(/\/audit$/); await expect(page.getByRole("heading", { name: "Recovery and approval history" })).toBeVisible();
  await page.getByRole("link", { name: "FinOpsBench" }).click(); await expect(page).toHaveURL(/\/benchmarks$/); await expect(page.getByRole("heading", { name: "FinOpsBench scorecard" })).toBeVisible(); await expect(page.getByText("100.0%", { exact: false }).first()).toBeVisible();
});

test("layout stays in viewport from mobile to desktop and tables scroll locally", async ({ page }) => {
  await stubApi(page); await page.goto("/"); await enterWorkspace(page);
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(size.document, `document overflow at ${width}px`).toBeLessThanOrEqual(size.viewport);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("link", { name: "Fraud alerts" }).click();
  const table = page.getByRole("region", { name: "Fraud alerts table" });
  expect(await table.evaluate(el => el.scrollWidth)).toBeGreaterThan(await table.evaluate(el => el.clientWidth));
});

test("keyword recovery approval stays on the sandbox page", async ({ page }) => {
  await stubApi(page); await page.goto("/"); await enterWorkspace(page); await page.getByRole("link", { name: "Recovery studio" }).click();
  await page.getByRole("button", { name: "Simulate proposed reversal" }).click();
  const keyword = page.getByLabel("Local demo approval keyword"); await expect(keyword).toHaveValue("local-demo-approval");
  await page.getByRole("button", { name: "Approve and execute in sandbox" }).click(); await expect(page.getByRole("status")).toContainText("jrnl_sandbox_003");
});

import { expect, test } from "@playwright/test";

const TEST_EVENT_ID = process.env.REALTIME_TEST_EVENT_ID;
const TEST_EMAIL = process.env.REALTIME_TEST_EMAIL;
const TEST_PASSWORD = process.env.REALTIME_TEST_PASSWORD;

test.skip(
  !TEST_EVENT_ID || !TEST_EMAIL || !TEST_PASSWORD,
  "REALTIME_TEST_EVENT_ID/EMAIL/PASSWORD not set — run `npm run seed:e2e:realtime` and export the printed values"
);

// Both tests share the single seeded "Realtime Tester" submission, so they
// must not run concurrently.
test.describe.configure({ mode: "serial" });

test("pausing from the control panel updates the display screen without a reload", async ({ browser }) => {
  const controlContext = await browser.newContext();
  const displayContext = await browser.newContext();

  const control = await controlContext.newPage();
  const display = await displayContext.newPage();

  await control.goto("/login");
  await control.getByPlaceholder("you@example.com").fill(TEST_EMAIL!);
  await control.getByPlaceholder("รหัสผ่านของคุณ").fill(TEST_PASSWORD!);
  await control.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await control.waitForURL("/dashboard");

  await control.goto(`/dashboard/events/${TEST_EVENT_ID}/control`);
  const pauseButton = control.getByRole("button", { name: /Pause|Resume/ });
  await expect(pauseButton).toHaveText("Pause ⏸");

  await display.goto(`/display/${TEST_EVENT_ID}`);
  await expect(display.getByText("Realtime Tester")).toBeVisible({ timeout: 15_000 });

  await pauseButton.click();
  await expect(pauseButton).toHaveText("▶ Resume");

  // No reload on the display page — realtime should push the paused state.
  await expect(display.getByText("Realtime Tester")).toBeHidden({ timeout: 10_000 });

  await pauseButton.click();
  await expect(pauseButton).toHaveText("Pause ⏸");
  await expect(display.getByText("Realtime Tester")).toBeVisible({ timeout: 10_000 });

  await controlContext.close();
  await displayContext.close();
});

test("skipping the now-playing post from the control panel removes it from the display without a reload", async ({ browser }) => {
  const controlContext = await browser.newContext();
  const displayContext = await browser.newContext();

  const control = await controlContext.newPage();
  const display = await displayContext.newPage();

  await control.goto("/login");
  await control.getByPlaceholder("you@example.com").fill(TEST_EMAIL!);
  await control.getByPlaceholder("รหัสผ่านของคุณ").fill(TEST_PASSWORD!);
  await control.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await control.waitForURL("/dashboard");

  await control.goto(`/dashboard/events/${TEST_EVENT_ID}/control`);
  const skipButton = control.getByRole("button", { name: "Skip ⏭" });
  await expect(skipButton).toBeVisible();

  await display.goto(`/display/${TEST_EVENT_ID}`);
  await expect(display.getByText("Realtime Tester")).toBeVisible({ timeout: 15_000 });

  await skipButton.click();

  // No reload on the display page — the skipped post should disappear via
  // the submissions_changed broadcast (see migration 009 / issue #12).
  await expect(display.getByText("Realtime Tester")).toBeHidden({ timeout: 10_000 });

  await controlContext.close();
  await displayContext.close();
});

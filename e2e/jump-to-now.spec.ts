import { expect, test } from "@playwright/test";

const TEST_EVENT_ID = process.env.REALTIME_TEST_EVENT_ID;
const TEST_EMAIL = process.env.REALTIME_TEST_EMAIL;
const TEST_PASSWORD = process.env.REALTIME_TEST_PASSWORD;

test.skip(
  !TEST_EVENT_ID || !TEST_EMAIL || !TEST_PASSWORD,
  "REALTIME_TEST_EVENT_ID/EMAIL/PASSWORD not set — run `npm run seed:e2e:realtime` and export the printed values"
);

test("jumping to an up-next post from the control panel switches the display to it immediately", async ({ browser }) => {
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
  const jumpButton = control.getByRole("button", { name: "▶ Now" }).first();
  await expect(jumpButton).toBeVisible();

  await display.goto(`/display/${TEST_EVENT_ID}`);
  await expect(display.getByText("Realtime Tester", { exact: true })).toBeVisible({ timeout: 15_000 });

  await jumpButton.click();

  // No reload on the display page — jump_to_post broadcast should switch the
  // now-playing post without waiting for its turn in the normal queue order.
  await expect(display.getByText("Realtime Tester 2", { exact: true })).toBeVisible({ timeout: 5_000 });

  await controlContext.close();
  await displayContext.close();
});

import { expect, test } from "@playwright/test";

const TEST_EVENT_ID = process.env.REALTIME_TEST_EVENT_ID;
const TEST_EMAIL = process.env.REALTIME_TEST_EMAIL;
const TEST_PASSWORD = process.env.REALTIME_TEST_PASSWORD;

test.skip(
  !TEST_EVENT_ID || !TEST_EMAIL || !TEST_PASSWORD,
  "REALTIME_TEST_EVENT_ID/EMAIL/PASSWORD not set — run `npm run seed:e2e:realtime` and export the printed values"
);

// The seed sets post_duration_seconds = 10 and two approved posts
// ("Realtime Tester", "Realtime Tester 2") for this.
test("control panel progress bar resets in sync when the display advances to the next post", async ({ browser }) => {
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
  await expect(control.getByText("Realtime Tester", { exact: true })).toBeVisible();

  // Open the control panel's progress timer ~5s (half of the 10s post
  // duration) before the display's own timer starts, so the two are
  // deliberately out of phase under independent-timer logic.
  await control.waitForTimeout(5_000);

  await display.goto(`/display/${TEST_EVENT_ID}`);
  await expect(display.getByText("Realtime Tester", { exact: true })).toBeVisible({ timeout: 15_000 });

  // post_duration_seconds is 10 — the display should auto-advance to the
  // second post well within that + the 500ms fade.
  await expect(display.getByText("Realtime Tester 2")).toBeVisible({ timeout: 13_000 });

  // The control panel's "Now Playing" should follow, and its progress bar
  // should reset to (near) 0 in sync with the new post — not continue an
  // independent timer that's now ~5s (50%) out of phase.
  await expect(control.getByText("Realtime Tester 2")).toBeVisible({ timeout: 5_000 });
  const progressBar = control.getByTestId("progress-bar");
  await expect.poll(async () => {
    const width = await progressBar.evaluate((el) => el.style.width);
    return parseFloat(width);
  }, { timeout: 2_000 }).toBeLessThan(30);

  await controlContext.close();
  await displayContext.close();
});

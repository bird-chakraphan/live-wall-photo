import path from "path";
import { expect, test } from "@playwright/test";

const TEST_EVENT_ID = process.env.TEST_EVENT_ID;

test.skip(!TEST_EVENT_ID, "TEST_EVENT_ID not set — see README for how to seed a test event");

test("guest can submit a photo + message on an active event", async ({ page }) => {
  await page.goto(`/upload/${TEST_EVENT_ID}`);

  await page.getByPlaceholder("จะชื่อเล่น หรือฉายาก็โอเคนะ").fill("E2E Tester");
  await page.setInputFiles('input[type="file"]', path.join(__dirname, "fixtures", "photo.jpg"));
  await page.getByPlaceholder("อยากจะบอกอะไรบ่าวสาว เขียนตรงนี้ได้เลย").fill("Congrats from the e2e suite!");

  await page.getByRole("button", { name: "แตะเพื่อส่งความรู้สึก" }).click();

  await expect(page.getByText("ส่งแล้ว! 🎉")).toBeVisible({ timeout: 15000 });
});

import { test as base, expect } from "@playwright/test";

// Existing interaction scenarios explicitly exercise the Spanish translation.
export const test = base.extend({
  page: async ({ page }, run) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem("graphlive-language"))
        localStorage.setItem("graphlive-language", "es");
    });
    await run(page);
  },
});
export { expect };

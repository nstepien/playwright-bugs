import {
  expect,
  type FrameLocator,
  type Locator,
  type Page,
  test,
} from "@playwright/test";

async function assertDocumentHasFocus(page: Page, expected: boolean) {
  const hasFocus = page.evaluate(() => document.hasFocus());
  await expect(hasFocus).resolves.toBe(expected);
}

async function assertIframeDocumentHasFocus(
  iframe: FrameLocator,
  expected: boolean,
) {
  const iframeHasFocus = iframe
    .locator(":root")
    .evaluate(() => document.hasFocus());
  await expect(iframeHasFocus).resolves.toBe(expected);
}

interface FocusRecord {
  documentHasFocus: boolean;
  iframeDocumentHasFocus: boolean;
  iframeIsFocused: boolean;
  inputAIsFocused: boolean;
  inputBIsFocused: boolean;
  inputCIsFocused: boolean;
  pageFocusCount: number;
  iframeFocusCount: number;
}

async function getFocusRecord(
  page: Page,
  iframe: FrameLocator,
  inputA: Locator,
  inputB: Locator,
  inputC: Locator,
): Promise<FocusRecord> {
  return {
    documentHasFocus: await page.evaluate(() => document.hasFocus()),
    iframeDocumentHasFocus: await iframe
      .locator(":root")
      .evaluate(() => document.hasFocus()),
    iframeIsFocused: await page.evaluate(
      () => document.activeElement?.tagName === "IFRAME",
    ),
    inputAIsFocused: await inputA.evaluate(
      (input) => input === document.activeElement,
    ),
    inputBIsFocused: await inputB.evaluate(
      (input) => input === document.activeElement,
    ),
    inputCIsFocused: await inputC.evaluate(
      (input) => input === document.activeElement,
    ),
    pageFocusCount: await page.locator(":focus").count(),
    iframeFocusCount: await iframe.locator(":focus").count(),
  };
}

test("tabbing", async ({ page, browserName }) => {
  await page.goto(import.meta.resolve("./tabbing.html"));

  const inputA = page.getByPlaceholder("Input A");
  const inputB = page.getByPlaceholder("Input B");
  const inputC = page.getByPlaceholder("Input C");

  await inputB.click();
  await assertDocumentHasFocus(page, true);
  await expect(inputB).toBeFocused();

  await page.keyboard.press("Tab");
  await assertDocumentHasFocus(page, true);
  await expect(inputC).toBeFocused();

  await page.keyboard.press("Tab");
  if (browserName === "firefox") {
    // Firefox keeps focus on Input C
    await assertDocumentHasFocus(page, true);
    await expect(inputC).toBeFocused();

    // this times out, Firefox never tabs out of the page,
    // nor does it cycle back to the first input
    while (
      await page.evaluate(
        (): boolean =>
          document.hasFocus() &&
          (document.activeElement as HTMLInputElement).placeholder ===
            "Input C",
      )
    ) {
      await page.keyboard.press("Tab");
    }
  }
  await assertDocumentHasFocus(page, false);
  await expect(inputA).not.toBeFocused();
  await expect(inputB).not.toBeFocused();
  await expect(inputC).not.toBeFocused();

  await page.keyboard.press("Tab");
  await assertDocumentHasFocus(page, true);
  await expect(inputA).toBeFocused();

  await page.keyboard.press("Tab");
  await assertDocumentHasFocus(page, true);
  await expect(inputB).toBeFocused();
});

test("shift tabbing", async ({ page, browserName }) => {
  await page.goto(import.meta.resolve("./tabbing.html"));

  const inputA = page.getByPlaceholder("Input A");
  const inputB = page.getByPlaceholder("Input B");
  const inputC = page.getByPlaceholder("Input C");

  await inputB.click();
  await assertDocumentHasFocus(page, true);
  await expect(inputB).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await assertDocumentHasFocus(page, true);
  await expect(inputA).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  if (browserName === "firefox") {
    // Firefox keeps focus on Input A
    await assertDocumentHasFocus(page, true);
    await expect(inputA).toBeFocused();

    // this times out, Firefox never tabs out of the page,
    // nor does it cycle back to the last input
    while (
      await page.evaluate(
        (): boolean =>
          document.hasFocus() &&
          (document.activeElement as HTMLInputElement).placeholder ===
            "Input A",
      )
    ) {
      await page.keyboard.press("Shift+Tab");
    }
  }
  await assertDocumentHasFocus(page, false);
  await expect(inputA).not.toBeFocused();
  await expect(inputB).not.toBeFocused();
  await expect(inputC).not.toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await assertDocumentHasFocus(page, true);
  await expect(inputC).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await assertDocumentHasFocus(page, true);
  await expect(inputB).toBeFocused();
});

test("tabbing in iframe", async ({ page, browserName }) => {
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(msg.text()));

  await page.goto(import.meta.resolve("./tabbing-iframe.html"));

  const iframe = page.frameLocator("iframe");
  const inputA = iframe.getByPlaceholder("Input A");
  const inputB = iframe.getByPlaceholder("Input B");
  const inputC = iframe.getByPlaceholder("Input C");

  await inputB.click();
  await assertDocumentHasFocus(page, true);
  await assertIframeDocumentHasFocus(iframe, true);
  await expect(inputB).toBeFocused();

  await page.keyboard.press("Tab");
  await assertDocumentHasFocus(page, true);
  await assertIframeDocumentHasFocus(iframe, true);
  await expect(inputC).toBeFocused();

  // behavior starts to diverge here
  await page.keyboard.press("Tab");
  const focusRecords = [
    await getFocusRecord(page, iframe, inputA, inputB, inputC),
  ];

  // keep tabbing until we move focus into the iframe
  // webkit times out here
  while (
    (await page.evaluate(() => !document.hasFocus())) ||
    (await iframe.locator(":root").evaluate(() => !document.hasFocus()))
  ) {
    await page.keyboard.press("Tab");
    focusRecords.push(
      await getFocusRecord(page, iframe, inputA, inputB, inputC),
    );
  }
  switch (browserName) {
    case "chromium":
      expect(focusRecords).toEqual([
        // initial state, focus is on a browser UI element
        {
          documentHasFocus: false,
          iframeDocumentHasFocus: false,
          iframeIsFocused: false,
          inputAIsFocused: false,
          inputBIsFocused: false,
          inputCIsFocused: false,
          pageFocusCount: 0,
          iframeFocusCount: 0,
        },
        // second tab, focus is still on a browser UI element
        {
          documentHasFocus: false,
          iframeDocumentHasFocus: false,
          iframeIsFocused: false,
          inputAIsFocused: false,
          inputBIsFocused: false,
          inputCIsFocused: false,
          pageFocusCount: 0,
          iframeFocusCount: 0,
        },
        // third tab, focus moves to Input A
        // this looks correct
        {
          documentHasFocus: true,
          iframeDocumentHasFocus: true,
          iframeIsFocused: true,
          inputAIsFocused: true,
          inputBIsFocused: false,
          inputCIsFocused: false,
          pageFocusCount: 0,
          iframeFocusCount: 1,
        },
      ]);
      expect(logs).toEqual([
        // this first log differs from Firefox
        "parent window blur",
        "window focus",
        "Input B focus",
        "Input B blur",
        "Input C focus",
        "Input C blur",
        "window blur",
        "window focus",
        "Input A focus",
      ]);
      break;
    case "firefox":
      // In Firefox, the iframe remains focused,
      // so the parent document stays focused
      expect(focusRecords).toEqual([
        // initial state, the iframe in the parent document has focus
        {
          documentHasFocus: true,
          iframeDocumentHasFocus: false,
          iframeIsFocused: true,
          inputAIsFocused: false,
          inputBIsFocused: false,
          inputCIsFocused: false,
          pageFocusCount: 0,
          iframeFocusCount: 0,
        },
        // second tab:
        // - Input C becomes focused, why?
        // - the parent document has focus, but the iframe document does not
        // - primary focus remains on a browser UI element
        {
          documentHasFocus: true,
          iframeDocumentHasFocus: false,
          iframeIsFocused: true,
          inputAIsFocused: false,
          inputBIsFocused: false,
          inputCIsFocused: true,
          pageFocusCount: 0,
          iframeFocusCount: 1,
        },
        // second tab:
        // - Input C stays focused
        // - the parent document has focus, but the iframe document does not
        // - primary focus remains on a browser UI element
        {
          documentHasFocus: true,
          iframeDocumentHasFocus: true,
          iframeIsFocused: true,
          inputAIsFocused: false,
          inputBIsFocused: false,
          inputCIsFocused: true,
          pageFocusCount: 0,
          iframeFocusCount: 1,
        },
      ]);
      expect(logs).toEqual([
        // this first log differs from Chromium
        "parent window focus",
        "window focus",
        "Input B focus",
        "Input B blur",
        "Input C focus",
        "Input C blur",
        "window blur",
        "window focus",
        // Input C becomes focused, why?
        "Input C focus",
        // Input C loses focus, why?
        "Input C blur",
        "window blur",
        "window focus",
        // Input C becomes focused, why?
        "Input C focus",
      ]);
      break;
    case "webkit":
      // WebKit times out, it never tabs back into the document
      // what should the results be?
      expect(focusRecords).toEqual([
        // initial state
        {
          // ?
        },
      ]);
      expect(logs).toEqual([
        // ?
      ]);
      break;
  }
});

test("shift tabbing in iframe", async ({ page, browserName }) => {
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(msg.text()));

  await page.goto(import.meta.resolve("./tabbing-iframe.html"));

  const iframe = page.frameLocator("iframe");
  const inputA = iframe.getByPlaceholder("Input A");
  const inputB = iframe.getByPlaceholder("Input B");
  const inputC = iframe.getByPlaceholder("Input C");

  await inputB.click();
  await assertDocumentHasFocus(page, true);
  await assertIframeDocumentHasFocus(iframe, true);
  await expect(inputB).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await assertDocumentHasFocus(page, true);
  await assertIframeDocumentHasFocus(iframe, true);
  await expect(inputA).toBeFocused();

  // behavior starts to diverge here
  await page.keyboard.press("Shift+Tab");
  const focusRecords = [
    await getFocusRecord(page, iframe, inputA, inputB, inputC),
  ];

  // keep tabbing until we move focus into the iframe
  // webkit times out here
  // firefox also times out here, even though tabbing forward works in the test above
  while (
    (await page.evaluate(() => !document.hasFocus())) ||
    (await iframe.locator(":root").evaluate(() => !document.hasFocus()))
  ) {
    await page.keyboard.press("Shift+Tab");
    focusRecords.push(
      await getFocusRecord(page, iframe, inputA, inputB, inputC),
    );
  }
  switch (browserName) {
    case "chromium":
      expect(focusRecords).toEqual([
        // initial state, focus is on a browser UI element
        {
          documentHasFocus: false,
          iframeDocumentHasFocus: false,
          iframeIsFocused: false,
          inputAIsFocused: false,
          inputBIsFocused: false,
          inputCIsFocused: false,
          pageFocusCount: 0,
          iframeFocusCount: 0,
        },
        // second tab, focus is still on a browser UI element
        {
          documentHasFocus: false,
          iframeDocumentHasFocus: false,
          iframeIsFocused: false,
          inputAIsFocused: false,
          inputBIsFocused: false,
          inputCIsFocused: false,
          pageFocusCount: 0,
          iframeFocusCount: 0,
        },
        // third tab, focus moves to Input C
        // this looks correct
        {
          documentHasFocus: true,
          iframeDocumentHasFocus: true,
          iframeIsFocused: true,
          inputAIsFocused: false,
          inputBIsFocused: false,
          inputCIsFocused: true,
          pageFocusCount: 0,
          iframeFocusCount: 1,
        },
      ]);
      expect(logs).toEqual([
        "parent window blur",
        "window focus",
        "Input B focus",
        "Input B blur",
        "Input A focus",
        "Input A blur",
        "window blur",
        "window focus",
        "Input C focus",
      ]);
      break;
    case "firefox":
      // Firefox times out
      // what should the results be?
      expect(focusRecords).toEqual([
        // initial state
        {
          // ?
        },
      ]);
      expect(logs).toEqual([
        // ?
      ]);
      break;
    case "webkit":
      // WebKit times out, it never tabs back into the document
      // what should the results be?
      expect(focusRecords).toEqual([
        // initial state
        {
          // ?
        },
      ]);
      expect(logs).toEqual([
        // ?
      ]);
      break;
  }
});

test("clicking to restore focus after tabbing", async ({
  page,
  browserName,
  headless,
}) => {
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(msg.text()));

  await page.goto(import.meta.resolve("./tabbing-iframe.html"));

  const iframe = page.frameLocator("iframe");
  const inputs = iframe.getByRole("textbox");
  const inputA = inputs.nth(0);
  const inputB = inputs.nth(1);
  const inputC = inputs.nth(2);

  await inputC.click();
  await assertDocumentHasFocus(page, true);
  await assertIframeDocumentHasFocus(iframe, true);
  await expect(inputC).toBeFocused();

  // behavior starts to diverge here
  await page.keyboard.press("Tab");
  const focusRecords = [
    await getFocusRecord(page, iframe, inputA, inputB, inputC),
  ];

  // keep clicking until Input B becomes focused
  while (
    (await inputB.evaluate((input) => input !== document.activeElement)) ||
    (await iframe.locator(":root").evaluate(() => !document.hasFocus()))
  ) {
    await inputB.click();
    focusRecords.push(
      await getFocusRecord(page, iframe, inputA, inputB, inputC),
    );
  }

  await expect(inputB).toBeFocused();

  switch (browserName) {
    case "chromium":
    case "webkit":
      expect(focusRecords).toEqual([
        // the first state is identical between chromium and webkit
        {
          documentHasFocus: false,
          iframeDocumentHasFocus: false,
          iframeIsFocused: false,
          inputAIsFocused: false,
          inputBIsFocused: false,
          inputCIsFocused: false,
          pageFocusCount: 0,
          iframeFocusCount: 0,
        },
        // the last state is identical in all three browsers
        {
          documentHasFocus: true,
          iframeDocumentHasFocus: true,
          iframeIsFocused: true,
          inputAIsFocused: false,
          inputBIsFocused: true,
          inputCIsFocused: false,
          pageFocusCount: 0,
          iframeFocusCount: 1,
        },
      ]);
      break;
    case "firefox":
      expect(focusRecords).toEqual(
        [
          {
            documentHasFocus: true,
            iframeDocumentHasFocus: false,
            iframeIsFocused: true,
            inputAIsFocused: false,
            inputBIsFocused: false,
            inputCIsFocused: false,
            pageFocusCount: 0,
            iframeFocusCount: 0,
          },
          // when headless is disabled, after the first click,
          // Input B becomes focused, but the iframe document isn't focused,
          // we need to click one more time, why?
          !headless && {
            documentHasFocus: true,
            iframeDocumentHasFocus: false,
            iframeIsFocused: true,
            inputAIsFocused: false,
            inputBIsFocused: true,
            inputCIsFocused: false,
            pageFocusCount: 0,
            iframeFocusCount: 0,
          },
          // the last state is identical in all three browsers
          {
            documentHasFocus: true,
            iframeDocumentHasFocus: true,
            iframeIsFocused: true,
            inputAIsFocused: false,
            inputBIsFocused: true,
            inputCIsFocused: false,
            pageFocusCount: 0,
            iframeFocusCount: 1,
          },
        ].filter(Boolean),
      );
      break;
  }

  switch (browserName) {
    case "chromium":
    case "webkit":
      // Chromium and WebKit have the same logs
      expect(logs).toEqual([
        "parent window blur",
        "window focus",
        "Input C focus",
        "Input C blur",
        "window blur",
        "window focus",
        "Input B focus",
      ]);
      break;
    case "firefox":
      expect(logs).toEqual(
        [
          // this first log differs from Chromium and WebKit
          "parent window focus",
          "window focus",
          "Input C focus",
          "Input C blur",
          "window blur",
          "window focus",
          // when headless is disabled, Input B becomes focused...
          "Input B focus",
          // but loses focus immediately, why?
          // does a browser UI element steal focus?
          !headless && "Input B blur",
          !headless && "window blur",
          !headless && "window focus",
          !headless && "Input B focus",
        ].filter(Boolean),
      );
      break;
  }
});

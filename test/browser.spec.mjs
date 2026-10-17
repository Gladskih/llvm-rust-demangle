import { test, expect } from "@playwright/test";

test("browser demangles under strict CSP using only local assets", async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on("request", request => requests.push(request.url()));
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/test/browser.html");
  const result = await page.evaluate(async () => {
    const { createDemangler } = await import("/dist/browser.js");
    return (await createDemangler()).demangleWithText("_RNvC1a4main");
  });
  expect(result.text).toBe("a::main");
  expect(result.ast.nodes[0].kind).toBe("Symbol");
  expect(requests.filter(url => url.endsWith(".wasm"))).toHaveLength(1);
  expect(requests.every(url => url.startsWith("http://127.0.0.1:4177/"))).toBe(true);
  expect(errors).toEqual([]);
});

test("provided bytes demangle offline", async ({ page }) => {
  await page.goto("/test/browser.html");
  await page.evaluate(async () => {
    window.wasmBinary = new Uint8Array(await (await fetch("/dist/llvm-rust-demangle.wasm")).arrayBuffer());
    window.createDemangler = (await import("/dist/browser.js")).createDemangler;
  });
  await page.context().setOffline(true);
  const results = await page.evaluate(async () => {
    const api = await window.createDemangler({ wasmBinary: window.wasmBinary });
    return [api.demangleWithText("_RNvC1a4main"), api.demangleWithText("?"), api.demangleWithText("_RNvC1a4main")];
  });
  expect(results[0].text).toBe("a::main");
  expect(results[1].status).toBe("invalid");
  expect(results[2]).toEqual(results[0]);
});

test("module workers load and demangle", async ({ page }) => {
  await page.goto("/test/browser.html");
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const worker = new Worker("/test/worker.mjs", { type: "module" });
    worker.onerror = reject;
    worker.onmessage = event => { resolve(event.data); worker.terminate(); };
  }));
  expect(result.text).toBe("a::main");
});

test("analysis and native text return the same tree in the browser", async ({ page }) => {
  await page.goto("/test/browser.html");
  const result = await page.evaluate(async () => {
    const { createDemangler } = await import("/dist/browser.js");
    const api = await createDemangler();
    return { analysis: api.demangle("_RNvC1a4main"), formatted: api.demangleWithText("_RNvC1a4main") };
  });
  expect(result.analysis.status).toBe("success");
  expect(result.analysis).not.toHaveProperty("text");
  expect(result.formatted.ast).toEqual(result.analysis.ast);
});

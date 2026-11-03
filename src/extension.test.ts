import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
function harness(approved = true) {
  let handler: any;
  let queried = false;
  let revoked = false;
  let opened = false;
  const chrome = {
    runtime: { onMessage: { addListener: (h: any) => (handler = h) } },
    permissions: {
      contains: async () => approved,
      remove: async () => {
        revoked = true;
      },
    },
    history: {
      search: async (opts: any) => {
        queried = true;
        assert.equal(opts.maxResults, 10000);
        return [
          {
            url: "https://example.com",
            title: "Test-only history",
            lastVisitTime: 1700000000000,
            visitCount: 42,
          },
        ];
      },
    },
    action: {
      openPopup: async () => {
        opened = true;
      },
    },
  };
  vm.runInNewContext(
    readFileSync(
      new URL("../public/extension/background.js", import.meta.url),
      "utf8",
    ),
    { chrome, URL, Date },
  );
  return {
    send: async (
      msg: any,
      url = "https://jilliankoppy.github.io/Consumer-Profile-Dashboard/",
    ) => {
      let response: any;
      const result = handler(msg, { url }, (r: any) => (response = r));
      await new Promise((r) => setTimeout(r, 0));
      return { response, result, queried, revoked, opened };
    },
  };
}
test("extension rejects unauthorized origins, paths and coverage", async () => {
  for (const url of [
    "https://evil.test/Consumer-Profile-Dashboard/",
    "https://jilliankoppy.github.io/other/",
    "http://localhost:5174/Consumer-Profile-Dashboard/",
  ]) {
    const r = await harness().send({ type: "history", days: 30 }, url);
    assert.equal(r.queried, false);
    assert.equal(r.result, undefined);
  }
  assert.equal(
    (await harness().send({ type: "history", days: 365 })).queried,
    false,
  );
});
test("extension never reads history before optional permission approval", async () => {
  const r = await harness(false).send({ type: "history", days: 30 });
  assert.equal(r.queried, false);
  assert.equal(r.response.type, "error");
  assert.equal(r.opened, true);
});
test("approved history transfers only selected fields and revocation works", async () => {
  const h = harness();
  const r = await h.send({ type: "history", days: 7 });
  assert.equal(r.response.type, "history");
  assert.deepEqual(Object.keys(r.response.records[0]).sort(), [
    "lastVisitTime",
    "title",
    "url",
  ]);
  assert.equal((await h.send({ type: "disconnect" })).revoked, true);
});

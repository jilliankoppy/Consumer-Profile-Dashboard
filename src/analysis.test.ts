import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseImport,
  summarize,
  recommendations,
  safeUrl,
} from "./analysis.ts";
test("CSV quoted titles and missing dates remain accurate", () => {
  const p = parseImport(
    'url,title,date\nhttps://github.com,"coding, software",\n',
    "input.csv",
  );
  assert.equal(p.records.length, 1);
  assert.equal(p.records[0].time, null);
  assert.equal(summarize(p.records).interests[0].name, "Technology");
});
test("Takeout Chrome microseconds and sensitive exclusions", () => {
  const p = parseImport(
    JSON.stringify({
      "Browser History": [
        {
          url: "https://example.com",
          title: "medical software",
          time_usec: 13370000000000000,
        },
      ],
    }),
    "takeout.json",
  );
  assert.ok(p.records[0].time);
  assert.equal(summarize(p.records).classified, 0);
});
test("ChatGPT assistant and quoted text excluded", () => {
  const p = parseImport(
    JSON.stringify([
      {
        mapping: {
          a: {
            message: {
              author: { role: "assistant" },
              content: { parts: ["buy laptop"] },
            },
          },
          b: {
            message: {
              author: { role: "user" },
              content: { parts: ["> laptop\nI enjoy cooking"] },
            },
          },
        },
      },
    ]),
    "chat.json",
  );
  assert.equal(p.records.length, 1);
  assert.equal(summarize(p.records).interests[0].name, "Food & cooking");
});
test("feedback suppresses product matches and unsafe URLs rejected", () => {
  const records = parseImport(
    '[{"url":"https://github.com","title":"software"}]',
    "x.json",
  ).records;
  const products = [
    {
      id: "1",
      name: "Laptop",
      category: "Technology",
      url: "https://example.com",
    },
  ];
  assert.equal(recommendations(products, records, {}).length, 1);
  assert.equal(
    recommendations(products, records, { Technology: "inaccurate" }).length,
    0,
  );
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.throws(() => parseImport("{}", "x.json"));
});
test("CSV Unix timestamps and Takeout Unix microseconds are normalized", () => {
  const a = parseImport(
    "url,title,timestamp\nhttps://example.com,coding,1700000000",
    "x.csv",
  );
  assert.equal(a.records[0].time, 1700000000000);
  const b = parseImport(
    '[{"url":"https://example.com","time_usec":1700000000000000}]',
    "x.json",
  );
  assert.equal(b.records[0].time, 1700000000000);
});
test("catalog envelope preserves real products without inventing prices", () => {
  const p = parseImport(
    '{"products":[{"name":"Item","url":"https://example.com"}]}',
    "catalog.json",
  );
  assert.equal(p.products.length, 1);
  assert.equal(p.records.length, 0);
  assert.equal(p.products[0].price, undefined);
});

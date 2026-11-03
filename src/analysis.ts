export type RecordEntry = {
  id: string;
  url: string;
  title: string;
  time: number | null;
  source: string;
};
export type Product = {
  id: string;
  name: string;
  url: string;
  category: string;
  price?: string;
  image?: string;
};
export const categories = [
  {
    name: "Technology",
    color: "#9b8aff",
    pattern:
      /\b(tech|software|coding|developer|computer|laptop|github|electronics|javascript|programming)\b/i,
  },
  {
    name: "Style & fashion",
    color: "#ed93b8",
    pattern:
      /\b(fashion|clothing|shoes|sneakers|apparel|outfit|nordstrom|zara|nike|adidas)\b/i,
  },
  {
    name: "Home & living",
    color: "#e9b777",
    pattern:
      /\b(furniture|interior|decor|garden|ikea|kitchen|homeware|wayfair)\b/i,
  },
  {
    name: "Food & cooking",
    color: "#92ca9a",
    pattern: /\b(recipe|cooking|restaurant|baking|food|coffee|allrecipes)\b/i,
  },
  {
    name: "Travel & outdoors",
    color: "#79bdd5",
    pattern:
      /\b(travel|hotel|flight|camping|hiking|airbnb|expedia|outdoor|booking)\b/i,
  },
  {
    name: "Arts & entertainment",
    color: "#c3a7ef",
    pattern:
      /\b(music|movie|cinema|art|design|photography|spotify|netflix|gaming)\b/i,
  },
];
// Sensitive content is excluded from profiling; rules never classify sensitive traits.
const sensitive =
  /\b(health|medical|diagnosis|cancer|therapy|religion|church|mosque|politics|election|democrat|republican|sexual|sexuality|pregnancy|mental)\b/i;
export function safeUrl(value: unknown) {
  try {
    const u = new URL(String(value));
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Imported statement";
  }
}
export function classify(r: RecordEntry) {
  const text = `${r.title} ${domain(r.url)}`.replace(/[._/-]/g, " ");
  return sensitive.test(text)
    ? null
    : (categories.find((c) => c.pattern.test(text))?.name ?? null);
}
function time(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const numeric =
    typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value));
  const n = numeric ? Number(value) : Date.parse(String(value));
  if (!Number.isFinite(n)) return null;
  const ms = numeric
    ? n > 1e16
      ? n / 1000 - 11644473600000
      : n > 1e14
        ? n / 1000
        : n < 1e12
          ? n * 1000
          : n
    : n;
  return Number.isFinite(ms) && ms > 0 && ms < Date.now() + 86400000
    ? ms
    : null;
}
function csv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quote && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quote = !quote;
    } else if (c === "," && !quote) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quote) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  return rows.map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])),
  );
}
export function parseImport(
  text: string,
  filename: string,
): { records: RecordEntry[]; products: Product[]; notes: string[] } {
  const records: RecordEntry[] = [],
    products: Product[] = [],
    notes: string[] = [];
  let data: any;
  try {
    data = filename.toLowerCase().endsWith(".csv")
      ? csv(text)
      : JSON.parse(text);
  } catch {
    throw Error(
      "This file could not be read. Choose a valid CSV or JSON export.",
    );
  }
  const list = Array.isArray(data)
    ? data
    : (data["Browser History"] ??
      data.history ??
      data.records ??
      data.products ??
      data.conversations);
  if (!Array.isArray(list))
    throw Error(
      "No supported records found. Use an array, Browser History, history, records, products, or conversations field.",
    );
  if (list.length > 100000)
    throw Error(
      "This file contains too many entries. Import a smaller period (up to 100,000 entries).",
    );
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    if (item.mapping) {
      notes.push(
        "ChatGPT: only user-authored messages were considered; quoted lines and code blocks were excluded.",
      );
      for (const node of Object.values(item.mapping) as any[]) {
        const m = node?.message;
        if (m?.author?.role !== "user") continue;
        const title = (m.content?.parts ?? [])
          .filter((s: unknown) => typeof s === "string")
          .join(" ")
          .replace(/```[\s\S]*?```/g, "")
          .split("\n")
          .filter((s: string) => !s.trim().startsWith(">"))
          .join(" ")
          .replace(/“[^”]*”|"[^"]*"/g, "")
          .slice(0, 2000);
        if (title.trim())
          records.push({
            id: crypto.randomUUID(),
            url: "",
            title,
            time: time(m.create_time),
            source: filename,
          });
      }
      continue;
    }
    const url = safeUrl(
      item.url ?? item.titleUrl ?? item.product_url ?? item.link,
    );
    const title = String(
      item.title ?? item.name ?? item.product_name ?? "",
    ).slice(0, 2000);
    if (
      url &&
      (data.products ||
        item.product_name ||
        item.type === "product" ||
        item.price !== undefined ||
        (item.category && item.name))
    ) {
      products.push({
        id: crypto.randomUUID(),
        name: title || domain(url),
        url,
        category: String(item.category ?? ""),
        price: item.price !== undefined ? String(item.price) : undefined,
        image: safeUrl(item.image) || undefined,
      });
      continue;
    }
    if (url || title)
      records.push({
        id: crypto.randomUUID(),
        url,
        title: title || domain(url),
        time: time(
          item.lastVisitTime ??
            item.time_usec ??
            item.timestamp ??
            item.time ??
            item.date,
        ),
        source: filename,
      });
  }
  return { records, products, notes: [...new Set(notes)] };
}
export function summarize(records: RecordEntry[]) {
  const classified = records.map((r) => ({ r, category: classify(r) }));
  const interests = categories
    .map((c) => ({
      ...c,
      records: classified.filter((x) => x.category === c.name).map((x) => x.r),
    }))
    .filter((c) => c.records.length)
    .sort((a, b) => b.records.length - a.records.length);
  const sites = new Map<string, RecordEntry[]>();
  for (const r of records) {
    if (!r.url) continue;
    const d = domain(r.url);
    const group = sites.get(d);
    if (group) group.push(r);
    else sites.set(d, [r]);
  }
  const domains = [...sites]
    .map(([name, records]) => ({ name, records }))
    .sort((a, b) => b.records.length - a.records.length);
  const shopping = records.filter(
    (r) =>
      !sensitive.test(r.title + " " + domain(r.url)) &&
      /\b(shop|buy|cart|price|product|amazon|walmart|target|bestbuy|etsy|ebay)\b/i.test(
        (r.title + " " + domain(r.url)).replace(/[./-]/g, " "),
      ),
  );
  return {
    interests,
    domains,
    shopping,
    classified: interests.reduce((n, c) => n + c.records.length, 0),
  };
}
export function recommendations(
  products: Product[],
  records: RecordEntry[],
  feedback: Record<string, string>,
) {
  const s = summarize(records);
  return products
    .map((p) => {
      const c = categories.find(
        (c) =>
          c.name.toLowerCase() === p.category.toLowerCase() ||
          c.pattern.test(p.name + " " + p.category),
      );
      const evidence = s.interests.find((i) => i.name === c?.name);
      const rejected = c && feedback[c.name] === "inaccurate";
      const score =
        evidence && !rejected
          ? Math.min(
              95,
              Math.round(
                35 + (60 * evidence.records.length) / Math.max(1, s.classified),
              ),
            )
          : 0;
      return {
        ...p,
        score,
        evidence: rejected ? [] : (evidence?.records ?? []),
        interest: c?.name,
      };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

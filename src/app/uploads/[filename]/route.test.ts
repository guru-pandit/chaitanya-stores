import { describe, it, expect, vi, beforeEach } from "vitest";

let fileResult: Buffer | null = null;
const readFile = vi.fn(async () => {
  if (!fileResult) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  return fileResult;
});
vi.mock("fs/promises", () => {
  const mod = { readFile: (...args: unknown[]) => readFile(...(args as [])) };
  return { ...mod, default: mod };
});

import { GET } from "./route";

const call = (filename: string) =>
  GET(new Request(`http://localhost/uploads/${filename}`), { params: Promise.resolve({ filename }) });

const UUID = "0457e045-d4a2-4029-8558-fc597f47b574";

describe("GET /uploads/[filename]", () => {
  beforeEach(() => {
    readFile.mockClear();
    fileResult = null;
  });

  it("serves an existing upload with the right content type", async () => {
    fileResult = Buffer.from([1, 2, 3]);
    const res = await call(`${UUID}.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("404s when the file does not exist", async () => {
    const res = await call(`${UUID}.jpg`);
    expect(res.status).toBe(404);
  });

  it.each(["..%2F..%2F.env", "../.env", "notes.txt", `${UUID}.svg`, "a.png"])(
    "404s without touching the filesystem for %s",
    async (name) => {
      expect((await call(name)).status).toBe(404);
      expect(readFile).not.toHaveBeenCalled();
    }
  );
});

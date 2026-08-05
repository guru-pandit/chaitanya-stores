import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "./parseJsonBody";

const schema = z.object({ name: z.string().min(1) });

function requestWithBody(body: string) {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

describe("parseJsonBody", () => {
  it("parses a valid JSON body against the schema", async () => {
    const result = await parseJsonBody(requestWithBody('{"name":"Diwali"}'), schema);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Diwali");
  });

  it("fails validation (not throws) on a body that doesn't match the schema", async () => {
    const result = await parseJsonBody(requestWithBody('{"name":""}'), schema);
    expect(result.success).toBe(false);
  });

  it("fails validation instead of throwing on syntactically invalid JSON", async () => {
    const result = await parseJsonBody(requestWithBody("{bad json"), schema);
    expect(result.success).toBe(false);
  });

  it("fails validation instead of throwing on an empty body", async () => {
    const result = await parseJsonBody(requestWithBody(""), schema);
    expect(result.success).toBe(false);
  });
});

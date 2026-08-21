import { describe, it, expect, vi } from "vitest";
import { uploadWithProgress } from "./uploadWithProgress";
import { ApiError } from "@/lib/api-client";
import { stubXMLHttpRequest } from "@/test/mockXhr";

function formData() {
  const fd = new FormData();
  fd.append("file", new File(["x"], "a.png", { type: "image/png" }));
  return fd;
}

describe("uploadWithProgress", () => {
  it("POSTs to the given url and resolves with the parsed JSON body on 2xx", async () => {
    const calls = stubXMLHttpRequest({ status: 200, body: { path: "/uploads/a.png" } });

    const result = await uploadWithProgress<{ path: string }>("/api/upload", formData());

    expect(result).toEqual({ path: "/uploads/a.png" });
    expect(calls[0]).toMatchObject({ method: "POST", url: "/api/upload" });
    expect(calls[0].body).toBeInstanceOf(FormData);
  });

  it("reports each progress event as a rounded percentage", async () => {
    stubXMLHttpRequest({ status: 200, body: { path: "/uploads/a.png" }, progress: [12.4, 50, 99.6] });
    const onProgress = vi.fn();

    await uploadWithProgress("/api/upload", formData(), onProgress);

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([12, 50, 100]);
  });

  it("rejects with an ApiError carrying the server's error message on a non-2xx status", async () => {
    stubXMLHttpRequest({ status: 400, body: { error: "Unsupported file type" } });

    const error: unknown = await uploadWithProgress("/api/upload", formData()).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Unsupported file type" });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    stubXMLHttpRequest({ status: 500, rawBody: "<html>Internal Server Error</html>" });

    await expect(uploadWithProgress("/api/upload", formData())).rejects.toMatchObject({
      message: "Upload failed",
    });
  });

  it("rejects with an ApiError on a network error (xhr.onerror)", async () => {
    stubXMLHttpRequest({ networkError: true });

    await expect(uploadWithProgress("/api/upload", formData())).rejects.toMatchObject({
      message: "Upload failed",
    });
  });

  it("does not report progress when the event isn't length-computable", async () => {
    // A response with no `progress` entries never invokes onprogress at all —
    // simulates a server/proxy that never sends Content-Length, the real
    // trigger for lengthComputable: false.
    stubXMLHttpRequest({ status: 200, body: { path: "/uploads/a.png" } });
    const onProgress = vi.fn();

    await uploadWithProgress("/api/upload", formData(), onProgress);

    expect(onProgress).not.toHaveBeenCalled();
  });
});

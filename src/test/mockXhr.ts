import { vi } from "vitest";

// fetch can't be told to fire progress events, so hook/component tests that
// exercise src/lib/uploadWithProgress.ts (real uploads, not deletes — those
// still go through fetch) stub out XMLHttpRequest instead of fetch.
export interface MockXhrCall {
  method: string;
  url: string;
  body: unknown;
}

export interface MockXhrResponse {
  status?: number;
  body?: unknown;
  /** Overrides `body` — lets a test send back a non-JSON response. */
  rawBody?: string;
  /** Percentages to feed to `upload.onprogress`, e.g. [25, 60, 100]. */
  progress?: number[];
  networkError?: boolean;
}

type Responder =
  | MockXhrResponse
  | MockXhrResponse[]
  | ((call: MockXhrCall, index: number) => MockXhrResponse);

/** Queues one response per `send()` call, in order — or, given a function, computes one per call (e.g. a fresh random path each time). Returns the calls made, for assertions. */
export function stubXMLHttpRequest(responder: Responder): MockXhrCall[] {
  const queue = typeof responder === "function" ? null : Array.isArray(responder) ? [...responder] : [responder];
  const calls: MockXhrCall[] = [];

  class MockXHR {
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
      onprogress: null,
    };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    responseText = "";
    status = 0;
    private method = "";
    private url = "";

    open(method: string, url: string) {
      this.method = method;
      this.url = url;
    }

    send(body: unknown) {
      const call: MockXhrCall = { method: this.method, url: this.url, body };
      calls.push(call);
      const config =
        typeof responder === "function" ? responder(call, calls.length - 1) : queue!.shift() ?? { status: 200, body: {} };

      queueMicrotask(() => {
        if (config.networkError) {
          this.onerror?.();
          return;
        }
        for (const percent of config.progress ?? []) {
          this.upload.onprogress?.({ lengthComputable: true, loaded: percent, total: 100 });
        }
        this.status = config.status ?? 200;
        this.responseText =
          config.rawBody !== undefined ? config.rawBody : config.body === undefined ? "" : JSON.stringify(config.body);
        this.onload?.();
      });
    }
  }

  vi.stubGlobal("XMLHttpRequest", MockXHR);
  return calls;
}

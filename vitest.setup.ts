import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Without this, each render() in a component test appends to the same
// jsdom `document.body` instead of resetting between tests — harmless for
// this repo's existing hook-only tests (renderHook doesn't leave visible
// DOM behind the same way), but the first real component test
// (FestivalBannerModal) surfaced multiple stacked copies of the modal
// across tests in the same file.
afterEach(() => {
  cleanup();
});

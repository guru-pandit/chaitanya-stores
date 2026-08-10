import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSetActiveFestivalBanner } from "@/hooks/festivalBanners/useFestivalBannerMutations";
import type { FestivalBanner } from "@/generated/prisma/client";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const banner: FestivalBanner = {
  id: "b1",
  label: "Diwali 2026",
  mediaType: "IMAGE",
  mediaPath: "/uploads/diwali.jpg",
  isActive: false,
  startDate: new Date("2026-10-20T00:00:00.000Z"),
  endDate: new Date("2026-11-05T00:00:00.000Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
} as FestivalBanner;

describe("useSetActiveFestivalBanner", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("PATCHes the banner's own id with isActive forced to true and dates re-encoded as date-input strings", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ...banner, isActive: true }));

    const { result } = renderHook(() => useSetActiveFestivalBanner(), { wrapper });
    result.current.mutate(banner);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/festival-banners/b1",
      expect.objectContaining({ method: "PATCH" })
    );
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual({
      label: "Diwali 2026",
      mediaType: "IMAGE",
      mediaPath: "/uploads/diwali.jpg",
      isActive: true,
      startDate: "2026-10-20",
      endDate: "2026-11-05",
    });
  });

  it("encodes a null startDate/endDate as an empty string, not the literal 'null'", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, banner));
    const bannerNoDates = { ...banner, startDate: null, endDate: null };

    const { result } = renderHook(() => useSetActiveFestivalBanner(), { wrapper });
    result.current.mutate(bannerNoDates);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.startDate).toBe("");
    expect(body.endDate).toBe("");
  });
});

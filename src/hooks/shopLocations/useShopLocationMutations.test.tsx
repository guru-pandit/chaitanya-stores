import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSetPrimaryShopLocation } from "@/hooks/shopLocations/useShopLocationMutations";
import type { ShopLocation } from "@/generated/prisma/client";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const location: ShopLocation = {
  id: "s1",
  name: "Main Branch",
  address: "123 MG Road, Pune",
  phone: "+919999999999",
  whatsappNumber: "919999999999",
  email: "main@example.com",
  isPrimary: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} as ShopLocation;

describe("useSetPrimaryShopLocation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("PATCHes the location's own id with isPrimary forced to true, dropping id/timestamps from the body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { ...location, isPrimary: true }));

    const { result } = renderHook(() => useSetPrimaryShopLocation(), { wrapper });
    result.current.mutate(location);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "/api/shop-locations/s1",
      expect.objectContaining({ method: "PATCH" })
    );
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual({
      name: "Main Branch",
      address: "123 MG Road, Pune",
      phone: "+919999999999",
      whatsappNumber: "919999999999",
      email: "main@example.com",
      isPrimary: true,
    });
  });
});

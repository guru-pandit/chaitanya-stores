import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ProductForm } from "./ProductForm";
import type { Product } from "@/generated/prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const category = {
  id: "cat-1",
  name: "Agarbatti",
  slug: "agarbatti",
  description: null,
  image: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { products: 1 },
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderForm(ui: React.ReactElement) {
  return render(ui, { wrapper });
}

const baseProduct: Product = {
  id: "p1",
  name: "Sandalwood Agarbatti",
  slug: "agarbatti-cycle-sandalwood-agarbatti",
  description: null,
  brand: "Cycle",
  weight: "100g",
  productType: "Masala Sticks",
  sku: "CYC-INC-001",
  price: 12000,
  images: "[]",
  inStock: true,
  featured: false,
  categoryId: "cat-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// The "Type" label uniquely identifies the productType field — no other
// field label contains that word.
function getTypeInput() {
  return screen.getByLabelText(/^Type/i) as HTMLInputElement;
}

describe("ProductForm — productType field", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [category], total: 1 }), { status: 200 })
      )
    );
  });

  it("defaults the Type field to empty when creating a new product", () => {
    renderForm(<ProductForm onSubmit={vi.fn()} isSubmitting={false} />);

    expect(getTypeInput().value).toBe("");
  });

  it("prefills the Type field from an existing product in edit mode", async () => {
    renderForm(<ProductForm product={baseProduct} onSubmit={vi.fn()} isSubmitting={false} />);

    await waitFor(() => expect(getTypeInput().value).toBe("Masala Sticks"));
  });

  it("prefills the Type field as empty (not the string 'null') when the existing product has no productType", async () => {
    renderForm(
      <ProductForm
        product={{ ...baseProduct, productType: null }}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />
    );

    await waitFor(() => expect(getTypeInput().value).toBe(""));
  });

  it("does not silently wipe the existing productType when an unrelated field is edited and saved", async () => {
    const handleSubmit = vi.fn();
    renderForm(<ProductForm product={baseProduct} onSubmit={handleSubmit} isSubmitting={false} />);

    await waitFor(() => expect(getTypeInput().value).toBe("Masala Sticks"));

    fireEvent.change(screen.getByLabelText(/^Name/i), {
      target: { value: "Sandalwood Agarbatti (Renamed)" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalled());
    expect(handleSubmit.mock.calls[0][0]).toMatchObject({
      name: "Sandalwood Agarbatti (Renamed)",
      productType: "Masala Sticks",
    });
  });

  it("submits an updated Type value typed by the admin", async () => {
    const handleSubmit = vi.fn();
    renderForm(<ProductForm product={baseProduct} onSubmit={handleSubmit} isSubmitting={false} />);

    await waitFor(() => expect(getTypeInput().value).toBe("Masala Sticks"));

    fireEvent.change(getTypeInput(), { target: { value: "Black Sticks" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalled());
    expect(handleSubmit.mock.calls[0][0]).toMatchObject({ productType: "Black Sticks" });
  });
});

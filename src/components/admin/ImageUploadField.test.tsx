import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ImageUploadField } from "./ImageUploadField";

const IMAGES = ["/uploads/a.jpg", "/uploads/b.jpg", "/uploads/c.jpg"];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderField(props: Partial<React.ComponentProps<typeof ImageUploadField>> = {}) {
  const onChange = vi.fn();
  render(<ImageUploadField images={IMAGES} onChange={onChange} {...props} />, { wrapper });
  return { onChange };
}

function imageFile(name: string, type = "image/png") {
  return new File(["x"], name, { type });
}

// Minimal stand-in for the DataTransfer the browser hands to drag events.
function fileDataTransfer(files: File[]) {
  return { types: ["Files"], files, dropEffect: "", getData: () => "", setData: vi.fn() };
}

function reorderDataTransfer(fromIndex: number) {
  return {
    types: ["application/x-image-index"],
    files: [],
    dropEffect: "",
    effectAllowed: "",
    getData: () => String(fromIndex),
    setData: vi.fn(),
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("/api/upload")) {
        return new Response(JSON.stringify({ path: `/uploads/new-${Math.random()}.png` }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 200 });
    })
  );
});

describe("ImageUploadField — reordering", () => {
  it("renders a position number on every thumbnail", () => {
    renderField();

    for (const n of ["1", "2", "3"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });

  it("moves an image earlier with the arrow control", () => {
    const { onChange } = renderField();

    fireEvent.click(screen.getByLabelText("Move image 3 earlier"));

    expect(onChange).toHaveBeenCalledWith(["/uploads/a.jpg", "/uploads/c.jpg", "/uploads/b.jpg"]);
  });

  it("moves an image later with the arrow control", () => {
    const { onChange } = renderField();

    fireEvent.click(screen.getByLabelText("Move image 1 later"));

    expect(onChange).toHaveBeenCalledWith(["/uploads/b.jpg", "/uploads/a.jpg", "/uploads/c.jpg"]);
  });

  it("disables the arrows at each end so order can't run off the array", () => {
    renderField();

    expect(screen.getByLabelText("Move image 1 earlier")).toBeDisabled();
    expect(screen.getByLabelText("Move image 3 later")).toBeDisabled();
    expect(screen.getByLabelText("Move image 2 earlier")).not.toBeDisabled();
  });

  it("reorders when a thumbnail is dragged onto another", () => {
    const { onChange } = renderField();
    const thumbs = screen.getAllByLabelText(/^Image \d of 3$/);

    fireEvent.dragStart(thumbs[0], { dataTransfer: reorderDataTransfer(0) });
    fireEvent.dragOver(thumbs[2], { dataTransfer: reorderDataTransfer(0) });
    fireEvent.drop(thumbs[2], { dataTransfer: reorderDataTransfer(0) });

    expect(onChange).toHaveBeenCalledWith(["/uploads/b.jpg", "/uploads/c.jpg", "/uploads/a.jpg"]);
  });

  it("does nothing when a thumbnail is dropped on itself", () => {
    const { onChange } = renderField();
    const thumbs = screen.getAllByLabelText(/^Image \d of 3$/);

    fireEvent.dragStart(thumbs[1], { dataTransfer: reorderDataTransfer(1) });
    fireEvent.drop(thumbs[1], { dataTransfer: reorderDataTransfer(1) });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("offers no reorder affordances for a single image", () => {
    render(<ImageUploadField images={["/uploads/only.jpg"]} onChange={vi.fn()} />, { wrapper });

    expect(screen.queryByLabelText(/Move image/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Image 1 of 1")).not.toHaveAttribute("draggable", "true");
  });

  it("shows the caller's hint explaining what order means", () => {
    renderField({ reorderHint: "First image is the cover." });

    expect(screen.getByText("First image is the cover.")).toBeInTheDocument();
  });
});

describe("ImageUploadField — drag-and-drop upload", () => {
  it("uploads files dropped onto the field", async () => {
    const { onChange } = renderField({ images: [] });

    const zone = screen.getByText("Upload").closest("div")!.parentElement!;
    fireEvent.drop(zone, { dataTransfer: fileDataTransfer([imageFile("one.png")]) });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
  });

  it("uploads every file when several are dropped at once", async () => {
    const { onChange } = renderField({ images: [] });

    const zone = screen.getByText("Upload").closest("div")!.parentElement!;
    fireEvent.drop(zone, {
      dataTransfer: fileDataTransfer([imageFile("a.png"), imageFile("b.png"), imageFile("c.png")]),
    });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    // One combined update, not three racing appends off the same stale array.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(3);
  });

  it("rejects a dropped file of an unsupported type", async () => {
    const { onChange } = renderField({ images: [] });

    const zone = screen.getByText("Upload").closest("div")!.parentElement!;
    fireEvent.drop(zone, {
      dataTransfer: fileDataTransfer([imageFile("notes.pdf", "application/pdf")]),
    });

    await waitFor(() =>
      expect(screen.getByText(/Only JPG, PNG and WebP/)).toBeInTheDocument()
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("refuses to exceed maxImages on a bulk drop", async () => {
    const { onChange } = renderField({ images: IMAGES, maxImages: 4 });

    const zone = screen.getAllByLabelText(/^Image \d of 3$/)[0].parentElement!.parentElement!;
    fireEvent.drop(zone, {
      dataTransfer: fileDataTransfer([imageFile("a.png"), imageFile("b.png"), imageFile("c.png")]),
    });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    // Only the single free slot is filled.
    expect(onChange.mock.calls[0][0]).toHaveLength(4);
    expect(screen.getByText(/exceeded the 4-image limit/)).toBeInTheDocument();
  });

  it("shows a drop affordance while files are dragged over", () => {
    renderField({ images: [] });

    const zone = screen.getByText("Upload").closest("div")!.parentElement!;
    fireEvent.dragEnter(zone, { dataTransfer: fileDataTransfer([imageFile("a.png")]) });

    expect(screen.getByText("Drop images to upload")).toBeInTheDocument();

    fireEvent.dragLeave(zone, { dataTransfer: fileDataTransfer([imageFile("a.png")]) });
    expect(screen.queryByText("Drop images to upload")).not.toBeInTheDocument();
  });

  it("hides the upload control once the cap is reached", () => {
    renderField({ images: IMAGES, maxImages: 3 });

    expect(screen.queryByText("Upload")).not.toBeInTheDocument();
    expect(screen.getByText("Maximum of 3 images reached.")).toBeInTheDocument();
  });

  it("accepts multiple files from the file picker too", async () => {
    const { onChange } = renderField({ images: [] });

    const input = screen.getByText("Upload").closest("label")!.querySelector("input")!;
    expect(input).toHaveAttribute("multiple");

    fireEvent.change(input, { target: { files: [imageFile("a.png"), imageFile("b.png")] } });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0]).toHaveLength(2);
  });
});

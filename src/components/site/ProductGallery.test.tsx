import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ProductGallery } from "./ProductGallery";

const IMAGES = ["/uploads/a.jpg", "/uploads/b.jpg", "/uploads/c.jpg"];
const ALT = "Sandalwood Agarbatti Cycle at Chaitanya Stores Sangmeshwar";

function renderGallery(images = IMAGES) {
  return render(<ProductGallery images={images} alt={ALT} />);
}

function mainImage() {
  return screen.getByRole("button", { name: `${ALT} — open full screen` });
}

function openLightbox() {
  fireEvent.click(mainImage());
  return screen.getByRole("dialog");
}

function currentSrc(container: HTMLElement) {
  // next/image rewrites `src`, but the underlying file path survives in it
  // for these unoptimized upload paths — assert on a substring rather than
  // an exact match so the test isn't coupled to that rewriting.
  return within(container).getAllByRole("img")[0].getAttribute("src") ?? "";
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("ProductGallery — main image and thumbnails", () => {
  it("shows the empty state when a product has no images", () => {
    renderGallery([]);

    expect(screen.getByText("No image yet")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a thumbnail for every image", () => {
    renderGallery();

    expect(screen.getByRole("button", { name: "Show image 1 of 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show image 2 of 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show image 3 of 3" })).toBeInTheDocument();
  });

  it("omits the thumbnail strip for a single-image product", () => {
    renderGallery(["/uploads/only.jpg"]);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("swaps the main image when a thumbnail is clicked", () => {
    const { container } = renderGallery();

    expect(currentSrc(container)).toContain("a.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Show image 3 of 3" }));

    expect(currentSrc(container)).toContain("c.jpg");
  });

  it("marks the active thumbnail with aria-current", () => {
    renderGallery();

    fireEvent.click(screen.getByRole("button", { name: "Show image 2 of 3" }));

    expect(screen.getByRole("button", { name: "Show image 2 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(screen.getByRole("button", { name: "Show image 1 of 3" })).toHaveAttribute(
      "aria-current",
      "false"
    );
  });

  it("distinguishes each image's alt text by position when there are several", () => {
    renderGallery();

    expect(screen.getByAltText(`${ALT} — image 1 of 3`)).toBeInTheDocument();
  });

  it("uses the bare alt text when there is only one image to describe", () => {
    renderGallery(["/uploads/only.jpg"]);

    expect(screen.getByAltText(ALT)).toBeInTheDocument();
  });
});

describe("ProductGallery — lightbox", () => {
  it("opens on main-image click and closes on the close button", () => {
    renderGallery();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    openLightbox();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close image viewer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes exactly one control named 'Close image viewer'", () => {
    renderGallery();
    openLightbox();

    // The backdrop is a plain div precisely so it doesn't duplicate this name.
    expect(screen.getAllByRole("button", { name: "Close image viewer" })).toHaveLength(1);
  });

  it("closes on Escape", () => {
    renderGallery();
    openLightbox();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("advances and rewinds with the arrow keys, wrapping at both ends", () => {
    renderGallery();
    const dialog = openLightbox();

    expect(currentSrc(dialog)).toContain("a.jpg");

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(currentSrc(screen.getByRole("dialog"))).toContain("b.jpg");

    // Back past the first image wraps to the last.
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(currentSrc(screen.getByRole("dialog"))).toContain("c.jpg");
  });

  it("navigates with the on-screen previous/next buttons", () => {
    renderGallery();
    openLightbox();

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(currentSrc(screen.getByRole("dialog"))).toContain("b.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(currentSrc(screen.getByRole("dialog"))).toContain("a.jpg");
  });

  it("shows a position counter", () => {
    renderGallery();
    openLightbox();

    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("hides the navigation controls and counter for a single image", () => {
    renderGallery(["/uploads/only.jpg"]);
    openLightbox();

    expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });

  it("keeps the thumbnail selection in sync with lightbox navigation", () => {
    const { container } = renderGallery();
    openLightbox();

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    fireEvent.keyDown(document, { key: "Escape" });

    // The main image reflects where the visitor left off, rather than
    // snapping back to the first image.
    expect(currentSrc(container)).toContain("b.jpg");
  });

  it("locks body scroll while open and restores it on close", () => {
    renderGallery();

    openLightbox();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });

  it("returns focus to the main image after closing", () => {
    renderGallery();
    const opener = mainImage();
    opener.focus();

    openLightbox();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.activeElement).toBe(opener);
  });

  it("is exposed as a modal dialog to assistive technology", () => {
    renderGallery();
    const dialog = openLightbox();

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(`${ALT} — image viewer`);
  });
});

describe("ProductGallery — touch swipe", () => {
  function swipe(target: HTMLElement, fromX: number, toX: number) {
    fireEvent.touchStart(target, { touches: [{ clientX: fromX }] });
    fireEvent.touchEnd(target, { changedTouches: [{ clientX: toX }] });
  }

  it("advances on a leftward swipe", () => {
    const { container } = renderGallery();

    swipe(mainImage(), 200, 100);

    expect(currentSrc(container)).toContain("b.jpg");
  });

  it("goes back on a rightward swipe, wrapping to the last image", () => {
    const { container } = renderGallery();

    swipe(mainImage(), 100, 200);

    expect(currentSrc(container)).toContain("c.jpg");
  });

  it("ignores a drag too short to be a deliberate swipe", () => {
    const { container } = renderGallery();

    swipe(mainImage(), 200, 180);

    expect(currentSrc(container)).toContain("a.jpg");
  });

  it("ignores swipes on a single-image product", () => {
    const { container } = renderGallery(["/uploads/only.jpg"]);

    swipe(mainImage(), 200, 100);

    expect(currentSrc(container)).toContain("only.jpg");
  });
});

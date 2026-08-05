import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FestivalBannerModal } from "./FestivalBannerModal";

const imageBanner = {
  id: "banner-1",
  label: "Happy Diwali 2026",
  mediaType: "IMAGE" as const,
  mediaPath: "/uploads/diwali.jpg",
};

const videoBanner = {
  id: "banner-2",
  label: "Diwali Offer",
  mediaType: "VIDEO" as const,
  mediaPath: "/uploads/offer.mp4",
};

const DISMISSED_KEY = "dismissedFestivalBannerId";

describe("FestivalBannerModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders nothing when there is no banner", () => {
    const { container } = render(<FestivalBannerModal banner={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the banner on first visit and renders an image for mediaType IMAGE", async () => {
    render(<FestivalBannerModal banner={imageBanner} />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: imageBanner.label })).toBeInTheDocument();
    });
  });

  it("renders a <video> element for mediaType VIDEO", async () => {
    const { container } = render(<FestivalBannerModal banner={videoBanner} />);

    await waitFor(() => {
      expect(container.querySelector("video")).toBeInTheDocument();
    });
    expect(container.querySelector(`video[src="${videoBanner.mediaPath}"]`)).toBeInTheDocument();
  });

  it("does not show a banner the visitor already dismissed", () => {
    localStorage.setItem(DISMISSED_KEY, imageBanner.id);

    render(<FestivalBannerModal banner={imageBanner} />);

    expect(screen.queryByRole("img", { name: imageBanner.label })).not.toBeInTheDocument();
  });

  it("shows a different (newly uploaded) banner even if a previous one was dismissed", async () => {
    localStorage.setItem(DISMISSED_KEY, imageBanner.id);

    render(<FestivalBannerModal banner={videoBanner} />);

    await waitFor(() => {
      expect(document.querySelector("video")).toBeInTheDocument();
    });
  });

  it("records the dismissal in localStorage when the close button is clicked", async () => {
    render(<FestivalBannerModal banner={imageBanner} />);
    await waitFor(() => screen.getByRole("img", { name: imageBanner.label }));

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(localStorage.getItem(DISMISSED_KEY)).toBe(imageBanner.id);
  });

  it("records the dismissal when the backdrop is clicked", async () => {
    const { container } = render(<FestivalBannerModal banner={imageBanner} />);
    await waitFor(() => screen.getByRole("img", { name: imageBanner.label }));

    const backdrop = container.querySelector(".bg-charcoal\\/70");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);

    expect(localStorage.getItem(DISMISSED_KEY)).toBe(imageBanner.id);
  });

  it("pauses a playing video immediately when the close button is clicked, so sound doesn't linger after the modal closes", async () => {
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    render(<FestivalBannerModal banner={videoBanner} />);
    // Wait for the accessible close button, not just the raw <video> element
    // — the video mounts immediately but stays aria-hidden until the fade-in
    // flips `visible` on the next frame, so querying by role naturally waits
    // for that flip instead of clicking too early.
    await waitFor(() => expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(pauseSpy).toHaveBeenCalledTimes(1);
    pauseSpy.mockRestore();
  });

  it("pauses a playing video when the backdrop is clicked", async () => {
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const { container } = render(<FestivalBannerModal banner={videoBanner} />);
    // Wait for the accessible close button, not just the raw <video> element
    // — the video mounts immediately but stays aria-hidden until the fade-in
    // flips `visible` on the next frame, so querying by role naturally waits
    // for that flip instead of clicking too early.
    await waitFor(() => expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument());

    fireEvent.click(container.querySelector(".bg-charcoal\\/70") as Element);

    expect(pauseSpy).toHaveBeenCalledTimes(1);
    pauseSpy.mockRestore();
  });

  it("unmounts the modal (removing the video from the DOM) after the fade-out completes", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const { container } = render(<FestivalBannerModal banner={videoBanner} />);
    // Wait for the accessible close button, not just the raw <video> element
    // — the video mounts immediately but stays aria-hidden until the fade-in
    // flips `visible` on the next frame, so querying by role naturally waits
    // for that flip instead of clicking too early.
    await waitFor(() => expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => expect(container.querySelector("video")).not.toBeInTheDocument());
    vi.restoreAllMocks();
  });
});

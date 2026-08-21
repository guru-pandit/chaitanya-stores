import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { VideoUploadField } from "./VideoUploadField";
import { stubXMLHttpRequest } from "@/test/mockXhr";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderField(props: Partial<React.ComponentProps<typeof VideoUploadField>> = {}) {
  const onChange = vi.fn();
  render(<VideoUploadField videoPath="" onChange={onChange} {...props} />, { wrapper });
  return { onChange };
}

function videoFile(name = "clip.mp4", type = "video/mp4") {
  return new File(["fake"], name, { type });
}

function fileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function selectFile(file: File) {
  fireEvent.change(fileInput(), { target: { files: [file] } });
}

// stubXMLHttpRequest resolves on the next microtask, too fast to observe an
// in-flight `isPending` state deterministically. This variant leaves
// resolution under the test's control so progress/pending assertions aren't
// racing the mock's own auto-resolve.
function deferredXhr() {
  const state: {
    upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null };
    onload: (() => void) | null;
    status: number;
    responseText: string;
  } = {
    upload: { onprogress: null },
    onload: null,
    status: 0,
    responseText: "",
  };

  class MockXHR {
    upload = state.upload;
    onerror: (() => void) | null = null;
    get onload() {
      return state.onload;
    }
    set onload(fn: (() => void) | null) {
      state.onload = fn;
    }
    get status() {
      return state.status;
    }
    get responseText() {
      return state.responseText;
    }
    open() {}
    send() {}
  }

  vi.stubGlobal("XMLHttpRequest", MockXHR);

  return {
    reportProgress(percent: number) {
      state.upload.onprogress?.({ lengthComputable: true, loaded: percent, total: 100 });
    },
    resolve(body: unknown, status = 200) {
      state.status = status;
      state.responseText = JSON.stringify(body);
      state.onload?.();
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
});

describe("VideoUploadField — happy path", () => {
  it("shows the upload affordance with no progress bar before anything is selected", () => {
    renderField();

    expect(screen.getByText("Upload video")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("uploads the selected file and calls onChange with the returned path", async () => {
    stubXMLHttpRequest({ status: 200, body: { path: "/uploads/clip123.mp4" } });
    const { onChange } = renderField();

    selectFile(videoFile());

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("/uploads/clip123.mp4"));
  });

  it("renders the uploaded video with playback controls once onChange updates videoPath", () => {
    const { rerender } = render(<VideoUploadField videoPath="" onChange={vi.fn()} />, { wrapper });
    rerender(<VideoUploadField videoPath="/uploads/clip123.mp4" onChange={vi.fn()} />);

    const video = document.querySelector("video");
    expect(video).toHaveAttribute("src", "/uploads/clip123.mp4");
    expect(video).toHaveAttribute("controls");
  });

  it("deletes the video and clears the field when Remove is clicked", async () => {
    const { onChange } = renderField({ videoPath: "/uploads/old.mp4" });

    fireEvent.click(screen.getByLabelText("Remove video"));

    expect(onChange).toHaveBeenCalledWith("");
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/upload",
        expect.objectContaining({ method: "DELETE", body: JSON.stringify({ path: "/uploads/old.mp4" }) })
      )
    );
  });
});

describe("VideoUploadField — upload progress", () => {
  it("shows a circular progress indicator in place of the upload icon while the upload is in flight, and reflects reported progress", async () => {
    const xhr = deferredXhr();
    renderField();

    selectFile(videoFile());
    await waitFor(() => expect(screen.getByRole("progressbar")).toBeInTheDocument());
    expect(screen.queryByText("Upload video")).not.toBeInTheDocument();

    xhr.reportProgress(30);
    await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "30"));
  });

  it("removes the progress indicator once the upload finishes", async () => {
    const xhr = deferredXhr();
    const { onChange } = renderField();

    selectFile(videoFile());
    await waitFor(() => expect(screen.getByRole("progressbar")).toBeInTheDocument());

    xhr.resolve({ path: "/uploads/clip123.mp4" });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("/uploads/clip123.mp4"));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

describe("VideoUploadField — errors", () => {
  it("shows the server's error message and does not call onChange when the upload is rejected", async () => {
    stubXMLHttpRequest({ status: 400, body: { error: "File exceeds 20MB limit" } });
    const { onChange } = renderField();

    selectFile(videoFile());

    await waitFor(() => expect(screen.getByText("File exceeds 20MB limit")).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

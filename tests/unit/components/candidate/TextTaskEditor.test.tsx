import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TextTaskEditor from "@/components/candidate/TextTaskEditor";

function draftKey(taskId: number) {
  return `simuhire:candidate:draft:text:${taskId}`;
}

describe("TextTaskEditor", () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.resetAllMocks();
  });

  it("loads an existing draft from sessionStorage on mount", () => {
    sessionStorage.setItem(draftKey(101), "hello draft");

    render(
      <TextTaskEditor taskId={101} onSubmit={async () => {}} disabled={false} submitError={null} />
    );

    expect(screen.getByRole("textbox")).toHaveValue("hello draft");
  });

  it("Save draft persists current textarea value to sessionStorage", () => {
    render(
      <TextTaskEditor taskId={202} onSubmit={async () => {}} disabled={false} submitError={null} />
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "draft content" } });
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));

    expect(sessionStorage.getItem(draftKey(202))).toBe("draft content");
  });

  it("Submit trims input, calls onSubmit, and clears the saved draft on success", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    sessionStorage.setItem(draftKey(303), "old draft");

    render(
      <TextTaskEditor taskId={303} onSubmit={onSubmit} disabled={false} submitError={null} />
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   hello world   " } });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith("hello world");
    });

    expect(sessionStorage.getItem(draftKey(303))).toBeNull();
  });

  it("empty submission shows validation error and does not call onSubmit", () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <TextTaskEditor taskId={404} onSubmit={onSubmit} disabled={false} submitError={null} />
    );

    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/please enter an answer before submitting/i)).toBeInTheDocument();
  });
});

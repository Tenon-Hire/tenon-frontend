import { render, screen } from "@testing-library/react";
import TaskProgress from "./TaskProgress";

describe("TaskProgress", () => {
  it("marks completed, current, and locked days correctly", () => {
    render(<TaskProgress completedCount={2} currentDayIndex={3} totalDays={5} />);

    expect(screen.getByText("Day 1").nextElementSibling).toHaveTextContent("Completed");
    expect(screen.getByText("Day 2").nextElementSibling).toHaveTextContent("Completed");
    expect(screen.getByText("Day 3").nextElementSibling).toHaveTextContent("Current");
    expect(screen.getByText("Day 4").nextElementSibling).toHaveTextContent("Locked");
    expect(screen.getByText("Day 5").nextElementSibling).toHaveTextContent("Locked");
  });

  it("treats current day as current even if completed count is lower", () => {
    render(<TaskProgress completedCount={0} currentDayIndex={2} totalDays={3} />);

    expect(screen.getByText("Day 1").nextElementSibling).toHaveTextContent("Locked");
    expect(screen.getByText("Day 2").nextElementSibling).toHaveTextContent("Current");
    expect(screen.getByText("Day 3").nextElementSibling).toHaveTextContent("Locked");
  });
});

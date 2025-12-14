import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CodeEditor from "./CodeEditor";

type MonacoMockProps = {
  value?: string;
  onChange?: (value?: string) => void;
  loading?: React.ReactNode;
};

type LoaderModule = {
  config: (args: { paths: { vs: string } }) => void;
};

jest.mock("@monaco-editor/loader", () => ({
  __esModule: true,
  default: { config: jest.fn() } satisfies LoaderModule,
}));

jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: function MockMonacoEditor({ value, onChange, loading }: MonacoMockProps) {
    return (
      <div>
        {loading}
        <textarea
          data-testid="monaco-mock"
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    );
  },
}));

jest.mock("next/dynamic", () => {
  return (_importer: unknown) => {
    return function DynamicMock(props: MonacoMockProps) {
      const mod = jest.requireMock("@monaco-editor/react") as {
        default: (p: MonacoMockProps) => React.ReactElement;
      };
      const Comp = mod.default;
      return <Comp {...props} />;
    };
  };
});

describe("CodeEditor", () => {
  it("renders and calls onChange when typing", () => {
    const onChange = jest.fn() as unknown as (v: string) => void;

    render(<CodeEditor value={"console.log('hi')\n"} onChange={onChange} language="typescript" />);

    const textarea = screen.getByTestId("monaco-mock") as HTMLTextAreaElement;
    expect(textarea.value).toContain("console.log('hi')");

    fireEvent.change(textarea, { target: { value: "updated\n" } });

    expect((onChange as unknown as jest.Mock).mock.calls[0]?.[0]).toBe("updated\n");
  });

  it("shows loading placeholder while editor loads (mocked)", () => {
    render(<CodeEditor value={"x"} onChange={() => {}} language="typescript" />);
    expect(screen.getByText(/Loading editor/i)).toBeInTheDocument();
  });
});

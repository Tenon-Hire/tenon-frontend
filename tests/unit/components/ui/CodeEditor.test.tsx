import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CodeEditor, {
  __ensureMonacoConfiguredForTest,
  __resetMonacoConfiguredForTest,
} from '@/components/ui/CodeEditor';
import loaderModule from '@monaco-editor/loader';

type MonacoMockProps = {
  value?: string;
  onChange?: (value?: string) => void;
  loading?: React.ReactNode;
};

jest.mock('@monaco-editor/loader', () => ({
  __esModule: true,
  default: { config: jest.fn() },
}));

jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: function MockMonacoEditor({
    value,
    onChange,
    loading,
  }: MonacoMockProps) {
    return (
      <div>
        {loading}
        <textarea
          data-testid="monaco-mock"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    );
  },
}));

jest.mock('next/dynamic', () => {
  return () => {
    return function DynamicMock(props: MonacoMockProps) {
      const mod = jest.requireMock('@monaco-editor/react') as {
        default: (p: MonacoMockProps) => React.ReactElement;
      };
      const Comp = mod.default;
      return <Comp {...props} />;
    };
  };
});

describe('CodeEditor', () => {
  beforeEach(() => {
    __resetMonacoConfiguredForTest();
  });

  it('renders and calls onChange when typing', () => {
    const onChange = jest.fn<void, [string]>();

    render(
      <CodeEditor
        value={"console.log('hi')\n"}
        onChange={onChange}
        language="typescript"
      />,
    );

    const textarea = screen.getByTestId('monaco-mock') as HTMLTextAreaElement;
    expect(textarea.value).toContain("console.log('hi')");

    fireEvent.change(textarea, { target: { value: 'updated\n' } });

    expect(onChange).toHaveBeenCalledWith('updated\n');
  });

  it('shows loading placeholder while editor loads (mocked)', () => {
    render(
      <CodeEditor value={'x'} onChange={() => {}} language="typescript" />,
    );
    expect(screen.getByText(/Loading editor/i)).toBeInTheDocument();
  });

  it('configures monaco once on mount and skips on server', () => {
    const configSpy = jest.spyOn(loaderModule, 'config');

    render(
      <CodeEditor value={'x'} onChange={() => {}} language="typescript" />,
    );
    render(
      <CodeEditor value={'y'} onChange={() => {}} language="typescript" />,
    );

    expect(configSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('coerces undefined editor values to empty string on change', () => {
    const onChange = jest.fn<void, [string]>();
    render(
      <CodeEditor value={'x'} onChange={onChange} language="javascript" />,
    );

    const textarea = screen.getByTestId('monaco-mock') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('does not configure monaco when window is missing', () => {
    const originalWindow = (global as unknown as { window?: Window }).window;
    delete (global as unknown as { window?: Window }).window;

    const configSpy = jest.spyOn(loaderModule, 'config');
    const before = configSpy.mock.calls.length;
    expect(() => __ensureMonacoConfiguredForTest()).not.toThrow();
    expect(configSpy.mock.calls.length).toBe(before);

    (global as unknown as { window?: Window }).window = originalWindow;
  });

  it('short-circuits configuration when already configured', () => {
    const configSpy = jest.spyOn(loaderModule, 'config');
    __ensureMonacoConfiguredForTest();
    configSpy.mockClear();

    __ensureMonacoConfiguredForTest();

    expect(configSpy).not.toHaveBeenCalled();
  });
});

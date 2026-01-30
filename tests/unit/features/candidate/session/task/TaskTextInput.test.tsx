import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskTextInput } from '@/features/candidate/session/task/components/TaskTextInput';

describe('TaskTextInput', () => {
  it('renders markdown preview when toggled', () => {
    render(
      <TaskTextInput
        value={'# Title\n\n- item one\n\n**bold** and *italic*'}
        onChange={jest.fn()}
        disabled={false}
        savedAt={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    expect(
      screen.getByRole('heading', { name: 'Title', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('item one')).toBeInTheDocument();
    expect(document.querySelector('strong')?.textContent).toBe('bold');
    expect(document.querySelector('em')?.textContent).toBe('italic');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows empty-state guidance in preview', () => {
    render(
      <TaskTextInput
        value=""
        onChange={jest.fn()}
        disabled={false}
        savedAt={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    expect(
      screen.getByText(/Add content to preview your Markdown formatting/i),
    ).toBeInTheDocument();
  });

  it('keeps write mode as default and respects disabled/saved flags', () => {
    render(
      <TaskTextInput
        value="draft"
        onChange={jest.fn()}
        disabled={true}
        savedAt={null}
      />,
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
    expect(screen.queryByText(/Draft saved/i)).toBeNull();
    expect(screen.getByText(/characters/)).toHaveTextContent('5');
  });

  it('switches back to write mode and calls onChange', () => {
    function Wrapper() {
      const [value, setValue] = React.useState('hello');
      return (
        <TaskTextInput
          value={value}
          onChange={(next) => {
            setValue(next);
          }}
          disabled={false}
          savedAt={Date.now()}
        />
      );
    }

    render(<Wrapper />);

    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    fireEvent.click(screen.getByRole('button', { name: /write/i }));

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'updated text' } });

    expect(screen.getByText(/Draft saved/i)).toBeInTheDocument();
    expect(screen.getByText(/characters/)).toHaveTextContent('12');
  });
});

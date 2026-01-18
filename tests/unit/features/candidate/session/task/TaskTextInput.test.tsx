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
});

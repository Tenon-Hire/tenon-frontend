import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskTextInput } from '@/features/candidate/session/task/components/TaskTextInput';

describe('TaskTextInput additional coverage', () => {
  it('toggles between write and preview modes and shows saved indicator', () => {
    const handleChange = jest.fn();
    render(
      <TaskTextInput
        value="**bold** content"
        onChange={handleChange}
        disabled={false}
        savedAt={Date.now()}
      />,
    );

    // Write mode change
    const textarea = screen.getByPlaceholderText(/Write your response/);
    fireEvent.change(textarea, { target: { value: 'next' } });
    expect(handleChange).toHaveBeenCalledWith('next');

    // Switch to preview
    fireEvent.click(screen.getByRole('button', { name: /Preview/i }));
    expect(
      screen.queryByText(/Add content to preview your Markdown formatting./i),
    ).toBeNull();
    expect(screen.getByText('bold', { exact: false })).toBeInTheDocument();

    // Saved indicator
    expect(screen.getByText(/Draft saved/i)).toBeInTheDocument();
  });

  it('disables input when disabled flag set', () => {
    const handleChange = jest.fn();
    render(
      <TaskTextInput
        value=""
        onChange={handleChange}
        disabled
        savedAt={null}
      />,
    );
    expect(
      screen.getByPlaceholderText(/Write your response/),
    ).toBeDisabled();
  });
});

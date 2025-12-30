import { render, screen } from '@testing-library/react';
import Input from '@/components/ui/Input';

describe('Input', () => {
  it('applies base and custom classes', () => {
    render(<Input aria-label="field" className="extra" defaultValue="text" />);

    const input = screen.getByLabelText('field');
    expect(input).toHaveClass('extra');
    expect(input).toHaveClass('rounded-md');
    expect(input).toHaveValue('text');
  });
});

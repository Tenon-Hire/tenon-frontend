import { render, screen } from '@testing-library/react';
import Input from '@/shared/ui/Input';

describe('Input', () => {
  it('applies base and custom classes', () => {
    render(<Input aria-label="field" className="extra" defaultValue="text" />);

    const input = screen.getByLabelText('field');
    expect(input).toHaveClass('extra');
    expect(input).toHaveClass('rounded-md');
    expect(input).toHaveValue('text');
  });

  it('uses base classes when no custom class provided', () => {
    render(<Input aria-label="blank" />);
    const input = screen.getByLabelText('blank');
    expect(input.className).toMatch(/rounded-md/);
  });
});

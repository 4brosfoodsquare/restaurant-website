import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderStatusStepper } from '../OrderStatusStepper.jsx';

describe('OrderStatusStepper', () => {
  it('renders all five lifecycle steps', () => {
    render(<OrderStatusStepper status="new" />);
    for (const label of ['Received', 'Accepted', 'Preparing', 'Ready', 'Completed']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('marks steps before the current one as done and the current one as current', () => {
    const { container } = render(<OrderStatusStepper status="preparing" />);
    const steps = container.querySelectorAll('.order-stepper__step');
    expect(steps[0]).toHaveClass('order-stepper__step--done'); // Received
    expect(steps[1]).toHaveClass('order-stepper__step--done'); // Accepted
    expect(steps[2]).toHaveClass('order-stepper__step--current'); // Preparing
    expect(steps[3]).toHaveClass('order-stepper__step--upcoming'); // Ready
    expect(steps[4]).toHaveClass('order-stepper__step--upcoming'); // Completed
  });

  it('renders a distinct cancelled state instead of the step list', () => {
    render(<OrderStatusStepper status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByText('Received')).not.toBeInTheDocument();
  });

  it('marks every step done when the order is completed', () => {
    const { container } = render(<OrderStatusStepper status="completed" />);
    const steps = container.querySelectorAll('.order-stepper__step');
    expect(steps[3]).toHaveClass('order-stepper__step--done');
    expect(steps[4]).toHaveClass('order-stepper__step--current');
  });
});

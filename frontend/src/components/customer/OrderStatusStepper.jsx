import './OrderStatusStepper.css';

const STEPS = [
  { key: 'new', label: 'Received' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
];

export function OrderStatusStepper({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="order-stepper order-stepper--cancelled" role="status">
        <span className="badge badge-danger">Cancelled</span>
        <p>This order has been cancelled.</p>
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((step) => step.key === status);

  return (
    <ol className="order-stepper" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const state = index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming';
        return (
          <li key={step.key} className={`order-stepper__step order-stepper__step--${state}`}>
            <span className="order-stepper__dot" aria-hidden="true">
              {state === 'done' ? '✓' : index + 1}
            </span>
            <span className="order-stepper__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

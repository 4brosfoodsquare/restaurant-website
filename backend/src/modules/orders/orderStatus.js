/**
 * Order lifecycle: new -> accepted -> preparing -> ready -> completed.
 * Cancelled is reachable from any non-terminal state. completed/cancelled
 * are terminal — nothing transitions out of them. This is enforced here,
 * not left to the caller, so an invalid transition can never reach the DB.
 */
export const ORDER_STATUSES = ['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
const TERMINAL_STATUSES = new Set(['completed', 'cancelled']);

const ALLOWED_TRANSITIONS = {
  new: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function allowedNextStatuses(from) {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

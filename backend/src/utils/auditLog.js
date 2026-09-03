import { getDb } from '../db/index.js';

/** Best-effort audit trail for security-relevant and business-critical actions. */
export function recordAudit({ actorId = null, actorEmail = '', action, entity, entityId = null, detail = '', ip = '' }) {
  try {
    getDb()
      .prepare(
        `INSERT INTO audit_logs (actor_id, actor_email, action, entity, entity_id, detail, ip)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(actorId, actorEmail, action, entity, entityId === null ? null : String(entityId), detail, ip);
  } catch (error) {
    console.error('[audit] failed to record entry:', error.message);
  }
}

import { pathToFileURL } from 'node:url';
import { getDb } from './index.js';
import { runMigrations } from './migrate.js';
import config from '../config/env.js';
import { hashPassword } from '../utils/password.js';

/**
 * Bootstrap data: the owner account, default settings, and the three
 * signature categories. Contact details are still clearly-marked
 * placeholders — see docs/BUSINESS_INFO_NEEDED.md. No menu items or prices
 * are invented here; those are the restaurant's to enter in Admin → Menu.
 * This script is idempotent: re-running it will not duplicate rows.
 */
async function seed() {
  runMigrations({ silent: true });
  const db = getDb();

  // --- Owner account -------------------------------------------------------
  const existingOwner = db
    .prepare('SELECT id FROM users WHERE email_norm = ?')
    .get(config.seed.adminEmail.toLowerCase());

  if (!existingOwner) {
    const ownerRole = db.prepare('SELECT id FROM roles WHERE key = ?').get('owner');
    const passwordHash = await hashPassword(config.seed.adminPassword);
    db.prepare(
      `INSERT INTO users (email, email_norm, name, password_hash, role_id)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      config.seed.adminEmail,
      config.seed.adminEmail.toLowerCase(),
      config.seed.adminName,
      passwordHash,
      ownerRole.id,
    );
    console.log(`[seed] created owner account: ${config.seed.adminEmail}`);
  } else {
    console.log('[seed] owner account already exists — skipped');
  }

  // --- Restaurant settings (placeholders; edit in Admin → Settings) -------
  const settingsDefaults = {
    restaurant_name: '4 Bros Food Square',
    tagline: 'Few dishes. Made with care.',
    description:
      'Biriyani, kabab and chilli chicken, cooked with masalas we make ourselves. A short menu, so every plate gets the attention it deserves.',
    phone: '+91 00000 00000',
    email: 'orders@example.com',
    address_line1: '[Address line 1 — placeholder]',
    address_line2: '[Area, City — placeholder]',
    address_postcode: '000000',
    hours: JSON.stringify({
      mon: '18:00-23:00', tue: '18:00-23:00', wed: '18:00-23:00', thu: '18:00-23:00',
      fri: '18:00-23:00', sat: '18:00-23:00', sun: '18:00-23:00',
    }),
    order_types_enabled: JSON.stringify(['pickup', 'delivery']),
    delivery_fee_minor: '0',
    tax_rate_bps: '0',
    min_order_minor: '0',
    social_instagram: '',
    social_facebook: '',
  };

  const upsertSetting = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO NOTHING`,
  );
  for (const [key, value] of Object.entries(settingsDefaults)) {
    upsertSetting.run(key, value);
  }
  console.log('[seed] restaurant settings ensured');

  // --- The three signature offerings ---------------------------------------
  // Deliberately three, and only three. The focused menu is part of the
  // brand, not a gap waiting to be filled. Descriptions assert only what the
  // restaurant has confirmed (homemade food, homemade masalas) plus each
  // dish's own generic identity — no invented preparation methods, origins
  // or history. The owner edits all of this in Admin → Categories.
  const categories = [
    { slug: 'biriyani', name: 'Biriyani', signature: true, sort: 1,
      description: 'Rice, meat and our own homemade masalas.' },
    { slug: 'kabab', name: 'Kabab', signature: true, sort: 2,
      description: 'Grilled, and marinated in masalas we make ourselves.' },
    { slug: 'chilli-chicken', name: 'Chilli Chicken', signature: true, sort: 3,
      description: 'Indo-Chinese, spiced with our own homemade blends.' },
  ];

  const insertCategory = db.prepare(
    `INSERT INTO categories (slug, name, description, is_signature, sort_order)
     VALUES (@slug, @name, @description, @signature, @sort)
     ON CONFLICT(slug) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       is_signature = excluded.is_signature,
       sort_order = excluded.sort_order,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  );
  for (const cat of categories) {
    insertCategory.run({ ...cat, signature: cat.signature ? 1 : 0 });
  }
  console.log(`[seed] ensured ${categories.length} categories`);

  // No menu items are seeded on purpose. Real dish names, prices, portions
  // and photography come from the restaurant and get entered in
  // Admin → Menu; inventing them here would put fake prices in front of
  // customers. The three categories above carry the storefront until then,
  // and the schema is ready for items to be added without any code change.

  console.log('\n[seed] done.');
  console.log(`[seed] admin login → ${config.seed.adminEmail} / (see backend/.env SEED_ADMIN_PASSWORD)`);
}

// See the note in migrate.js: a hand-built `file://` string never matches on Windows.
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  seed()
    .catch((error) => {
      console.error('[seed] failed:', error);
      process.exitCode = 1;
    });
}

export default seed;

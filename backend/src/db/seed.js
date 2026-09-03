import path from 'node:path';
import { getDb } from './index.js';
import { runMigrations } from './migrate.js';
import config from '../config/env.js';
import { hashPassword } from '../utils/password.js';
import { slugify } from '../utils/ids.js';

/**
 * Demo/development seed data. All business details (name, address, phone,
 * prices) are clearly-marked placeholders — see docs/BUSINESS_INFO_NEEDED.md.
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
    tagline: 'Biriyani. Kabab. Chilli Chicken.',
    description:
      'A specialist Indian non-vegetarian kitchen built around three things we do better than anyone else: slow-cooked biriyani, char-grilled kababs and wok-tossed chilli chicken.',
    phone: '+91 00000 00000',
    email: 'orders@example.com',
    address_line1: '[Address line 1 — placeholder]',
    address_line2: '[Area, City — placeholder]',
    address_postcode: '000000',
    hours: JSON.stringify({
      mon: '11:00-22:30', tue: '11:00-22:30', wed: '11:00-22:30', thu: '11:00-22:30',
      fri: '11:00-23:00', sat: '11:00-23:00', sun: '11:00-23:00',
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

  // --- Categories: the three signatures first, plus supporting categories -
  const categories = [
    { slug: 'biriyani', name: 'Biriyani', signature: true, sort: 1,
      description: 'Our founding dish — long-grain rice layered and slow-dum-cooked with marinated meat and whole spices.' },
    { slug: 'kabab', name: 'Kabab', signature: true, sort: 2,
      description: 'Char-grilled skewers, marinated and cooked over open flame.' },
    { slug: 'chilli-chicken', name: 'Chilli Chicken', signature: true, sort: 3,
      description: 'Indo-Chinese wok-tossed chicken in a bold garlic-chilli sauce.' },
    { slug: 'starters', name: 'Starters', signature: false, sort: 4,
      description: 'Small plates to start the meal.' },
    { slug: 'breads', name: 'Breads', signature: false, sort: 5,
      description: 'Tandoor-baked breads.' },
    { slug: 'beverages', name: 'Beverages', signature: false, sort: 6,
      description: 'Cold drinks and traditional coolers.' },
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

  const categoryIdBySlug = Object.fromEntries(
    db.prepare('SELECT id, slug FROM categories').all().map((r) => [r.slug, r.id]),
  );

  // --- Demo menu items (placeholder names/prices — replace via Admin → Menu)
  const demoItems = [
    { name: '[Placeholder] Chicken Biriyani', category: 'biriyani', price: 24900, diet: 'non_veg', spice: 2, featured: 1, popular: 1 },
    { name: '[Placeholder] Mutton Biriyani', category: 'biriyani', price: 34900, diet: 'non_veg', spice: 2, featured: 1, popular: 0 },
    { name: '[Placeholder] Veg Biriyani', category: 'biriyani', price: 19900, diet: 'veg', spice: 1, featured: 0, popular: 0 },
    { name: '[Placeholder] Chicken Seekh Kabab', category: 'kabab', price: 21900, diet: 'non_veg', spice: 2, featured: 1, popular: 1 },
    { name: '[Placeholder] Mutton Boti Kabab', category: 'kabab', price: 29900, diet: 'non_veg', spice: 2, featured: 0, popular: 0 },
    { name: '[Placeholder] Paneer Tikka Kabab', category: 'kabab', price: 18900, diet: 'veg', spice: 1, featured: 0, popular: 0 },
    { name: '[Placeholder] Chilli Chicken (Dry)', category: 'chilli-chicken', price: 22900, diet: 'non_veg', spice: 3, featured: 1, popular: 1 },
    { name: '[Placeholder] Chilli Chicken (Gravy)', category: 'chilli-chicken', price: 23900, diet: 'non_veg', spice: 3, featured: 0, popular: 0 },
    { name: '[Placeholder] Chicken 65', category: 'starters', price: 19900, diet: 'non_veg', spice: 2, featured: 0, popular: 1 },
    { name: '[Placeholder] Butter Naan', category: 'breads', price: 4900, diet: 'veg', spice: 0, featured: 0, popular: 0 },
    { name: '[Placeholder] Masala Chaas', category: 'beverages', price: 5900, diet: 'veg', spice: 0, featured: 0, popular: 0 },
  ];

  const insertItem = db.prepare(
    `INSERT INTO menu_items
       (category_id, slug, name, description, price_minor, diet_type, spice_level, is_featured, is_popular)
     VALUES (@category_id, @slug, @name, @description, @price_minor, @diet_type, @spice_level, @featured, @popular)
     ON CONFLICT(slug) DO UPDATE SET
       category_id = excluded.category_id,
       name = excluded.name,
       price_minor = excluded.price_minor,
       diet_type = excluded.diet_type,
       spice_level = excluded.spice_level,
       is_featured = excluded.is_featured,
       is_popular = excluded.is_popular,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  );
  for (const item of demoItems) {
    insertItem.run({
      category_id: categoryIdBySlug[item.category],
      slug: slugify(item.name),
      name: item.name,
      description: 'Placeholder description — replace with the real dish description in Admin → Menu.',
      price_minor: item.price,
      diet_type: item.diet,
      spice_level: item.spice,
      featured: item.featured,
      popular: item.popular,
    });
  }
  console.log(`[seed] ensured ${demoItems.length} demo menu items`);

  console.log('\n[seed] done.');
  console.log(`[seed] admin login → ${config.seed.adminEmail} / (see backend/.env SEED_ADMIN_PASSWORD)`);
}

const isDirectRun = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;
if (isDirectRun) {
  seed()
    .catch((error) => {
      console.error('[seed] failed:', error);
      process.exitCode = 1;
    });
}

export default seed;

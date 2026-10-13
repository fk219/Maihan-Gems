/**
 * Script to run the storefront seed data
 */
import { Pool } from 'pg';
import { storefrontSeed } from './storefront-seed.js';

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
});

async function runSeed() {
  const client = await pool.connect();
  
  try {
    const existing = await client.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM products');
    if ((existing.rows[0]?.n ?? 0) > 0) {
      console.log('✓ Storefront seed skipped (products table already populated).\n');
      return;
    }

    await client.query('BEGIN');
    console.log('🌱 Seeding storefront data...\n');

    // Seed gemstones
    console.log(`Seeding ${storefrontSeed.gemstones.length} gemstones...`);
    for (const gem of storefrontSeed.gemstones) {
      const slug = gem.sku.toLowerCase().replace(/_/g, '-');
      const description = `${gem.variety || gem.stone_type} from ${gem.origin_country || 'natural sources'}`;
      
      // Insert product
      const productResult = await client.query(`
        INSERT INTO products (
          sku, slug, title, kind, description,
          pricing_mode, base_currency, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        gem.sku,
        slug,
        gem.title,
        'gemstone',
        description,
        'fixed',
        gem.currency || 'USD',
        'active'
      ]);
      
      const productId = productResult.rows[0].id;
      
      // Insert gemstone details
      await client.query(`
        INSERT INTO gemstone_details (
          product_id, quantity_type, piece_count, stone_type, variety,
          origin_type, carat_total, length_mm, width_mm, depth_mm,
          shape, cut_style, color_hue, color_trade, color_intensity,
          clarity_grade, treatment_status, treatment_details,
          origin_country, origin_region
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `, [
        productId,
        (gem as any).quantity_type || 'single',
        (gem as any).piece_count || 1,
        (gem as any).stone_type,
        (gem as any).variety || null,
        (gem as any).origin_type,
        (gem as any).carat_total || null,
        (gem as any).length_mm || null,
        (gem as any).width_mm || null,
        (gem as any).depth_mm || null,
        (gem as any).shape || null,
        (gem as any).cut_style || null,
        (gem as any).color_hue || null,
        (gem as any).color_trade || null,
        (gem as any).color_intensity || null,
        (gem as any).clarity_grade || null,
        (gem as any).treatment_status || null,
        null, // treatment_details
        (gem as any).origin_country || null,
        (gem as any).origin_region || null,
      ]);
      
      // Create variant and price
      const variantResult = await client.query(`
        INSERT INTO product_variants (product_id, sku, is_default, status)
        VALUES ($1, $2, true, 'active')
        RETURNING id
      `, [productId, gem.sku]);
      
      const variantId = variantResult.rows[0].id;
      
      // Insert price
      await client.query(`
        INSERT INTO product_prices (variant_id, currency, amount, region_code)
        VALUES ($1, $2, $3, NULL)
      `, [variantId, gem.currency || 'USD', gem.price]);
      
      // Insert inventory
      await client.query(`
        INSERT INTO inventory (variant_id, on_hand, reserved)
        VALUES ($1, 1, 0)
      `, [variantId]);
    }
    console.log(`✓ ${storefrontSeed.gemstones.length} gemstones seeded\n`);

    // Seed settings
    console.log(`Seeding ${storefrontSeed.settings.length} settings...`);
    for (const setting of storefrontSeed.settings) {
      const slug = setting.sku.toLowerCase().replace(/_/g, '-');
      
      // Insert product
      const productResult = await client.query(`
        INSERT INTO products (
          sku, slug, title, kind, description,
          pricing_mode, base_currency, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        setting.sku,
        slug,
        setting.title,
        'setting',
        `Premium ${setting.setting_for} setting in multiple metal options`,
        'fixed',
        'USD',
        'active'
      ]);
      
      const productId = productResult.rows[0].id;
      
      // Insert setting details
      await client.query(`
        INSERT INTO setting_details (
          product_id, setting_for, style, head_type, prong_count,
          shank_profile, band_width_mm, ring_size_min, ring_size_max,
          price_excludes_center
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        productId,
        setting.setting_for,
        setting.style,
        setting.head_type || null,
        setting.prong_count || null,
        setting.shank_profile || null,
        setting.band_width_mm || null,
        null, // ring_size_min
        null, // ring_size_max
        true, // price_excludes_center
      ]);
      
      // Insert accepts rules
      if (setting.accepts) {
        for (const rule of setting.accepts) {
          await client.query(`
            INSERT INTO setting_accepts (
              setting_product_id, shape, min_carat, max_carat,
              min_mm, max_mm, stone_types
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            productId,
            rule.shape,
            rule.min_carat || null,
            rule.max_carat || null,
            null, // min_mm
            null, // max_mm
            null, // stone_types
          ]);
        }
      }
      
      // Create variant and price
      const variantResult = await client.query(`
        INSERT INTO product_variants (product_id, sku, is_default, status)
        VALUES ($1, $2, true, 'active')
        RETURNING id
      `, [productId, setting.sku]);
      
      const variantId = variantResult.rows[0].id;
      
      // Insert price
      await client.query(`
        INSERT INTO product_prices (variant_id, currency, amount, region_code)
        VALUES ($1, $2, $3, NULL)
      `, [variantId, 'USD', setting.price]);
      
      // Insert inventory
      await client.query(`
        INSERT INTO inventory (variant_id, on_hand, allow_backorder)
        VALUES ($1, 100, true)
      `, [variantId]);
    }
    console.log(`✓ ${storefrontSeed.settings.length} settings seeded\n`);

    // Seed jewelry
    console.log(`Seeding ${storefrontSeed.jewelry.length} jewelry pieces...`);
    for (const jewelry of storefrontSeed.jewelry) {
      const slug = jewelry.sku.toLowerCase().replace(/_/g, '-');
      
      // Insert product
      const productResult = await client.query(`
        INSERT INTO products (
          sku, slug, title, kind, description,
          pricing_mode, base_currency, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        jewelry.sku,
        slug,
        jewelry.title,
        'jewelry',
        jewelry.description || `Beautiful ${jewelry.jewelry_type}`,
        'fixed',
        'USD',
        'active'
      ]);
      
      const productId = productResult.rows[0].id;
      
      // Insert jewelry details
      await client.query(`
        INSERT INTO jewelry_details (
          product_id, jewelry_type, metal_type, metal_purity, metal_color,
          metal_weight_g, total_carat_weight, ring_size, ring_size_system,
          chain_length_cm, chain_width_mm, setting_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        productId,
        jewelry.jewelry_type,
        jewelry.metal_type || null,
        jewelry.metal_purity || null,
        jewelry.metal_color || null,
        jewelry.metal_weight_g || null,
        jewelry.total_carat_weight || null,
        jewelry.ring_size || null,
        jewelry.ring_size_system || null,
        jewelry.chain_length_cm || null,
        null, // chain_width_mm
        null, // setting_id
      ]);
      
      // Create variant and price
      const variantResult = await client.query(`
        INSERT INTO product_variants (product_id, sku, is_default, status)
        VALUES ($1, $2, true, 'active')
        RETURNING id
      `, [productId, jewelry.sku]);
      
      const variantId = variantResult.rows[0].id;
      
      // Insert price
      await client.query(`
        INSERT INTO product_prices (variant_id, currency, amount, region_code)
        VALUES ($1, $2, $3, NULL)
      `, [variantId, 'USD', jewelry.price]);
      
      // Insert inventory
      await client.query(`
        INSERT INTO inventory (variant_id, on_hand, reserved)
        VALUES ($1, 1, 0)
      `, [variantId]);
    }
    console.log(`✓ ${storefrontSeed.jewelry.length} jewelry pieces seeded\n`);

    await client.query('COMMIT');
    console.log('✅ Storefront seed completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed().catch(error => {
  console.error(error);
  process.exit(1);
});

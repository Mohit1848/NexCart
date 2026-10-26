-- =============================================================================
-- Seed: 001_initial_seed.sql
-- Description: Realistic initial product catalog for NexCart
-- Idempotency: ON CONFLICT DO NOTHING to prevent duplicates on repeated runs
-- =============================================================================

-- 1. CATEGORIES
INSERT INTO categories (name, slug, description, image_url)
VALUES
  (
    'Electronics',
    'electronics',
    'Cutting-edge devices, gadgets, and productivity tech',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80'
  ),
  (
    'Audio & Sound',
    'audio-sound',
    'Premium wireless headphones, earbuds, and spatial audio systems',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
  ),
  (
    'Wearables',
    'wearables',
    'Smart health trackers, fitness watches, and connected accessories',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
  ),
  (
    'Workspace & Accessories',
    'accessories',
    'Ergonomic desk gear, mechanical keyboards, and charging hubs',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url;

-- 2. PRODUCTS (Linked to Categories via Category Slugs)
INSERT INTO products (category_id, name, slug, description, price, stock_quantity, image_url, is_active)
VALUES
  (
    (SELECT id FROM categories WHERE slug = 'audio-sound'),
    'AuraWave Pro ANC Headphones',
    'aurawave-pro-anc-headphones',
    'Industry-leading active noise cancellation with 40-hour battery life, high-res spatial audio, and memory-foam ear cushions.',
    8999.00,
    35,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'audio-sound'),
    'PulseBuds Air True Wireless',
    'pulsebuds-air-true-wireless',
    'Ultra-compact wireless earbuds with Bluetooth 5.4, IPX7 water resistance, transparent audio pass-through, and wireless charging case.',
    3499.00,
    50,
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'wearables'),
    'Chronos Active Smartwatch 3',
    'chronos-active-smartwatch-3',
    'AMOLED display, 24/7 heart rate and SpO2 tracking, onboard GPS, and 14-day ultra battery mode.',
    6499.00,
    28,
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'wearables'),
    'Titan Band Fitness Tracker',
    'titan-band-fitness-tracker',
    'Lightweight fitness band featuring auto-workout detection, sleep stage analysis, and water resistance up to 50 meters.',
    2199.00,
    45,
    'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'electronics'),
    'NovaView 27-inch 4K Studio Monitor',
    'novaview-27-inch-4k-studio-monitor',
    'UHD 4K IPS panel with 99% sRGB color gamut, USB-C 90W power delivery, HDR400, and tilt/height adjustable stand.',
    24999.00,
    15,
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'electronics'),
    'Apex Ultra Mini PC M2',
    'apex-ultra-mini-pc-m2',
    'Compact desktop workstation with 8-core CPU, 32GB DDR5 RAM, 1TB NVMe SSD, and quad-display 4K support.',
    38999.00,
    10,
    'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=800&q=80',
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'accessories'),
    'Keystone Tactile Mechanical Keyboard',
    'keystone-tactile-mechanical-keyboard',
    'Wireless hot-swappable mechanical keyboard with pre-lubed tactile switches, PBT double-shot keycaps, and custom RGB lighting.',
    5299.00,
    40,
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'accessories'),
    'MagFlow 3-in-1 Magnetic Charging Station',
    'magflow-3-in-1-magnetic-charging-station',
    'Fast wireless charging hub for smartphone, smartwatch, and wireless earbuds with premium aluminum alloy chassis.',
    2899.00,
    60,
    'https://images.unsplash.com/photo-1622445262464-84b14e0745b1?auto=format&fit=crop&w=800&q=80',
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock_quantity = EXCLUDED.stock_quantity,
  image_url = EXCLUDED.image_url,
  is_active = EXCLUDED.is_active;
-- Quick seed for existing schema
-- This populates the catalog schema (migrations 1-18) with sample luxury gemstones

-- Insert sample gemstone species
INSERT INTO gemstone_species (id, name, slug, mineral_group) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Sapphire', 'sapphire', 'Corundum'),
('550e8400-e29b-41d4-a716-446655440002', 'Ruby', 'ruby', 'Corundum'),
('550e8400-e29b-41d4-a716-446655440003', 'Emerald', 'emerald', 'Beryl'),
('550e8400-e29b-41d4-a716-446655440004', 'Aquamarine', 'aquamarine', 'Beryl'),
('550e8400-e29b-41d4-a716-446655440005', 'Spinel', 'spinel', 'Spinel'),
('550e8400-e29b-41d4-a716-446655440006', 'Tourmaline', 'tourmaline', 'Tourmaline')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample gemstone varieties
INSERT INTO gemstone_varieties (id, species_id, name, slug, is_primary) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Ceylon Sapphire', 'ceylon-sapphire', true),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Kashmir Sapphire', 'kashmir-sapphire', true),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Burmese Ruby', 'burmese-ruby', true),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'Colombian Emerald', 'colombian-emerald', true),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', 'Santa Maria Aquamarine', 'santa-maria-aquamarine', true),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'Paraíba Tourmaline', 'paraiba-tourmaline', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample gemstones
INSERT INTO gemstones (id, variety_id, shape, weight_ct, colour_primary, treatment_status, origin_country, price_amount, currency, state, slug, title) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'CUSHION', 3.42, 'Royal Blue', 'NONE', 'Sri Lanka', 48500.00, 'USD', 'PUBLISHED', 'ceylon-sapphire-342ct-cushion', '3.42ct Ceylon Sapphire'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'OVAL', 2.15, 'Cornflower Blue', 'NONE', 'Sri Lanka', 32000.00, 'USD', 'PUBLISHED', 'ceylon-sapphire-215ct-oval', '2.15ct Ceylon Sapphire'),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 'OVAL', 2.84, 'Pigeon Blood Red', 'NONE', 'Myanmar', 95000.00, 'USD', 'PUBLISHED', 'burmese-ruby-284ct-oval', '2.84ct Burmese Ruby'),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 'EMERALD_CUT', 2.50, 'Vivid Green', 'TRADITIONAL', 'Colombia', 42000.00, 'USD', 'PUBLISHED', 'colombian-emerald-250ct-emerald-cut', '2.50ct Colombian Emerald'),
('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440005', 'OVAL', 5.20, 'Santa Maria Blue', 'NONE', 'Brazil', 8500.00, 'USD', 'PUBLISHED', 'aquamarine-520ct-oval', '5.20ct Santa Maria Aquamarine'),
('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440006', 'CUSHION', 1.85, 'Neon Blue', 'NONE', 'Brazil', 125000.00, 'USD', 'PUBLISHED', 'paraiba-tourmaline-185ct-cushion', '1.85ct Paraíba Tourmaline'),
('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440002', 'CUSHION', 4.12, 'Vivid Blue', 'NONE', 'India', 185000.00, 'USD', 'PUBLISHED', 'kashmir-sapphire-412ct-cushion', '4.12ct Kashmir Sapphire'),
('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440003', 'ROUND', 1.50, 'Vivid Red', 'NONE', 'Myanmar', 55000.00, 'USD', 'PUBLISHED', 'burmese-ruby-150ct-round', '1.50ct Burmese Ruby'),
('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440004', 'CUSHION', 3.80, 'Deep Green', 'TRADITIONAL', 'Colombia', 68000.00, 'USD', 'PUBLISHED', 'colombian-emerald-380ct-cushion', '3.80ct Colombian Emerald'),
('770e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440001', 'OVAL', 5.67, 'Royal Blue', 'NONE', 'Sri Lanka', 82000.00, 'USD', 'PUBLISHED', 'ceylon-sapphire-567ct-oval', '5.67ct Ceylon Sapphire')
ON CONFLICT (slug) DO NOTHING;

-- Insert setting styles
INSERT INTO setting_styles (id, name, slug, description) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'Solitaire', 'solitaire', 'Classic single stone setting'),
('880e8400-e29b-41d4-a716-446655440002', 'Halo', 'halo', 'Center stone surrounded by smaller diamonds'),
('880e8400-e29b-41d4-a716-446655440003', 'Three Stone', 'three-stone', 'Past, present, future trilogy'),
('880e8400-e29b-41d4-a716-446655440004', 'Vintage', 'vintage', 'Ornate vintage-inspired design'),
('880e8400-e29b-41d4-a716-446655440005', 'Modern', 'modern', 'Contemporary minimalist design')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample settings
INSERT INTO settings (id, style_id, jewellery_type, name, slug, description) VALUES
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'RING', 'Classic Solitaire Ring', 'classic-solitaire-ring', 'Timeless 6-prong solitaire mounting'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440002', 'RING', 'Micropavé Halo Ring', 'micropave-halo-ring', 'Brilliant halo with pavé band'),
('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440003', 'RING', 'Three Stone Trilogy Ring', 'three-stone-trilogy-ring', 'Three stone design with side stones'),
('990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440001', 'PENDANT', 'Classic Pendant Mount', 'classic-pendant-mount', 'Four-prong pendant setting'),
('990e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440002', 'PENDANT', 'Halo Pendant', 'halo-pendant', 'Surrounded by pavé diamonds'),
('990e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440001', 'EARRINGS', 'Stud Earrings', 'stud-earrings', 'Four-prong martini-style studs')
ON CONFLICT (slug) DO NOTHING;

-- Insert setting variants (metal options)
INSERT INTO setting_variants (id, setting_id, metal, price_amount, currency, sku, availability) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'GOLD_18K_YELLOW', 1200.00, 'USD', 'SET-SOL-001-Y', 'IN_STOCK'),
('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', 'GOLD_18K_WHITE', 1350.00, 'USD', 'SET-SOL-001-W', 'IN_STOCK'),
('aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440001', 'PLATINUM', 1800.00, 'USD', 'SET-SOL-001-P', 'IN_STOCK'),
('aa0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440002', 'GOLD_18K_WHITE', 2400.00, 'USD', 'SET-HAL-002-W', 'IN_STOCK'),
('aa0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440002', 'PLATINUM', 2800.00, 'USD', 'SET-HAL-002-P', 'IN_STOCK'),
('aa0e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440003', 'GOLD_18K_YELLOW', 1800.00, 'USD', 'SET-TRI-003-Y', 'IN_STOCK'),
('aa0e8400-e29b-41d4-a716-446655440007', '990e8400-e29b-41d4-a716-446655440004', 'GOLD_18K_YELLOW', 850.00, 'USD', 'SET-PEN-004-Y', 'IN_STOCK'),
('aa0e8400-e29b-41d4-a716-446655440008', '990e8400-e29b-41d4-a716-446655440005', 'GOLD_18K_WHITE', 1650.00, 'USD', 'SET-PEN-005-W', 'IN_STOCK'),
('aa0e8400-e29b-41d4-a716-446655440009', '990e8400-e29b-41d4-a716-446655440006', 'GOLD_18K_YELLOW', 950.00, 'USD', 'SET-EAR-006-Y', 'IN_STOCK'),
('aa0e8400-e29b-41d4-a716-446655440010', '990e8400-e29b-41d4-a716-446655440006', 'PLATINUM', 1400.00, 'USD', 'SET-EAR-006-P', 'IN_STOCK')
ON CONFLICT (sku) DO NOTHING;

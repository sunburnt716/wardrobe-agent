-- Wardrobe Agent seed data
--
-- Non-degenerate by design: for the core structural slots (base top, bottom,
-- footwear) there are at least two clean, in-rotation garments that pass a
-- casual query (formality band 1-2) AND at least two that pass a
-- business/formal query (band 3-5), and those two sets are disjoint -- so a
-- successful get_candidates run actually had a choice to make. Bands are
-- assigned per garment instance, not per type: two oxford shirts here sit in
-- different formality bands, which is the whole reason the column lives on
-- garments (db/schema.sql).
--
-- Adversarial coverage retained from the original seed: same-type/
-- different-instance garments, a garment past its wash threshold, an
-- override threshold that flips clean/dirty vs the type default, a retired
-- garment, a never_pair exception, and both a worn outfit (with weather) and
-- a rejected outfit (with a rejection_reason).
--
-- Warmth coverage for the pre-filter (api/dal/garments.ts): the stone linen
-- trousers (warmth 1) survive only a warm forecast; the camel overcoat
-- (warmth 5) survives only a cold one -- two different garments, one at each
-- end, both non-base so the base-layer exemption doesn't hide the effect.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
INSERT INTO users (display_name, gender_identity, service_started_at) VALUES
    ('Alex Rivera', 'nonbinary', '2025-01-15');

-- ---------------------------------------------------------------------------
-- garment_types  (type-level only: layer + default wash cadence)
-- ---------------------------------------------------------------------------
INSERT INTO garment_types (name, layer, default_wears_before_wash) VALUES
    -- socks are 'accessory', not 'base': the completeness check
    -- (api/dal/outfitComposition.ts) reads "has a base garment" as "has a
    -- top", so hosiery must not live under 'base'.
    ('crew_sock',      'accessory',  1),
    ('t_shirt',        'base',       2),
    ('henley',         'base',       2),
    ('oxford_shirt',   'base',       3),
    ('merino_polo',    'base',       3),
    ('wool_sweater',   'mid',        3),
    ('cardigan',       'mid',        5),
    ('field_jacket',   'outer',     12),
    ('overcoat',       'outer',     15),
    ('rain_shell',     'outer',     10),
    ('jeans',          'bottom',     5),
    ('chinos',         'bottom',     4),
    ('wool_trousers',  'bottom',     6),
    ('linen_trousers', 'bottom',     4),
    ('sneakers',       'footwear',  20),
    ('loafers',        'footwear',  20),
    ('leather_boots',  'footwear',  20),
    ('derby_shoes',    'footwear',  25),
    ('oxford_shoe',    'footwear',  25),
    ('wool_scarf',     'accessory',  8),
    ('silk_tie',       'accessory', 10),
    ('leather_belt',   'accessory', 50),
    ('beanie',         'accessory',  6),
    ('canvas_tote',    'accessory', 30);

-- ---------------------------------------------------------------------------
-- garments
-- One VALUES row per garment; joined to the owning user and the garment_type
-- by name. Columns:
--   type_name, acquired_at, primary_color, secondary_color, texture,
--   silhouette, water_resistant, wears_since_wash, wash_override, retired_at,
--   formality_band, warmth_rating
-- ---------------------------------------------------------------------------
INSERT INTO garments (
    user_id, garment_type_id, acquired_at, primary_color, secondary_color,
    texture, silhouette, water_resistant, wears_since_wash,
    wears_before_wash_override, retired_at, formality_band, warmth_rating
)
SELECT
    u.user_id, gt.garment_type_id, v.acquired_at::date, v.primary_color,
    v.secondary_color, v.texture, v.silhouette, v.water_resistant::boolean,
    v.wears_since_wash::int, v.wash_override::int, v.retired_at::date,
    v.formality_band::smallint, v.warmth_rating::smallint
FROM (VALUES
    -- base: tops (+ the one dirty garment)
    ('oxford_shirt',  '2025-02-01', 'white',    NULL,      'poplin',       'slim',    FALSE, 0, NULL, NULL, 4, 2),
    ('oxford_shirt',  '2025-02-01', 'blue',     'white',   'oxford-weave', 'slim',    FALSE, 1, NULL, NULL, 4, 2),
    ('merino_polo',   '2024-09-12', 'navy',     NULL,      'merino-knit',  'regular', FALSE, 0, NULL, NULL, 3, 2),
    ('oxford_shirt',  '2024-11-10', 'gray',     NULL,      'flannel',      'regular', FALSE, 2, NULL, NULL, 2, 3),
    ('henley',        '2024-10-01', 'charcoal', NULL,      'waffle-knit',  'regular', FALSE, 0, NULL, NULL, 2, 3),
    ('t_shirt',       '2025-04-02', 'white',    NULL,      'jersey',       'boxy',    FALSE, 0, NULL, NULL, 1, 1),
    ('t_shirt',       '2025-04-02', 'black',    NULL,      'jersey',       'regular', FALSE, 1, NULL, NULL, 1, 2),
    ('crew_sock',     '2025-03-05', 'black',    NULL,      'cotton-blend', 'crew',    FALSE, 3, NULL, NULL, 1, 2),

    -- mid
    ('wool_sweater',  '2024-12-01', 'charcoal', NULL,      'wool-knit',    'crew-neck', FALSE, 3, 5, NULL, 3, 4),
    ('wool_sweater',  '2023-11-20', 'burgundy', NULL,      'lambswool',    'crew-neck', FALSE, 0, NULL, NULL, 2, 4),
    ('cardigan',      '2024-01-15', 'oatmeal',  NULL,      'cotton-knit',  'regular',   FALSE, 0, NULL, NULL, 3, 3),
    ('cardigan',      '2024-01-15', 'navy',     NULL,      'cotton-knit',  'regular',   FALSE, 0, NULL, NULL, 2, 3),

    -- outer
    ('overcoat',      '2022-10-05', 'camel',    NULL,      'wool-melton',  'tailored',  FALSE, 0, NULL, NULL, 4, 5),
    ('field_jacket',  '2023-03-18', 'charcoal', NULL,      'cotton-twill', 'regular',   FALSE, 0, NULL, NULL, 3, 3),
    ('field_jacket',  '2023-03-18', 'olive',    NULL,      'cotton-twill', 'regular',   FALSE, 0, NULL, NULL, 2, 3),
    ('rain_shell',    '2024-04-22', 'yellow',   NULL,      'nylon',        'boxy',      TRUE,  0, NULL, NULL, 2, 2),
    ('rain_shell',    '2021-09-01', 'navy',     NULL,      'nylon',        'boxy',      TRUE,  0, NULL, '2025-05-01', 3, 2),

    -- bottom
    ('wool_trousers', '2024-02-10', 'charcoal', NULL,      'worsted-wool', 'straight',  FALSE, 0, NULL, NULL, 4, 3),
    ('wool_trousers', '2024-02-10', 'gray',     NULL,      'flannel-wool', 'straight',  FALSE, 0, NULL, NULL, 5, 4),
    ('chinos',        '2024-06-30', 'khaki',    NULL,      'cotton-twill', 'slim',      FALSE, 1, NULL, NULL, 3, 3),
    ('linen_trousers','2025-05-14', 'stone',    NULL,      'linen',        'relaxed',   FALSE, 0, NULL, NULL, 3, 1),
    ('jeans',         '2024-08-20', 'indigo',   NULL,      'denim',        'straight',  FALSE, 2, NULL, NULL, 2, 3),
    ('jeans',         '2024-08-20', 'black',    NULL,      'denim',        'slim',      FALSE, 0, NULL, NULL, 2, 3),

    -- footwear
    ('derby_shoes',   '2023-05-01', 'black',    NULL,      'calf-leather', 'derby',     FALSE, 2, NULL, NULL, 5, 2),
    ('oxford_shoe',   '2024-09-30', 'oxblood',  NULL,      'calf-leather', 'cap-toe',   FALSE, 0, NULL, NULL, 4, 2),
    ('leather_boots', '2023-10-15', 'brown',    NULL,      'leather',      'chelsea',   FALSE, 5, NULL, NULL, 3, 3),
    ('loafers',       '2024-03-22', 'brown',    NULL,      'suede',        'penny',     FALSE, 1, NULL, NULL, 3, 2),
    ('sneakers',      '2025-01-08', 'white',    NULL,      'leather',      'low-top',   FALSE, 3, NULL, NULL, 1, 2),
    ('sneakers',      '2024-07-19', 'gray',     NULL,      'mesh',         'low-top',   FALSE, 0, NULL, NULL, 2, 2),

    -- accessory
    ('wool_scarf',    '2024-01-10', 'burgundy', NULL,      'wool',         'long',      FALSE, 1, NULL, NULL, 3, 4),
    ('silk_tie',      '2023-12-05', 'navy',     'silver',  'silk',         'standard',  FALSE, 0, NULL, NULL, 5, 1),
    ('leather_belt',  '2023-02-14', 'brown',    NULL,      'leather',      'standard',  FALSE, 0, NULL, NULL, 3, 2),
    ('beanie',        '2024-11-02', 'gray',     NULL,      'wool-knit',    'cuffed',    FALSE, 0, NULL, NULL, 1, 4),
    ('canvas_tote',   '2024-05-30', 'natural',  NULL,      'canvas',       'standard',  FALSE, 0, NULL, NULL, 1, 3)
) AS v(type_name, acquired_at, primary_color, secondary_color, texture,
       silhouette, water_resistant, wears_since_wash, wash_override,
       retired_at, formality_band, warmth_rating)
JOIN garment_types gt ON gt.name = v.type_name
CROSS JOIN (SELECT user_id FROM users WHERE display_name = 'Alex Rivera') u;

-- ---------------------------------------------------------------------------
-- garment_tags  (open-ended descriptors only)
-- ---------------------------------------------------------------------------
INSERT INTO garment_tags (garment_id, tag)
SELECT g.garment_id, 'gift-from-mom'
FROM garments g JOIN garment_types gt ON gt.garment_type_id = g.garment_type_id
WHERE gt.name = 'wool_scarf' AND g.primary_color = 'burgundy';

INSERT INTO garment_tags (garment_id, tag)
SELECT g.garment_id, 'vintage'
FROM garments g JOIN garment_types gt ON gt.garment_type_id = g.garment_type_id
WHERE gt.name = 'oxford_shirt' AND g.primary_color = 'gray';

-- ---------------------------------------------------------------------------
-- garment_compatibility
-- One never_pair exception: the gray flannel oxford clashes with the brown
-- leather boots. LEAST/GREATEST normalizes so garment_a_id < garment_b_id.
-- ---------------------------------------------------------------------------
INSERT INTO garment_compatibility (garment_a_id, garment_b_id, polarity, note)
SELECT LEAST(shirt.garment_id, boots.garment_id),
       GREATEST(shirt.garment_id, boots.garment_id),
       'never_pair',
       'flannel shirt reads too casual against boots for this user''s taste'
FROM garments shirt
JOIN garment_types shirt_type ON shirt_type.garment_type_id = shirt.garment_type_id
 AND shirt_type.name = 'oxford_shirt'
JOIN garments boots ON TRUE
JOIN garment_types boots_type ON boots_type.garment_type_id = boots.garment_type_id
 AND boots_type.name = 'leather_boots'
WHERE shirt.primary_color = 'gray' AND boots.primary_color = 'brown';

-- ---------------------------------------------------------------------------
-- outfits + outfit_garments
-- Garments are selected by (type, primary_color) now that several types have
-- multiple instances.
-- ---------------------------------------------------------------------------

-- Worn outfit, weather context snapshotted at decision time.
WITH new_outfit AS (
    INSERT INTO outfits (
        user_id, status, proposed_at, worn_on, origin, requested_vibe,
        weather_temp_c, weather_condition, occasion, rationale
    )
    SELECT u.user_id, 'worn', '2025-06-02 07:30:00-04', '2025-06-02', 'agent',
           'something crisp for a client meeting', 18, 'partly cloudy', 'work',
           'Blue oxford keeps it sharp without a jacket; charcoal trousers and black derbies hold the formality line for a client room.'
    FROM users u WHERE u.display_name = 'Alex Rivera'
    RETURNING outfit_id
)
INSERT INTO outfit_garments (outfit_id, garment_id)
SELECT new_outfit.outfit_id, g.garment_id
FROM new_outfit
JOIN garments g ON TRUE
JOIN garment_types gt ON gt.garment_type_id = g.garment_type_id
WHERE (gt.name = 'oxford_shirt'  AND g.primary_color = 'blue')
   OR (gt.name = 'wool_trousers' AND g.primary_color = 'charcoal')
   OR (gt.name = 'derby_shoes'   AND g.primary_color = 'black');

-- Rejected outfit, with a rejection_reason and no worn_on.
WITH new_outfit AS (
    INSERT INTO outfits (
        user_id, status, proposed_at, origin, requested_vibe,
        weather_temp_c, weather_condition, occasion, rejection_reason, rationale
    )
    SELECT u.user_id, 'rejected', '2025-06-03 07:15:00-04', 'agent',
           'cozy for a rainy commute', 11, 'rain', 'commute',
           'sweater and jacket combo felt too bulky under a raincoat',
           'Charcoal sweater over indigo jeans with the olive field jacket for warmth on a wet commute.'
    FROM users u WHERE u.display_name = 'Alex Rivera'
    RETURNING outfit_id
)
INSERT INTO outfit_garments (outfit_id, garment_id)
SELECT new_outfit.outfit_id, g.garment_id
FROM new_outfit
JOIN garments g ON TRUE
JOIN garment_types gt ON gt.garment_type_id = g.garment_type_id
WHERE (gt.name = 'wool_sweater' AND g.primary_color = 'charcoal')
   OR (gt.name = 'jeans'        AND g.primary_color = 'indigo')
   OR (gt.name = 'field_jacket' AND g.primary_color = 'olive');

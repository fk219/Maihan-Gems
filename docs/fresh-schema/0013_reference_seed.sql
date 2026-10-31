-- FRESH CLEAN SCHEMA — reference vocabulary seed (generated 2026-10-31 from maihan_dev).
-- Owner-approved reference data extracted from the live fresh schema (ADR-035).
-- Deterministic: ids preserved so family/variety links stay stable; sequences set after insert.

BEGIN;

-- PostgreSQL database dump


-- Dumped from database version 16.15 (Debian 16.15-1.pgdg12+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg12+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


INSERT INTO fresh.clarities VALUES (30, 'EYE-CLEAN', 'Eye Clean', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.clarities VALUES (31, 'INCLUDED', 'Included', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.clarities VALUES (32, 'SLIGHTLY-INC', 'Slightly Included', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.clarities VALUES (33, 'VERY-SLIGHTL', 'Very Slightly Included', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.clarities VALUES (34, 'VERY-VERY-SL', 'Very Very Slightly Included', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;



INSERT INTO fresh.gemstone_colours VALUES (276, 'Aqua', 'aqua', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (277, 'Black', 'black', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (278, 'Blue', 'blue', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (279, 'Bluish', 'bluish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (280, 'Brown', 'brown', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (281, 'Brownish', 'brownish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (282, 'Burgundy', 'burgundy', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (283, 'Champagne', 'champagne', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (284, 'Colorless', 'colorless', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (285, 'Colourless', 'colourless', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (286, 'Coral', 'coral', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (287, 'Cyan', 'cyan', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (288, 'Flash', 'flash', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (289, 'Golden', 'golden', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (290, 'Gray', 'gray', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (291, 'Green', 'green', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (292, 'Greenish', 'greenish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (293, 'Grey', 'grey', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (294, 'Greyish', 'greyish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (295, 'Indicolite', 'indicolite', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (296, 'Lavender', 'lavender', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (297, 'Lemon', 'lemon', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (298, 'Lime', 'lime', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (299, 'Madeira', 'madeira', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (300, 'Mauve', 'mauve', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (301, 'Mint', 'mint', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (302, 'Olive', 'olive', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (303, 'Orange', 'orange', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (304, 'Orangey', 'orangey', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (305, 'Orangish', 'orangish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (306, 'Organish', 'organish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (307, 'Oxblood', 'oxblood', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (308, 'Peach', 'peach', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (309, 'Peacock', 'peacock', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (310, 'Pink', 'pink', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (311, 'Pinkish', 'pinkish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (312, 'Plum', 'plum', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (313, 'Purple', 'purple', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (314, 'Purplish', 'purplish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (315, 'Rainbow', 'rainbow', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (316, 'Red', 'red', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (317, 'Reddish', 'reddish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (318, 'Rose', 'rose', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (319, 'Salmon', 'salmon', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (320, 'Seafoam', 'seafoam', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (321, 'Silver', 'silver', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (322, 'Smoky', 'smoky', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (323, 'Teal', 'teal', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (324, 'Turquoise', 'turquoise', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (325, 'Violet', 'violet', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (326, 'Violetish', 'violetish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (327, 'Watermelon', 'watermelon', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (328, 'White', 'white', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (329, 'Yellow', 'yellow', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_colours VALUES (330, 'Yellowish', 'yellowish', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;



INSERT INTO fresh.gemstone_families VALUES (1, 'QUA', 'Quartz', 'Silica family incl. chalcedony (agate, carnelian, onyx, bloodstone).', 0, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (2, 'BER', 'Beryl', 'Aluminium beryllium silicates distinguished by colour.', 1, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (3, 'COR', 'Corundum', 'Aluminium oxide: ruby (red) and sapphire (all other colours).', 2, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (4, 'GAR', 'Garnet', 'Complex silicate group incl. pyralspite and ugrandite sub-groups.', 3, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (5, 'TOU', 'Tourmaline', 'Borosilicate minerals with a vast colour range.', 4, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (6, 'FEL', 'Feldspar', 'Rock-forming tectosilicates: moonstone, labradorite, sunstone.', 5, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (7, 'SPI', 'Spinel', 'Oxide minerals with a wide range of vibrant colours.', 6, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (8, 'CHB', 'Chrysoberyl', 'Alexandrite (colour-change) and cat’s-eye chrysoberyl.', 7, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (9, 'TOP', 'Topaz', 'Fluorine-bearing aluminium silicate.', 8, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (10, 'SIN', 'Single-Species', 'Stands as its own group in the jewellery trade.', 9, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_families VALUES (11, 'ORG', 'Organic', 'Produced by living or once-living organisms.', 10, '2026-10-28 10:27:29.062623+00') ON CONFLICT DO NOTHING;



INSERT INTO fresh.gemstone_origins VALUES (217, 'Afghanistan', 'afghanistan', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (218, 'Africa', 'africa', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (219, 'Arizona', 'arizona', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (220, 'Australia', 'australia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (221, 'Bolivia', 'bolivia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (222, 'Brazil', 'brazil', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (223, 'Cambodia', 'cambodia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (224, 'Canada', 'canada', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (225, 'Ceylon (Sri Lanka)', 'ceylon-sri-lanka', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (226, 'China', 'china', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (227, 'Colombia', 'colombia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (228, 'Congo', 'congo', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (229, 'Ethiopia', 'ethiopia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (230, 'India', 'india', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (231, 'Indonesia', 'indonesia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (232, 'Iran', 'iran', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (233, 'Italy', 'italy', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (234, 'Japan', 'japan', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (235, 'Kenya', 'kenya', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (236, 'Madagascar', 'madagascar', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (237, 'Malawi', 'malawi', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (238, 'Malaysia', 'malaysia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (239, 'Mali', 'mali', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (240, 'Mexico', 'mexico', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (241, 'Montana', 'montana', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (242, 'Morocco', 'morocco', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (243, 'Mozambique', 'mozambique', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (244, 'Myanmar (Burma)', 'myanmar-burma', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (245, 'Namibia', 'namibia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (246, 'Nepal', 'nepal', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (247, 'Nigeria', 'nigeria', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (248, 'Pakistan', 'pakistan', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (249, 'Russia', 'russia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (250, 'Siberia', 'siberia', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (251, 'Tajikistan', 'tajikistan', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (252, 'Tanzania', 'tanzania', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (253, 'Thailand', 'thailand', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (254, 'Ukraine', 'ukraine', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (255, 'Uruguay', 'uruguay', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (256, 'USA', 'usa', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (257, 'Vietnam', 'vietnam', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (258, 'Zimbabwe', 'zimbabwe', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_origins VALUES (260, 'Mogok', 'mogok', 0, '2026-10-29 14:02:06.848893+00') ON CONFLICT DO NOTHING;



INSERT INTO fresh.gemstone_varieties VALUES (411, 'Agate', 'agate', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'AGT') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (412, 'Alexandrite', 'alexandrite', NULL, 0, '2026-10-28 12:33:17.148069+00', 8, 'ALX') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (413, 'Almandine Garnet', 'almandine-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'ALM') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (414, 'Amethyst', 'amethyst', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'AME') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (415, 'Ametrine', 'ametrine', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'AMT') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (416, 'Andalusite', 'andalusite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'ADL') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (417, 'Andesine', 'andesine', NULL, 0, '2026-10-28 12:33:17.148069+00', 6, 'AND') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (418, 'Andradite Garnet', 'andradite-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'ADG') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (419, 'Apatite', 'apatite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'APT') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (420, 'Aquamarine', 'aquamarine', NULL, 0, '2026-10-28 12:33:17.148069+00', 2, 'AQU') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (421, 'Beryl', 'beryl', NULL, 0, '2026-10-28 12:33:17.148069+00', 2, 'BRL') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (422, 'Black Opal Dark Opal', 'black-opal-dark-opal', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'BOP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (423, 'Bloodstone Heliotrope', 'bloodstone-heliotrope', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'BLO') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (424, 'Boulder Opal Ironstone Opal', 'boulder-opal-ironstone-opal', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'BIP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (425, 'Carnelian', 'carnelian', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'CRN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (426, 'Chrome Diopside', 'chrome-diopside', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'CDI') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (427, 'Chrome Tourmaline', 'chrome-tourmaline', NULL, 0, '2026-10-28 12:33:17.148069+00', 5, 'CTM') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (428, 'Chrysoberyl', 'chrysoberyl', NULL, 0, '2026-10-28 12:33:17.148069+00', 8, 'CBY') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (429, 'Citrine', 'citrine', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'CIT') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (430, 'Cobalt Spinel', 'cobalt-spinel', NULL, 0, '2026-10-28 12:33:17.148069+00', 7, 'CSP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (431, 'Coral', 'coral', NULL, 0, '2026-10-28 12:33:17.148069+00', 11, 'CRL') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (432, 'Crystal Opal Jelly Opal', 'crystal-opal-jelly-opal', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'CJO') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (433, 'Demantoid Garnet', 'demantoid-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'DEM') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (434, 'Diopside', 'diopside', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'DIO') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (435, 'Fire Opal Flame Opal', 'fire-opal-flame-opal', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'FOP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (436, 'Fluorite', 'fluorite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'FLU') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (437, 'Garnet', 'garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'GRN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (438, 'Goshenite', 'goshenite', NULL, 0, '2026-10-28 12:33:17.148069+00', 2, 'GSH') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (439, 'Grandidierite', 'grandidierite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'GRD') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (440, 'Grossular Garnet', 'grossular-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'GRS') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (441, 'Hauyne', 'hauyne', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'HAU') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (442, 'Heliodor', 'heliodor', NULL, 0, '2026-10-28 12:33:17.148069+00', 2, 'HEL') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (443, 'Hessonite Garnet', 'hessonite-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'HES') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (444, 'Imperial Topaz', 'imperial-topaz', NULL, 0, '2026-10-28 12:33:17.148069+00', 9, 'ITP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (445, 'Iolite', 'iolite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'IOL') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (446, 'Jade', 'jade', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'JAD') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (447, 'Jeremejevite', 'jeremejevite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'JER') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (448, 'Kornerupine', 'kornerupine', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'KRN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (449, 'Kunzite', 'kunzite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'KUN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (450, 'Kyanite', 'kyanite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'KYN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (451, 'Lapis', 'lapis', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'LAP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (452, 'Malachite', 'malachite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'MAL') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (453, 'Malaya Garnet', 'malaya-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'MLG') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (454, 'Mali Garnet', 'mali-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'MGL') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (455, 'Moonstone', 'moonstone', NULL, 0, '2026-10-28 12:33:17.148069+00', 6, 'MON') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (456, 'Morganite', 'morganite', NULL, 0, '2026-10-28 12:33:17.148069+00', 2, 'MOR') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (457, 'Onyx', 'onyx', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'ONX') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (458, 'Paraiba Tourmaline', 'paraiba-tourmaline', NULL, 0, '2026-10-28 12:33:17.148069+00', 5, 'PRB') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (459, 'Pearl', 'pearl', NULL, 0, '2026-10-28 12:33:17.148069+00', 11, 'PRL') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (460, 'Peridot', 'peridot', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'PER') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (461, 'Phenakite', 'phenakite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'PHE') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (462, 'Prasiolite', 'prasiolite', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'PRA') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (463, 'Precious Topaz', 'precious-topaz', NULL, 0, '2026-10-28 12:33:17.148069+00', 9, 'PTP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (464, 'Quartz', 'quartz', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'QRT') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (465, 'Red Beryl', 'red-beryl', NULL, 0, '2026-10-28 12:33:17.148069+00', 2, 'RBE') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (466, 'Rhodochrosite', 'rhodochrosite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'RDC') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (467, 'Rhodolite Garnet', 'rhodolite-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'RHO') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (468, 'Rhodonite', 'rhodonite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'RHN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (469, 'Rose Quartz', 'rose-quartz', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'RQS') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (470, 'Rubellite Tourmaline', 'rubellite-tourmaline', NULL, 0, '2026-10-28 12:33:17.148069+00', 5, 'RBT') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (471, 'Rutilated Quartz', 'rutilated-quartz', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'RQU') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (472, 'Scapolite', 'scapolite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'SCP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (473, 'Sinhalite', 'sinhalite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'SNL') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (474, 'Smoky Quartz', 'smoky-quartz', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'SMQ') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (475, 'Spessartite Garnet', 'spessartite-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'SPS') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (476, 'Sphene Titanite', 'sphene-titanite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'SPH') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (477, 'Spinel', 'spinel', NULL, 0, '2026-10-28 12:33:17.148069+00', 7, 'SPN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (478, 'Taaffeite', 'taaffeite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'TAF') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (479, 'Tanzanite', 'tanzanite', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'TAN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (480, 'Tigers Eye', 'tigers-eye', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'TGE') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (481, 'Topaz', 'topaz', NULL, 0, '2026-10-28 12:33:17.148069+00', 9, 'TPZ') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (482, 'Tourmaline', 'tourmaline', NULL, 0, '2026-10-28 12:33:17.148069+00', 5, 'TRM') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (483, 'Tsavorite Garnet', 'tsavorite-garnet', NULL, 0, '2026-10-28 12:33:17.148069+00', 4, 'TSV') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (484, 'Turquoise', 'turquoise', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'TRQ') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (485, 'White Opal Light Opal', 'white-opal-light-opal', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'WOP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (486, 'Zircon', 'zircon', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'ZIR') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (487, 'Ruby', 'ruby', NULL, 0, '2026-10-28 12:33:17.148069+00', 3, 'RUB') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (488, 'Sapphire', 'sapphire', NULL, 0, '2026-10-28 12:33:17.148069+00', 3, 'SAP') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (489, 'Emerald', 'emerald', NULL, 0, '2026-10-28 12:33:17.148069+00', 2, 'EME') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (490, 'Diamond', 'diamond', NULL, 0, '2026-10-28 12:33:17.148069+00', 10, 'DIA') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (491, 'Amber', 'amber', NULL, 0, '2026-10-28 12:33:17.148069+00', 11, 'AMB') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (492, 'Labradorite', 'labradorite', NULL, 0, '2026-10-28 12:33:17.148069+00', 6, 'LAB') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (493, 'Sunstone', 'sunstone', NULL, 0, '2026-10-28 12:33:17.148069+00', 6, 'SUN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (494, 'Aventurine', 'aventurine', NULL, 0, '2026-10-28 12:33:17.148069+00', 1, 'AVN') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (495, 'Cats Eye Chrysoberyl', 'cats-eye-chrysoberyl', NULL, 0, '2026-10-28 12:33:17.148069+00', 8, 'CEC') ON CONFLICT DO NOTHING;
INSERT INTO fresh.gemstone_varieties VALUES (496, 'Amazonite', 'amazonite', NULL, 0, '2026-10-28 12:33:17.148069+00', 6, 'AMZ') ON CONFLICT DO NOTHING;



INSERT INTO fresh.jewellery_types VALUES (31, 'RING', 'Ring', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.jewellery_types VALUES (32, 'EARRING', 'Earring', 1, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.jewellery_types VALUES (33, 'PENDANT', 'Pendant', 2, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.jewellery_types VALUES (34, 'NECKLACE', 'Necklace', 3, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.jewellery_types VALUES (35, 'BRACELET', 'Bracelet', 4, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.jewellery_types VALUES (36, 'NOSE_RING', 'Nose ring', 5, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;



INSERT INTO fresh.metals VALUES (71, 'W10', '10K White Gold', NULL, 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (72, 'Y10', '10K Yellow Gold', NULL, 1, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (73, 'W14', '14K White Gold', NULL, 2, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (74, 'Y14', '14K Yellow Gold', NULL, 3, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (75, 'R14', '14K Rose Gold', NULL, 4, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (76, 'W18', '18K White Gold', NULL, 5, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (77, 'Y18', '18K Yellow Gold', NULL, 6, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (78, 'R18', '18K Rose Gold', NULL, 7, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (79, 'PT', 'Platinum 950', '950', 8, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (80, 'SL', 'Sterling Silver', '925', 9, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (81, 'YW14', '14K Yellow-White Gold', NULL, 10, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (82, 'WY14', '14K White-Yellow Gold', NULL, 11, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (83, 'YW18', '18K Yellow-White Gold', NULL, 12, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.metals VALUES (84, 'WY18', '18K White-Yellow Gold', NULL, 13, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;



INSERT INTO fresh.setting_styles VALUES (76, 'Accent Stones', 'accent-stones', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (77, 'Antique', 'antique', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (78, 'Bezel', 'bezel', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (79, 'Celtic', 'celtic', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (80, 'Drops', 'drops', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (81, 'Floral', 'floral', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (82, 'Flush Set', 'flush-set', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (83, 'Halo', 'halo', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (84, 'Mens', 'mens', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (85, 'Pave', 'pave', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (86, 'Solitaire', 'solitaire', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (87, 'Studs', 'studs', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (88, 'Three Stone', 'three-stone', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (89, 'Vedic', 'vedic', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.setting_styles VALUES (90, 'Wedding Set', 'wedding-set', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;



INSERT INTO fresh.shapes VALUES (127, 'Asscher', 'asscher', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (128, 'Baguette', 'baguette', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (129, 'Briolette', 'briolette', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (130, 'Bullet', 'bullet', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (131, 'Cabochon', 'cabochon', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (132, 'Cushion', 'cushion', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (133, 'Emerald Cut', 'emerald-cut', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (134, 'Fancy', 'fancy', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (135, 'Freeform', 'freeform', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (136, 'Heart', 'heart', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (137, 'Hexagonal', 'hexagonal', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (138, 'Marquise', 'marquise', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (139, 'Octagon', 'octagon', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (140, 'Oval', 'oval', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (141, 'Pear', 'pear', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (142, 'Princess', 'princess', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (143, 'Radiant', 'radiant', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (144, 'Round', 'round', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (145, 'Shield', 'shield', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (146, 'Square', 'square', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (147, 'Star', 'star', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (148, 'Trapezoid', 'trapezoid', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (149, 'Triangle', 'triangle', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.shapes VALUES (150, 'Trillion', 'trillion', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;



INSERT INTO fresh.treatments VALUES (26, 'HEAT-TREATED', 'Heat Treated', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.treatments VALUES (27, 'NO-ENHANCEMENT', 'No Enhancement', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.treatments VALUES (28, 'VAPOR-INFUSED-CO', 'Vapor-Infused Coating', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.treatments VALUES (29, 'DOUBLET', 'Doublet', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.treatments VALUES (30, 'TRIPLET', 'Triplet', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.treatments VALUES (31, 'COATED', 'Coated', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.treatments VALUES (32, 'GLASSFILL', 'Glass-Filled', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.treatments VALUES (33, 'OILFILL', 'Oil-Filled', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;
INSERT INTO fresh.treatments VALUES (34, 'NOIND', 'No Indication of Treatment', 0, '2026-10-28 12:33:17.148069+00') ON CONFLICT DO NOTHING;


-- Name: clarities_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.clarities_id_seq', 34, true);


-- Name: gemstone_colours_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.gemstone_colours_id_seq', 330, true);


-- Name: gemstone_families_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.gemstone_families_id_seq', 44, true);


-- Name: gemstone_origins_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.gemstone_origins_id_seq', 260, true);


-- Name: gemstone_varieties_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.gemstone_varieties_id_seq', 496, true);


-- Name: jewellery_types_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.jewellery_types_id_seq', 36, true);


-- Name: metals_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.metals_id_seq', 84, true);


-- Name: setting_styles_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.setting_styles_id_seq', 90, true);


-- Name: shapes_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.shapes_id_seq', 150, true);


-- Name: treatments_id_seq; Type: SEQUENCE SET; Schema: fresh; Owner: postgres

SELECT pg_catalog.setval('fresh.treatments_id_seq', 34, true);


-- PostgreSQL database dump complete


COMMIT;

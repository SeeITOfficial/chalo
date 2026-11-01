-- Seed places for Chalo (Vadodara pilot cluster & transit corridors)
-- Times are unix epoch seconds (UTC). created_by NULL = seeded by system.

INSERT OR IGNORE INTO places (id, name, kind, lat, lng, created_by, created_at) VALUES
  -- Transit hubs
  ('0192e2b0-0001-7000-8000-000000000001', 'Vadodara Junction Railway Station', 'station', 22.3106, 73.1812, NULL, 1730460000),
  ('0192e2b0-0002-7000-8000-000000000002', 'Vadodara Airport (BDQ)', 'airport', 22.3325, 73.2263, NULL, 1730460000),
  ('0192e2b0-0003-7000-8000-000000000003', 'Parul University Main Gate', 'other', 22.2887, 73.3634, NULL, 1730460000),

  -- Bridges & Highway Junctions (NH 48 bypass)
  ('0192e2b0-0010-7000-8000-000000000010', 'Ajwa Bridge (NH 48 Chokdi)', 'other', 22.3150, 73.2370, NULL, 1730460000),
  ('0192e2b0-0011-7000-8000-000000000011', 'Kapurai Bridge (NH 48 Chokdi)', 'other', 22.2785, 73.2380, NULL, 1730460000),
  ('0192e2b0-0012-7000-8000-000000000012', 'Tarsali Bridge (NH 48 Chokdi)', 'other', 22.2530, 73.2120, NULL, 1730460000),
  ('0192e2b0-0013-7000-8000-000000000013', 'Waghodia Chokdi Bridge (NH 48)', 'other', 22.2980, 73.2390, NULL, 1730460000),
  ('0192e2b0-0014-7000-8000-000000000014', 'Golden Chokdi Bridge (NH 48)', 'other', 22.3480, 73.2250, NULL, 1730460000),

  -- Key Circles & Panigate spots
  ('0192e2b0-0020-7000-8000-000000000020', 'Uma Circle (Waghodia Road)', 'other', 22.2982, 73.2280, NULL, 1730460000),
  ('0192e2b0-0021-7000-8000-000000000021', 'Vrundavan Circle (Waghodia Road)', 'other', 22.3020, 73.2355, NULL, 1730460000),
  ('0192e2b0-0022-7000-8000-000000000022', 'Panigate Darwaja', 'other', 22.3025, 73.2120, NULL, 1730460000),
  ('0192e2b0-0023-7000-8000-000000000023', 'The Spot (Panigate)', 'other', 22.3015, 73.2135, NULL, 1730460000),
  ('0192e2b0-0024-7000-8000-000000000024', 'Albatross Complex (Albrost Panigate)', 'office', 22.3010, 73.2180, NULL, 1730460000),
  ('0192e2b0-0025-7000-8000-000000000025', 'Bapod Cross Road', 'other', 22.3040, 73.2450, NULL, 1730460000),

  -- Waghodia Road Societies
  ('0192e2b0-0030-7000-8000-000000000030', 'Dove Deck Society (Waghodia Road)', 'society', 22.2965, 73.2420, NULL, 1730460000),
  ('0192e2b0-0031-7000-8000-000000000031', 'Golden Valley Society (Waghodia Road)', 'society', 22.2970, 73.2460, NULL, 1730460000),
  ('0192e2b0-0032-7000-8000-000000000032', 'Ananta Shubh Society (Waghodia Road)', 'society', 22.2940, 73.2550, NULL, 1730460000),
  ('0192e2b0-0033-7000-8000-000000000033', 'Ananta Swagat Society (Waghodia Road)', 'society', 22.2950, 73.2510, NULL, 1730460000),
  ('0192e2b0-0034-7000-8000-000000000034', 'Ananta Sparsh Society (Waghodia Road)', 'society', 22.2930, 73.2590, NULL, 1730460000),
  ('0192e2b0-0035-7000-8000-000000000035', 'Ananta Greens Society (Waghodia Road)', 'society', 22.2935, 73.2570, NULL, 1730460000),
  ('0192e2b0-0036-7000-8000-000000000036', 'Ananta Saral Society (Waghodia Road)', 'society', 22.2925, 73.2620, NULL, 1730460000),
  ('0192e2b0-0037-7000-8000-000000000037', 'Vaikunth Society (Waghodia Road)', 'society', 22.2985, 73.2384, NULL, 1730460000),
  ('0192e2b0-0038-7000-8000-000000000038', 'Suryanagar Society (Waghodia Road)', 'society', 22.2990, 73.2240, NULL, 1730460000),
  ('0192e2b0-0039-7000-8000-000000000039', 'Parivar Society (Waghodia Road)', 'society', 22.2980, 73.2320, NULL, 1730460000),
  ('0192e2b0-003a-7000-8000-00000000003a', 'Prabhat Society (Waghodia Road)', 'society', 22.2975, 73.2350, NULL, 1730460000),
  ('0192e2b0-003b-7000-8000-00000000003b', 'Aastha Greens Society (Waghodia Road)', 'society', 22.2925, 73.2650, NULL, 1730460000),
  ('0192e2b0-003c-7000-8000-00000000003c', 'Shreepati Township (Limda)', 'society', 22.2865, 73.3590, NULL, 1730460000),

  -- Ajwa Road Societies
  ('0192e2b0-0040-7000-8000-000000000040', 'Kamlanagar Society (Ajwa Road)', 'society', 22.3112, 73.2325, NULL, 1730460000),
  ('0192e2b0-0041-7000-8000-000000000041', 'Sayaji Park Society (Ajwa Road)', 'society', 22.3130, 73.2280, NULL, 1730460000),
  ('0192e2b0-0042-7000-8000-000000000042', 'Shreeji Vatika Society (Ajwa Road)', 'society', 22.3140, 73.2350, NULL, 1730460000),
  ('0192e2b0-0043-7000-8000-000000000043', 'Sardar Patel Society (Ajwa Road)', 'society', 22.3120, 73.2220, NULL, 1730460000),
  ('0192e2b0-0044-7000-8000-000000000044', 'Radhakrishna Society (Ajwa Road)', 'society', 22.3135, 73.2310, NULL, 1730460000),
  ('0192e2b0-0045-7000-8000-000000000045', 'Shanti Park Society (Ajwa Road)', 'society', 22.3150, 73.2410, NULL, 1730460000),
  ('0192e2b0-0046-7000-8000-000000000046', 'Madhav Park Society (Ajwa Road)', 'society', 22.3160, 73.2450, NULL, 1730460000),

  -- DMart Locations
  ('0192e2b0-0050-7000-8000-000000000050', 'DMart (Waghodia Road)', 'mall', 22.2978, 73.2340, NULL, 1730460000),
  ('0192e2b0-0051-7000-8000-000000000051', 'DMart (Tarsali)', 'mall', 22.2570, 73.2090, NULL, 1730460000),
  ('0192e2b0-0052-7000-8000-000000000052', 'DMart (Manjalpur)', 'mall', 22.2680, 73.1950, NULL, 1730460000),
  ('0192e2b0-0053-7000-8000-000000000053', 'DMart (Harni VIP Road)', 'mall', 22.3310, 73.2180, NULL, 1730460000),
  ('0192e2b0-0054-7000-8000-000000000054', 'DMart (Gotri)', 'mall', 22.3080, 73.1360, NULL, 1730460000),
  ('0192e2b0-0055-7000-8000-000000000055', 'DMart (Sama Savli Road)', 'mall', 22.3420, 73.1890, NULL, 1730460000),

  -- Other major malls in Vadodara
  ('0192e2b0-0060-7000-8000-000000000060', 'Inorbit Mall Vadodara', 'mall', 22.3213, 73.1678, NULL, 1730460000),
  ('0192e2b0-0061-7000-8000-000000000061', 'Eva The Mall (Manjalpur)', 'mall', 22.2742, 73.1932, NULL, 1730460000),
  ('0192e2b0-0062-7000-8000-000000000062', 'Center Square Mall', 'mall', 22.3087, 73.1705, NULL, 1730460000),
  ('0192e2b0-0063-7000-8000-000000000063', 'Seven Seas Mall (Fatehgunj)', 'mall', 22.3228, 73.1872, NULL, 1730460000);

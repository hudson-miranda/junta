-- Upgrade existing catalogues without running development seed or changing custom photos.
UPDATE "Product"
SET "imageUrl" = '/assets/products/' || "slug" || '.webp'
WHERE "imageUrl" IS NULL
  AND "slug" IN (
    'playstation-5-slim', 'iphone-17', 'galaxy-s26', 'macbook-air',
    'nintendo-switch', 'tv-lg-oled', 'samsung-oled', 'airpods', 'apple-watch'
  );

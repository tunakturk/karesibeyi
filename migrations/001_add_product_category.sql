ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'gurme';

UPDATE products
SET category = CASE
  WHEN slug IN ('turk-kahvesi', 'sade-beze', 'tatli-kurabiye') THEN 'kahve-tatli'
  WHEN slug IN ('zeytin-cicegi-kolonyasi') THEN 'kolonya'
  WHEN slug IN ('draje-cesitleri') THEN 'atistirmalik'
  ELSE 'gurme'
END
WHERE category = 'gurme';

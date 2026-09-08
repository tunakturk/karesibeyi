UPDATE products
SET category = CASE
  WHEN slug IN ('turk-kahvesi') THEN 'kuruyemisler'
  WHEN slug IN ('sebzeli-mini-midye-makarna', 'sebzeli-eriste') THEN 'unlu-mamuller'
  WHEN slug IN ('ozel-karisik', 'ozel-karisik-kuruyemis') THEN 'kuruyemisler'
  WHEN slug IN ('beze', 'sade-beze', 'tatli-kurabiye') THEN 'kurabiyeler'
  WHEN slug IN ('tahin-uzum-pekmezi') THEN 'helvalar'
  WHEN slug IN ('draje-cesitleri') THEN 'drajeler'
  WHEN slug IN ('zeytin-cicegi-kolonyasi') THEN 'kolonyalar'
  ELSE category
END;

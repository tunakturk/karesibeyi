UPDATE products
SET image_url = CASE slug
  WHEN 'balikesir-geceleri-kolonya' THEN 'assets/kolonyalar/balikesir-geceleri.JPG'
  WHEN 'antep-fistikli-helva-450g' THEN 'assets/helvalar/antep-450g.JPG'
  WHEN 'sebzeli-eriste' THEN 'assets/unlu-mamuller/sebzeli-eriste.jpeg'
  WHEN 'tatli-kurabiye' THEN 'assets/kurabiyeler/tatli-kurabiye.jpeg'
  WHEN 'drajemix' THEN 'assets/drajeler/drajemix.jpeg'
  WHEN 'atom-karisik-kuruyemis' THEN 'assets/kuruyemisler/atom-karisik.JPG'
  WHEN 'zeytin-cicegi-kolonya' THEN 'assets/kolonyalar/zeytin-cicegi-kolonyasi.jpeg'
  WHEN 'beze' THEN 'assets/kurabiyeler/sade-beze.jpeg'
  WHEN 'ozel-karisik-kuruyemis' THEN 'assets/kuruyemisler/ozel-karisik.jpeg'
  ELSE image_url
END
WHERE slug IN (
  'balikesir-geceleri-kolonya',
  'antep-fistikli-helva-450g',
  'sebzeli-eriste',
  'tatli-kurabiye',
  'drajemix',
  'atom-karisik-kuruyemis',
  'zeytin-cicegi-kolonya',
  'beze',
  'ozel-karisik-kuruyemis'
);

-- Karesi Beyi D1 schema

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  district TEXT,
  address TEXT NOT NULL,
  note TEXT,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- İlk ürünler. Fiyatları admin panelinden değiştirebilirsin.
INSERT OR IGNORE INTO products
(id,name,slug,description,price,stock,image_url,active,created_at,updated_at)
VALUES
('kahve','Türk Kahvesi','turk-kahvesi','Karesi Beyi Türk Kahvesi',0,0,'assets/turk-kahvesi.jpeg',1,datetime('now'),datetime('now')),
('midye','Sebzeli Mini Midye Makarna','sebzeli-mini-midye-makarna','',0,0,'assets/mini-midye-makarna.jpeg',1,datetime('now'),datetime('now')),
('tahin','Tahin & Üzüm Pekmezi','tahin-uzum-pekmezi','',0,0,'assets/tahin-pekmez.jpeg',1,datetime('now'),datetime('now')),
('eriste','Sebzeli Erişte','sebzeli-eriste','',0,0,'assets/sebzeli-eriste.jpeg',1,datetime('now'),datetime('now')),
('kolonya','Zeytin Çiçeği Kolonyası','zeytin-cicegi-kolonyasi','',0,0,'assets/zeytin-cicegi-kolonyasi.jpeg',1,datetime('now'),datetime('now')),
('draje','Draje Çeşitleri','draje-cesitleri','',0,0,'assets/draje.jpeg',1,datetime('now'),datetime('now')),
('beze','Sade Beze','sade-beze','',0,0,'assets/sade-beze.jpeg',1,datetime('now'),datetime('now')),
('kurabiye','Tatlı Kurabiye','tatli-kurabiye','',0,0,'assets/tatli-kurabiye.jpeg',1,datetime('now'),datetime('now')),
('karisik','Özel Karışık','ozel-karisik','',0,0,'assets/ozel-karisik.jpeg',1,datetime('now'),datetime('now'));

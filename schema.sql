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
  stock_deducted INTEGER NOT NULL DEFAULT 0,
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
  category TEXT NOT NULL DEFAULT 'unlu-mamuller',
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
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);

CREATE TRIGGER IF NOT EXISTS orders_check_stock_before_sale
BEFORE UPDATE OF status ON orders
WHEN OLD.status NOT IN ('paid', 'processing', 'shipped', 'completed')
  AND NEW.status IN ('paid', 'processing', 'shipped', 'completed')
  AND OLD.stock_deducted = 0
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = OLD.id
      GROUP BY oi.product_id
      HAVING p.id IS NULL OR p.stock < SUM(oi.quantity)
    )
    THEN RAISE(ABORT, 'insufficient_stock')
  END;
END;

CREATE TRIGGER IF NOT EXISTS orders_update_stock_after_status
AFTER UPDATE OF status ON orders
WHEN OLD.status != NEW.status
BEGIN
  UPDATE products
  SET stock = stock - (
    SELECT SUM(oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = products.id
  )
  WHERE OLD.status NOT IN ('paid', 'processing', 'shipped', 'completed')
    AND NEW.status IN ('paid', 'processing', 'shipped', 'completed')
    AND OLD.stock_deducted = 0
    AND id IN (SELECT product_id FROM order_items WHERE order_id = NEW.id);

  UPDATE orders
  SET stock_deducted = 1
  WHERE id = NEW.id
    AND OLD.status NOT IN ('paid', 'processing', 'shipped', 'completed')
    AND NEW.status IN ('paid', 'processing', 'shipped', 'completed')
    AND OLD.stock_deducted = 0;

  UPDATE products
  SET stock = stock + (
    SELECT SUM(oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = products.id
  )
  WHERE OLD.status IN ('paid', 'processing', 'shipped', 'completed')
    AND NEW.status NOT IN ('paid', 'processing', 'shipped', 'completed')
    AND OLD.stock_deducted = 1
    AND id IN (SELECT product_id FROM order_items WHERE order_id = NEW.id);

  UPDATE orders
  SET stock_deducted = 0
  WHERE id = NEW.id
    AND OLD.status IN ('paid', 'processing', 'shipped', 'completed')
    AND NEW.status NOT IN ('paid', 'processing', 'shipped', 'completed')
    AND OLD.stock_deducted = 1;
END;

-- İlk ürünler. Fiyatları admin panelinden değiştirebilirsin.
INSERT OR IGNORE INTO products
(id,name,slug,description,price,stock,image_url,category,active,created_at,updated_at)
VALUES
('kahve','Türk Kahvesi','turk-kahvesi','Karesi Beyi Türk Kahvesi',0,0,'assets/kuruyemisler/turk-kahvesi.jpeg','kuruyemisler',1,datetime('now'),datetime('now')),
('midye','Sebzeli Mini Midye Makarna','sebzeli-mini-midye-makarna','',0,0,'assets/unlu-mamuller/mini-midye-makarna.jpeg','unlu-mamuller',1,datetime('now'),datetime('now')),
('tahin','Tahin & Üzüm Pekmezi','tahin-uzum-pekmezi','',0,0,'assets/helvalar/tahin-pekmez.jpeg','helvalar',1,datetime('now'),datetime('now')),
('eriste','Sebzeli Erişte','sebzeli-eriste','',0,0,'assets/unlu-mamuller/sebzeli-eriste.jpeg','unlu-mamuller',1,datetime('now'),datetime('now')),
('kolonya','Zeytin Çiçeği Kolonyası','zeytin-cicegi-kolonyasi','',0,0,'assets/kolonyalar/zeytin-cicegi-kolonyasi.jpeg','kolonyalar',1,datetime('now'),datetime('now')),
('draje','Draje Çeşitleri','draje-cesitleri','',0,0,'assets/drajeler/drajemix.jpeg','drajeler',1,datetime('now'),datetime('now')),
('beze','Sade Beze','sade-beze','',0,0,'assets/kurabiyeler/sade-beze.jpeg','kurabiyeler',1,datetime('now'),datetime('now')),
('kurabiye','Tatlı Kurabiye','tatli-kurabiye','',0,0,'assets/kurabiyeler/tatli-kurabiye.jpeg','kurabiyeler',1,datetime('now'),datetime('now')),
('karisik','Özel Karışık','ozel-karisik','',0,0,'assets/kuruyemisler/ozel-karisik.jpeg','kuruyemisler',1,datetime('now'),datetime('now'));

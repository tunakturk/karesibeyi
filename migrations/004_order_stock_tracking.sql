ALTER TABLE orders
ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_order_items_order_product
ON order_items(order_id, product_id);

CREATE TRIGGER orders_check_stock_before_sale
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

CREATE TRIGGER orders_update_stock_after_status
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

CREATE TABLE orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sku NVARCHAR(64) NOT NULL,
    customer_id INT,
    CONSTRAINT uq_orders_sku UNIQUE (sku)
);
CREATE INDEX ix_orders_customer ON orders(customer_id);
CREATE PROCEDURE get_order AS SELECT id, sku FROM orders;
INSERT INTO orders (sku) VALUES ('fixture-row');

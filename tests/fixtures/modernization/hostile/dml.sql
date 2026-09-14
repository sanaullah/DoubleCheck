CREATE TABLE orders (id INT, status VARCHAR(20));
INSERT INTO orders VALUES (1, 'seed-row');
UPDATE orders SET status = 'changed';
DELETE FROM orders;

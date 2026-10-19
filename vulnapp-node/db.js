const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'vulnapp.db');
const db = new DatabaseSync(DB_PATH);

function seed() {
  db.exec(`
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS comments;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      is_admin INTEGER DEFAULT 0,
      ssn TEXT
    );

    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      price REAL
    );

    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      author TEXT,
      body TEXT
    );
  `);

  const insertUser = db.prepare('INSERT INTO users (username, password, email, is_admin, ssn) VALUES (?,?,?,?,?)');
  insertUser.run('alice', 'alice123', 'alice@example.com', 0, '123-45-6789');
  insertUser.run('bob', 'bobpass', 'bob@example.com', 0, '987-65-4321');
  insertUser.run('admin', 'admin!2024', 'admin@example.com', 1, '000-00-0000');

  const insertProduct = db.prepare('INSERT INTO products (name, description, price) VALUES (?,?,?)');
  insertProduct.run('Wireless Mouse', 'Ergonomic 2.4GHz wireless mouse', 19.99);
  insertProduct.run('Mechanical Keyboard', 'RGB backlit mechanical keyboard', 59.99);
  insertProduct.run('USB-C Hub', '7-in-1 USB-C hub with HDMI', 29.99);
  insertProduct.run('Webcam 1080p', 'Full HD webcam with autofocus', 34.99);
  insertProduct.run('Laptop Stand', 'Aluminum adjustable laptop stand', 24.99);

  const insertComment = db.prepare('INSERT INTO comments (product_id, author, body) VALUES (?,?,?)');
  insertComment.run(1, 'alice', 'Great mouse, very responsive!');
  insertComment.run(2, 'bob', 'Love the RGB lighting on this keyboard.');
}

module.exports = { db, seed };

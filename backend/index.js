CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name TEXT,
  type TEXT,
  quantity INT,
  critical_min INT,
  order_link TEXT
);

CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  name TEXT
);

CREATE TABLE device_components (
  id SERIAL PRIMARY KEY,
  device_id INT,
  item_id INT,
  quantity INT
);

CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  action TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE snapshots (
  id SERIAL PRIMARY KEY,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);


const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static(__dirname));

// Ruta principal para servir el index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize SQLite database
const db = new sqlite3.Database('./ap-pos.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the ap-pos.db database.');
});

// Create tables if they don't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        telefono TEXT,
        cumpleaños TEXT,
        consentimiento INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS movements (
        id TEXT PRIMARY KEY,
        folio TEXT,
        fechaISO TEXT,
        clienteId TEXT,
        tipo TEXT,
        monto REAL,
        metodo TEXT,
        concepto TEXT,
        staff TEXT,
        notas TEXT,
        fechaCita TEXT,
        horaCita TEXT,
        FOREIGN KEY (clienteId) REFERENCES clients (id)
    )`);
});

// API routes will go here

// --- Settings ---
app.get('/api/settings', (req, res) => {
    db.get("SELECT value FROM settings WHERE key = 'settings'", (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row ? JSON.parse(row.value) : {});
    });
});

app.post('/api/settings', (req, res) => {
    const { settings } = req.body;
    const value = JSON.stringify(settings);
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('settings', ?)`, [value], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Settings saved' });
    });
});

// --- Clients ---
app.get('/api/clients', (req, res) => {
    db.all("SELECT * FROM clients", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/clients', (req, res) => {
    const { client } = req.body;
    const { id, nombre, telefono, cumpleaños, consentimiento } = client;
    db.run(`INSERT OR REPLACE INTO clients (id, nombre, telefono, cumpleaños, consentimiento) VALUES (?, ?, ?, ?, ?)`,
        [id, nombre, telefono, cumpleaños, consentimiento], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id });
    });
});

app.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM clients WHERE id = ?`, id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Client deleted' });
    });
});


// --- Movements ---
app.get('/api/movements', (req, res) => {
    db.all("SELECT * FROM movements ORDER BY fechaISO DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/movements', (req, res) => {
    const { movement } = req.body;
    const { id, folio, fechaISO, clienteId, tipo, monto, metodo, concepto, staff, notas, fechaCita, horaCita } = movement;
    db.run(`INSERT INTO movements (id, folio, fechaISO, clienteId, tipo, monto, metodo, concepto, staff, notas, fechaCita, horaCita)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, folio, fechaISO, clienteId, tipo, monto, metodo, concepto, staff, notas, fechaCita, horaCita], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id });
    });
});

app.delete('/api/movements/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM movements WHERE id = ?`, id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Movement deleted' });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

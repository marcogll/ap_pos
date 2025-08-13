
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Servir archivos estáticos como CSS, JS, etc.

// Session Middleware
app.use(session({
  secret: 'your-very-secret-key-change-it', // Cambia esto por una clave secreta real
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } // `secure: true` en producción con HTTPS
}));

// --- DATABASE INITIALIZATION ---
const db = new sqlite3.Database('./ap-pos.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the ap-pos.db database.');
});

// --- AUTHENTICATION LOGIC ---
const SALT_ROUNDS = 10;

// Crear tabla de usuarios y usuario admin por defecto si no existen
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`, (err) => {
        if (err) return;
        // Solo intentar insertar si la tabla fue creada o ya existía
        const adminUsername = 'admin';
        const defaultPassword = 'password';

        db.get('SELECT * FROM users WHERE username = ?', [adminUsername], (err, row) => {
            if (err) return;
            if (!row) {
                bcrypt.hash(defaultPassword, SALT_ROUNDS, (err, hash) => {
                    if (err) return;
                    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [adminUsername, hash], (err) => {
                        if (!err) {
                            console.log(`Default user '${adminUsername}' created with password '${defaultPassword}'. Please change it.`);
                        }
                    });
                });
            }
        });
    });

    // Tablas existentes
    db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, cumpleaños TEXT, consentimiento INTEGER)`);
    db.run(`CREATE TABLE IF NOT EXISTS movements (id TEXT PRIMARY KEY, folio TEXT, fechaISO TEXT, clienteId TEXT, tipo TEXT, monto REAL, metodo TEXT, concepto TEXT, staff TEXT, notas TEXT, fechaCita TEXT, horaCita TEXT, FOREIGN KEY (clienteId) REFERENCES clients (id))`);
});

// Middleware para verificar si el usuario está autenticado
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    // Para peticiones de API, devolver un error 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    // Para otras peticiones, redirigir al login
    res.redirect('/login.html');
  }
};

// --- AUTH API ROUTES ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            req.session.userId = user.id;
            res.json({ message: 'Login successful' });
        });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.clearCookie('connect.sid'); // Limpiar la cookie de sesión
        res.json({ message: 'Logout successful' });
    });
});

// Endpoint para verificar el estado de la autenticación en el frontend
app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});


// --- PROTECTED APPLICATION ROUTES ---

// La ruta principal ahora está protegida
app.get('/', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Proteger todas las rutas de la API
const apiRouter = express.Router();
apiRouter.use(isAuthenticated);


// --- Settings ---
apiRouter.get('/settings', (req, res) => {
    db.get("SELECT value FROM settings WHERE key = 'settings'", (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row ? JSON.parse(row.value) : {});
    });
});

apiRouter.post('/settings', (req, res) => {
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
apiRouter.get('/clients', (req, res) => {
    db.all("SELECT * FROM clients", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

apiRouter.post('/clients', (req, res) => {
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

apiRouter.delete('/clients/:id', (req, res) => {
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
apiRouter.get('/movements', (req, res) => {
    db.all("SELECT * FROM movements ORDER BY fechaISO DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

apiRouter.post('/movements', (req, res) => {
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

apiRouter.delete('/movements/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM movements WHERE id = ?`, id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Movement deleted' });
    });
});

// Registrar el router de la API protegida
app.use('/api', apiRouter);

// --- Dashboard Route ---
apiRouter.get('/dashboard', (req, res) => {
    const queries = {
        totalIncome: "SELECT SUM(monto) as total FROM movements WHERE tipo = 'Pago'",
        totalMovements: "SELECT COUNT(*) as total FROM movements",
        incomeByService: "SELECT tipo, SUM(monto) as total FROM movements WHERE tipo = 'Pago' GROUP BY tipo"
    };

    const results = {};
    const promises = Object.keys(queries).map(key => {
        return new Promise((resolve, reject) => {
            db.all(queries[key], [], (err, rows) => {
                if (err) {
                    return reject(err);
                }
                if (key === 'totalIncome' || key === 'totalMovements') {
                    resolve({ key, value: rows[0] ? rows[0].total : 0 });
                } else {
                    resolve({ key, value: rows });
                }
            });
        });
    });

    Promise.all(promises)
        .then(allResults => {
            allResults.forEach(result => {
                results[result.key] = result.value;
            });
            res.json(results);
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


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
const dbPath = process.env.DB_PATH || './ap-pos.db';
console.log(`Connecting to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

// --- AUTHENTICATION LOGIC ---
const SALT_ROUNDS = 10;

// Crear tabla de usuarios y usuario admin por defecto si no existen
db.serialize(() => {
    // Añadir columna 'role' si no existe
    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error adding role column to users table:", err.message);
        }
    });

    db.run("ALTER TABLE users ADD COLUMN name TEXT", (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error adding name column to users table:", err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        name TEXT
    )`, (err) => {
        if (err) return;
        // Solo intentar insertar si la tabla fue creada o ya existía
        const adminUsername = 'admin';
        const defaultPassword = 'password';
        const defaultName = 'Admin'; // Nombre por defecto para el admin

        db.get('SELECT * FROM users WHERE username = ?', [adminUsername], (err, row) => {
            if (err) return;
            if (!row) {
                bcrypt.hash(defaultPassword, SALT_ROUNDS, (err, hash) => {
                    if (err) return;
                    // Insertar admin con su rol y nombre
                    db.run('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)', [adminUsername, hash, 'admin', defaultName], (err) => {
                        if (!err) {
                            console.log(`Default user '${adminUsername}' created with name '${defaultName}', password '${defaultPassword}' and role 'admin'. Please change it.`);
                        }
                    });
                });
            } else {
                // Si el usuario admin ya existe, asegurarse de que tenga el rol de admin
                db.run("UPDATE users SET role = 'admin' WHERE username = ?", [adminUsername]);
            }
        });
    });

    // Tablas existentes
    db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY, 
        nombre TEXT, 
        telefono TEXT, 
        genero TEXT,
        cumpleaños TEXT, 
        consentimiento INTEGER,
        esOncologico INTEGER,
        oncologoAprueba INTEGER,
        nombreMedico TEXT,
        telefonoMedico TEXT,
        cedulaMedico TEXT,
        pruebaAprobacion INTEGER
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS movements (id TEXT PRIMARY KEY, folio TEXT, fechaISO TEXT, clienteId TEXT, tipo TEXT, subtipo TEXT, monto REAL, metodo TEXT, concepto TEXT, staff TEXT, notas TEXT, fechaCita TEXT, horaCita TEXT, FOREIGN KEY (clienteId) REFERENCES clients (id))`);
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

// Middleware para verificar si el usuario es admin
const isAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({ error: 'Forbidden: Admins only' });
        }
    });
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
            req.session.role = user.role; // Guardar rol en la sesión
            req.session.name = user.name; // Guardar nombre en la sesión
            res.json({ message: 'Login successful', role: user.role, name: user.name });
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
        res.json({ isAuthenticated: true, role: req.session.role, name: req.session.name });
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
    const { 
        id, nombre, telefono, genero, cumpleaños, consentimiento,
        esOncologico, oncologoAprueba, nombreMedico, telefonoMedico, cedulaMedico, pruebaAprobacion 
    } = client;
    db.run(`INSERT OR REPLACE INTO clients (
            id, nombre, telefono, genero, cumpleaños, consentimiento, 
            esOncologico, oncologoAprueba, nombreMedico, telefonoMedico, cedulaMedico, pruebaAprobacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id, nombre, telefono, genero, cumpleaños, consentimiento,
            esOncologico, oncologoAprueba, nombreMedico, telefonoMedico, cedulaMedico, pruebaAprobacion
        ], function(err) {
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
    const { id, folio, fechaISO, clienteId, tipo, subtipo, monto, metodo, concepto, staff, notas, fechaCita, horaCita } = movement;
    db.run(`INSERT INTO movements (id, folio, fechaISO, clienteId, tipo, subtipo, monto, metodo, concepto, staff, notas, fechaCita, horaCita)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, folio, fechaISO, clienteId, tipo, subtipo, monto, metodo, concepto, staff, notas, fechaCita, horaCita], function(err) {
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

// --- Client History ---
apiRouter.get('/clients/:id/history', (req, res) => {
    const { id } = req.params;
    db.all("SELECT * FROM movements WHERE clienteId = ? ORDER BY fechaISO DESC", [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Registrar el router de la API protegida
app.use('/api', apiRouter);

// --- User Management (Admin) ---
// Proteger estas rutas para que solo los admins puedan usarlas
apiRouter.get('/users', isAdmin, (req, res) => {
    db.all("SELECT id, username, role, name FROM users", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

apiRouter.post('/users', isAdmin, (req, res) => {
    const { username, password, role, name } = req.body;
    if (!username || !password || !role || !name) {
        return res.status(400).json({ error: 'Username, password, name, and role are required' });
    }
    if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: 'Invalid role' });
    }

    bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Error hashing password' });
        }
        db.run('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)', [username, hash, role, name], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, username, role, name });
        });
    });
});

// Nueva ruta para actualizar un usuario (solo admin)
apiRouter.put('/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { username, role, name } = req.body;

    if (!username || !role || !name) {
        return res.status(400).json({ error: 'Username, role, and name are required' });
    }

    db.run('UPDATE users SET username = ?, role = ?, name = ? WHERE id = ?', [username, role, name, id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User updated successfully' });
    });
});

apiRouter.delete('/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    // Prevenir que el admin se elimine a sí mismo
    if (parseInt(id, 10) === req.session.userId) {
        return res.status(400).json({ error: "You cannot delete your own account." });
    }
    db.run(`DELETE FROM users WHERE id = ?`, id, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ message: 'User deleted' });
    });
});


// --- Current User Settings ---
apiRouter.get('/user', (req, res) => {
    db.get("SELECT id, username, role, name FROM users WHERE id = ?", [req.session.userId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

apiRouter.post('/user', (req, res) => {
    const { username, password, name } = req.body;
    if (!username || !name) {
        return res.status(400).json({ error: 'Username and name are required' });
    }

    if (password) {
        // Si se proporciona una nueva contraseña, hashearla y actualizar todo
        bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
            if (err) {
                return res.status(500).json({ error: 'Error hashing password' });
            }
            db.run('UPDATE users SET username = ?, password = ?, name = ? WHERE id = ?', [username, hash, name, req.session.userId], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'User credentials updated successfully' });
            });
        });
    } else {
        // Si no se proporciona contraseña, solo actualizar el nombre de usuario y el nombre
        db.run('UPDATE users SET username = ?, name = ? WHERE id = ?', [username, name, req.session.userId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Username and name updated successfully' });
        });
    }
});

// --- Dashboard Route (Admin Only) ---
apiRouter.get('/dashboard', isAdmin, (req, res) => {
    const queries = {
        totalIncome: "SELECT SUM(monto) as total FROM movements",
        totalMovements: "SELECT COUNT(*) as total FROM movements",
        incomeByService: "SELECT tipo, SUM(monto) as total FROM movements GROUP BY tipo",
        incomeByPaymentMethod: "SELECT metodo, SUM(monto) as total FROM movements WHERE metodo IS NOT NULL AND metodo != '' GROUP BY metodo",
        upcomingAppointments: `
            SELECT m.id, m.folio, m.fechaCita, m.horaCita, c.nombre as clienteNombre 
            FROM movements m 
            JOIN clients c ON m.clienteId = c.id 
            WHERE m.fechaCita IS NOT NULL AND m.fechaCita >= date('now')
            ORDER BY m.fechaCita ASC, m.horaCita ASC 
            LIMIT 5`
    };

    const results = {};
    const promises = Object.keys(queries).map(key => {
        return new Promise((resolve, reject) => {
            const query = queries[key];
            // Usar db.all para consultas que devuelven múltiples filas
            const method = ['incomeByService', 'incomeByPaymentMethod', 'upcomingAppointments'].includes(key) ? 'all' : 'get';
            
            db[method](query, [], (err, result) => {
                if (err) {
                    return reject(err);
                }
                if (method === 'get') {
                     resolve({ key, value: result ? result.total : 0 });
                } else {
                    resolve({ key, value: result });
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

const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const port = 3111;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// Cargar una clave secreta desde variables de entorno o usar una por defecto (solo para desarrollo)
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-very-secret-key-change-it';
const IN_PROD = process.env.NODE_ENV === 'production';

// Session Middleware
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } // secure: false para VPS sin HTTPS
}));

// --- DATABASE INITIALIZATION ---
// Usar un path que funcione tanto en desarrollo como en Docker
const dbPath = process.env.DB_PATH || (
  process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, 'data', 'ap-pos.db')
    : path.join(__dirname, 'ap-pos.db')
);
console.log(`Connecting to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
    initializeApplication(); // Iniciar la aplicación después de conectar a la DB
});

// --- AUTHENTICATION LOGIC ---
const SALT_ROUNDS = 10;

let needsSetup = false;

function initializeApplication() {
    db.serialize(() => {
        // Crear tabla de usuarios si no existe
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user',
            name TEXT
        )`, (err) => {
            if (err) {
                console.error("Error creating users table:", err.message);
                startServer(); // Iniciar el servidor incluso si hay error para no colgar el proceso
                return;
            }
            // Asegurar que las columnas 'role' y 'name' existan
            db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error("Error adding role column:", err.message);
                }
            });
            db.run("ALTER TABLE users ADD COLUMN name TEXT", (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error("Error adding name column:", err.message);
                }
            });

            // Verificar si hay usuarios
            db.get('SELECT COUNT(id) as count FROM users', (err, row) => {
                if (err) {
                    console.error("Error checking for users:", err.message);
                } else {
                    if (row.count === 0) {
                        console.log("No users found. Application needs setup.");
                        needsSetup = true;
                    } else {
                        console.log(`${row.count} user(s) found. Setup is not required.`);
                    }
                }
                
                // Crear otras tablas después de la verificación de usuarios
                db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
                db.run(`CREATE TABLE IF NOT EXISTS clients (
                    id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, genero TEXT, cumpleaños TEXT, 
                    consentimiento INTEGER, esOncologico INTEGER, oncologoAprueba INTEGER, nombreMedico TEXT, 
                    telefonoMedico TEXT, cedulaMedico TEXT, pruebaAprobacion INTEGER
                )`);
                db.run(`CREATE TABLE IF NOT EXISTS movements (
                    id TEXT PRIMARY KEY, folio TEXT, fechaISO TEXT, clienteId TEXT, tipo TEXT, subtipo TEXT, 
                    monto REAL, metodo TEXT, concepto TEXT, staff TEXT, notas TEXT, fechaCita TEXT, horaCita TEXT, 
                    FOREIGN KEY (clienteId) REFERENCES clients (id)
                )`);

                // --- Tablas de Cursos y Productos ---
                db.run(`CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL, -- 'service' or 'course'
                    price REAL
                )`, (err) => {
                    if (err) {
                        console.error("Error creating products table:", err.message);
                    } else {
                        // Insertar cursos iniciales si no existen
                        const courses = ['Vanity Lashes', 'Vanity Brows'];
                        courses.forEach(course => {
                            db.get("SELECT id FROM products WHERE name = ? AND type = 'course'", [course], (err, row) => {
                                if (!row) {
                                    db.run("INSERT INTO products (name, type, price) VALUES (?, 'course', 0)", [course]);
                                }
                            });
                        });
                    }
                });

                db.run(`CREATE TABLE IF NOT EXISTS client_courses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id TEXT NOT NULL,
                    course_id INTEGER NOT NULL,
                    fecha_curso TEXT,
                    completo_presencial INTEGER DEFAULT 0,
                    completo_online INTEGER DEFAULT 0,
                    realizo_practicas INTEGER DEFAULT 0,
                    obtuvo_certificacion INTEGER DEFAULT 0,
                    score_general TEXT,
                    FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
                    FOREIGN KEY (course_id) REFERENCES products (id) ON DELETE CASCADE
                )`);

                // --- Tabla de Solicitudes de Cancelación ---
                db.run(`CREATE TABLE IF NOT EXISTS cancellation_requests (
                    id TEXT PRIMARY KEY,
                    movement_id TEXT NOT NULL,
                    requested_by TEXT NOT NULL, -- user id
                    reason TEXT NOT NULL,
                    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied'
                    created_at TEXT NOT NULL,
                    reviewed_by TEXT,
                    reviewed_at TEXT,
                    admin_notes TEXT,
                    FOREIGN KEY (movement_id) REFERENCES movements (id),
                    FOREIGN KEY (requested_by) REFERENCES users (id),
                    FOREIGN KEY (reviewed_by) REFERENCES users (id)
                )`);

                // Agregar columna de estado temporal a movements
                db.run("ALTER TABLE movements ADD COLUMN temp_cancelled INTEGER DEFAULT 0", (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error("Error adding temp_cancelled column:", err.message);
                    }
                });

                // Agregar columnas para categorización de productos
                db.run("ALTER TABLE products ADD COLUMN category TEXT", (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error("Error adding category column:", err.message);
                    }
                });
                
                db.run("ALTER TABLE products ADD COLUMN subcategory TEXT", (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error("Error adding subcategory column:", err.message);
                    }
                });

                db.run("ALTER TABLE products ADD COLUMN custom_price INTEGER DEFAULT 0", (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error("Error adding custom_price column:", err.message);
                    }
                });

                // Agregar campo de orden para control de secuencia
                db.run("ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0", (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error("Error adding sort_order column:", err.message);
                    }
                });

                // Verificar si hay productos, si no, importar los productos por defecto
                db.get("SELECT COUNT(*) as count FROM products", [], (err, row) => {
                    if (!err && row.count === 0) {
                        console.log("No products found, importing default products...");
                        importDefaultProducts();
                    }
                });

                // Una vez completada toda la inicialización de la DB, iniciar el servidor
                startServer();
            });
        });
    });
}

function importDefaultProducts() {
    const defaultProducts = [
        // Servicios principales con orden correcto
        { name: "Extensión de Pestañas (Clean Girl)", type: "service", price: 1570, category: "Pestañas", subcategory: "Servicios", custom_price: false, sort_order: 1 },
        { name: "Extensión de Pestañas (Elegant Lashes)", type: "service", price: 950, category: "Pestañas", subcategory: "Servicios", custom_price: false, sort_order: 10 },
        { name: "Extensión de Pestañas (Mystery Lashes)", type: "service", price: 1210, category: "Pestañas", subcategory: "Servicios", custom_price: false, sort_order: 20 },
        { name: "Extensión de Pestañas (Seduction Lashes)", type: "service", price: 1580, category: "Pestañas", subcategory: "Servicios", custom_price: false, sort_order: 30 },
        
        // Retoques agrupados
        { name: "Elegant Lashes - Retoque (1ª Semana)", type: "service", price: 320, category: "Pestañas", subcategory: "Retoques - Elegant Lashes", custom_price: false, sort_order: 11 },
        { name: "Elegant Lashes - Retoque (2ª Semana)", type: "service", price: 420, category: "Pestañas", subcategory: "Retoques - Elegant Lashes", custom_price: false, sort_order: 12 },
        { name: "Elegant Lashes - Retoque (3ª Semana)", type: "service", price: 530, category: "Pestañas", subcategory: "Retoques - Elegant Lashes", custom_price: false, sort_order: 13 },
        
        { name: "Mystery Lashes - Retoque (1ª Semana)", type: "service", price: 330, category: "Pestañas", subcategory: "Retoques - Mystery Lashes", custom_price: false, sort_order: 21 },
        { name: "Mystery Lashes - Retoque (2ª Semana)", type: "service", price: 430, category: "Pestañas", subcategory: "Retoques - Mystery Lashes", custom_price: false, sort_order: 22 },
        { name: "Mystery Lashes - Retoque (3ª Semana)", type: "service", price: 540, category: "Pestañas", subcategory: "Retoques - Mystery Lashes", custom_price: false, sort_order: 23 },
        
        { name: "Seduction Lashes - Retoque (1ª Semana)", type: "service", price: 340, category: "Pestañas", subcategory: "Retoques - Seduction Lashes", custom_price: false, sort_order: 31 },
        { name: "Seduction Lashes - Retoque (2ª Semana)", type: "service", price: 440, category: "Pestañas", subcategory: "Retoques - Seduction Lashes", custom_price: false, sort_order: 32 },
        { name: "Seduction Lashes - Retoque (3ª Semana)", type: "service", price: 550, category: "Pestañas", subcategory: "Retoques - Seduction Lashes", custom_price: false, sort_order: 33 },
        
        // Otros servicios
        { name: "Lash Lifting", type: "service", price: 740, category: "Pestañas", subcategory: "Servicios", custom_price: false, sort_order: 100 },
        { name: "Retiro de pestañas", type: "service", price: 140, category: "Pestañas", subcategory: "Servicios", custom_price: false, sort_order: 101 },
        { name: "Tinte para pestañas (Lash Lifting)", type: "service", price: 210, category: "Pestañas", subcategory: "Servicios", custom_price: false, sort_order: 102 },
        
        // Microblading
        { name: "Retoque Vanity Brows (Microblading)", type: "service", price: 3680, category: "Microblading", subcategory: "Servicios", custom_price: false, sort_order: 200 },
        { name: "Vanity Lips", type: "service", price: 5250, category: "Microblading", subcategory: "Servicios", custom_price: false, sort_order: 201 },
        { name: "Microblading Vanity Brows", type: "service", price: 5250, category: "Microblading", subcategory: "Servicios", custom_price: false, sort_order: 202 },
        { name: "Powder Brows", type: "service", price: 3680, category: "Microblading", subcategory: "Servicios", custom_price: false, sort_order: 203 },
        
        // Nail Art
        { name: "Nail Art", type: "service", price: null, category: "Uñas", subcategory: "Servicios", custom_price: true, sort_order: 300 }
    ];
    
    const stmt = db.prepare(`INSERT INTO products 
        (name, type, price, category, subcategory, custom_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    
    defaultProducts.forEach(product => {
        stmt.run([
            product.name,
            product.type,
            product.price,
            product.category,
            product.subcategory,
            product.custom_price ? 1 : 0,
            product.sort_order
        ], function(err) {
            if (err) {
                console.error(`Error inserting product ${product.name}:`, err.message);
            }
        });
    });
    
    stmt.finalize(function(err) {
        if (!err) {
            console.log(`✅ Default products imported successfully (${defaultProducts.length} products)`);
        }
    });
}

function startServer() {
    // --- SETUP & AUTH MIDDLEWARE ---

    // Middleware para manejar la redirección a la página de configuración
    const checkSetup = (req, res, next) => {
        const allowedPaths = [
        '/setup.html', '/setup.js', '/api/setup',
        '/login.html', '/login.js', '/api/login', 
        '/styles.css', '/src/logo.png', '/api/check-auth'
    ];
        if (needsSetup && !allowedPaths.includes(req.path)) {
            return res.redirect('/setup.html');
        }
        next();
    };

    // Aplicar el middleware de configuración a todas las rutas
    app.use(checkSetup);

    // Servir archivos estáticos DESPUÉS del middleware de setup
    app.use(express.static(__dirname));

    // Middleware para verificar si el usuario está autenticado
    const isAuthenticated = (req, res, next) => {
        if (req.session.userId) {
            return next();
        }
        // Para las rutas de la API, devolver un error 401 en lugar de redirigir.
        if (req.originalUrl.startsWith('/api/')) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        // Para las rutas de la UI, redirigir al login si no hay sesión.
        if (!needsSetup) {
            return res.redirect('/login.html');
        }
        next();
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


    // --- API ROUTES ---

    app.post('/api/setup', (req, res) => {
        if (!needsSetup) {
            return res.status(403).json({ error: 'Setup has already been completed.' });
        }
        const { name, username, password } = req.body;
        if (!name || !username || !password) {
            return res.status(400).json({ error: 'Name, username, and password are required' });
        }
        bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
            if (err) {
                return res.status(500).json({ error: 'Error hashing password' });
            }
            db.run('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)', [username, hash, 'admin', name], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'Username already exists' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                console.log("Administrator account created. Setup is now complete.");
                needsSetup = false;
                res.status(201).json({ message: 'Admin user created successfully' });
            });
        });
    });

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
                req.session.role = user.role;
                req.session.name = user.name;
                res.json({ message: 'Login successful', role: user.role, name: user.name });
            });
        });
    });

    app.post('/api/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ error: 'Could not log out' });
            }
            res.clearCookie('connect.sid');
            res.json({ message: 'Logout successful' });
        });
    });

    app.get('/api/check-auth', (req, res) => {
        if (req.session.userId) {
            res.json({ isAuthenticated: true, role: req.session.role, name: req.session.name });
        } else {
            res.json({ isAuthenticated: false });
        }
    });

    // --- PROTECTED ROUTES ---

    app.get('/', isAuthenticated, (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    const apiRouter = express.Router();
    apiRouter.use(isAuthenticated);

    // --- Settings ---
    apiRouter.get('/settings', (req, res) => {
        db.get("SELECT value FROM settings WHERE key = 'settings'", (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row ? JSON.parse(row.value) : {});
        });
    });

    apiRouter.post('/settings', (req, res) => {
        const { settings } = req.body;
        const value = JSON.stringify(settings);
        db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('settings', ?)`, [value], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Settings saved' });
        });
    });

    // --- Clients ---
    apiRouter.get('/clients', (req, res) => {
        db.all("SELECT * FROM clients", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    apiRouter.post('/clients', (req, res) => {
        const { client } = req.body;
        db.run(`INSERT OR REPLACE INTO clients (id, nombre, telefono, genero, cumpleaños, consentimiento, esOncologico, oncologoAprueba, nombreMedico, telefonoMedico, cedulaMedico, pruebaAprobacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [client.id, client.nombre, client.telefono, client.genero, client.cumpleaños, client.consentimiento, client.esOncologico, client.oncologoAprueba, client.nombreMedico, client.telefonoMedico, client.cedulaMedico, client.pruebaAprobacion], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: client.id });
        });
    });

    apiRouter.delete('/clients/:id', (req, res) => {
        db.run(`DELETE FROM clients WHERE id = ?`, req.params.id, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Client deleted' });
        });
    });

    // --- Movements ---
    apiRouter.get('/movements', (req, res) => {
        db.all("SELECT * FROM movements WHERE temp_cancelled = 0 OR temp_cancelled IS NULL ORDER BY fechaISO DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    apiRouter.post('/movements', (req, res) => {
        const { movement } = req.body;
        db.run(`INSERT INTO movements (id, folio, fechaISO, clienteId, tipo, subtipo, monto, metodo, concepto, staff, notas, fechaCita, horaCita) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [movement.id, movement.folio, movement.fechaISO, movement.clienteId, movement.tipo, movement.subtipo, movement.monto, movement.metodo, movement.concepto, movement.staff, movement.notas, movement.fechaCita, movement.horaCita], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: movement.id });
        });
    });

    apiRouter.delete('/movements/:id', isAdmin, (req, res) => {
        db.run(`DELETE FROM movements WHERE id = ?`, req.params.id, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Movement deleted' });
        });
    });

    // --- Cancellation Requests ---
    apiRouter.post('/movements/:id/cancel-request', (req, res) => {
        const { reason } = req.body;
        const movementId = req.params.id;
        
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ error: 'Reason is required' });
        }

        const requestId = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        // First, check if movement exists and is not already cancelled
        db.get("SELECT * FROM movements WHERE id = ?", [movementId], (err, movement) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!movement) return res.status(404).json({ error: 'Movement not found' });
            if (movement.temp_cancelled) return res.status(400).json({ error: 'Movement already has a pending cancellation request' });

            // Check if there's already a pending request
            db.get("SELECT * FROM cancellation_requests WHERE movement_id = ? AND status = 'pending'", [movementId], (err, existingRequest) => {
                if (err) return res.status(500).json({ error: err.message });
                if (existingRequest) return res.status(400).json({ error: 'There is already a pending cancellation request for this sale' });

                // Create cancellation request
                db.run(`INSERT INTO cancellation_requests (id, movement_id, requested_by, reason, status, created_at) 
                        VALUES (?, ?, ?, ?, 'pending', ?)`,
                    [requestId, movementId, req.session.userId, reason.trim(), createdAt], function(err) {
                    if (err) return res.status(500).json({ error: err.message });

                    // Mark movement as temporarily cancelled
                    db.run("UPDATE movements SET temp_cancelled = 1 WHERE id = ?", [movementId], function(err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.status(201).json({ 
                            message: 'Cancellation request created successfully',
                            requestId: requestId 
                        });
                    });
                });
            });
        });
    });

    apiRouter.get('/cancellation-requests', isAdmin, (req, res) => {
        const sql = `
            SELECT cr.*, u.name as requested_by_name, m.folio, m.monto, m.concepto, c.nombre as client_name
            FROM cancellation_requests cr
            LEFT JOIN users u ON cr.requested_by = u.id
            LEFT JOIN movements m ON cr.movement_id = m.id
            LEFT JOIN clients c ON m.clienteId = c.id
            ORDER BY cr.created_at DESC
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    apiRouter.put('/cancellation-requests/:id', isAdmin, (req, res) => {
        const { status, admin_notes } = req.body;
        const requestId = req.params.id;
        
        if (!status || !['approved', 'denied'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be approved or denied' });
        }

        const reviewedAt = new Date().toISOString();

        db.get("SELECT * FROM cancellation_requests WHERE id = ?", [requestId], (err, request) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!request) return res.status(404).json({ error: 'Cancellation request not found' });
            if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

            // Update request status
            db.run(`UPDATE cancellation_requests SET status = ?, reviewed_by = ?, reviewed_at = ?, admin_notes = ? WHERE id = ?`,
                [status, req.session.userId, reviewedAt, admin_notes || '', requestId], function(err) {
                if (err) return res.status(500).json({ error: err.message });

                if (status === 'approved') {
                    // If approved, delete the movement
                    db.run("DELETE FROM movements WHERE id = ?", [request.movement_id], function(err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: 'Cancellation approved and sale deleted' });
                    });
                } else {
                    // If denied, remove temporary cancellation
                    db.run("UPDATE movements SET temp_cancelled = 0 WHERE id = ?", [request.movement_id], function(err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: 'Cancellation request denied and sale restored' });
                    });
                }
            });
        });
    });

    // --- Client History ---
    apiRouter.get('/clients/:id/history', (req, res) => {
        db.all("SELECT * FROM movements WHERE clienteId = ? ORDER BY fechaISO DESC", [req.params.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    // --- Product/Course Management ---
    apiRouter.get('/products', (req, res) => {
        db.all("SELECT * FROM products ORDER BY type, sort_order, name", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    apiRouter.post('/products', (req, res) => {
        const { name, type, price, category, subcategory, custom_price } = req.body;
        if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
        db.run(`INSERT INTO products (name, type, price, category, subcategory, custom_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, type, price || 0, category, subcategory, custom_price ? 1 : 0, 0], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, name, type, price, category, subcategory, custom_price, sort_order: 0 });
        });
    });

    apiRouter.put('/products/:id', (req, res) => {
        const { name, type, price, category, subcategory, custom_price } = req.body;
        if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
        db.run(`UPDATE products SET name = ?, type = ?, price = ?, category = ?, subcategory = ?, custom_price = ? WHERE id = ?`,
            [name, type, price || 0, category, subcategory, custom_price ? 1 : 0, req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Product updated' });
        });
    });

    // Bulk update products from JSON
    apiRouter.post('/products/bulk-import', isAdmin, (req, res) => {
        const { products } = req.body;
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: 'Products array is required' });
        }

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // Primero limpiar productos existentes para evitar duplicados
            db.run("DELETE FROM products WHERE 1=1", function(deleteErr) {
                if (deleteErr) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: deleteErr.message });
                }
                
                const stmt = db.prepare(`INSERT INTO products 
                    (name, type, price, category, subcategory, custom_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                
                products.forEach(product => {
                    stmt.run([
                        product.name,
                        product.type || 'service',
                        product.price || null,
                        product.category || null,
                        product.subcategory || null,
                        product.custom_price ? 1 : 0,
                        product.sort_order || 0
                    ]);
                });
                
                stmt.finalize();
                
                db.run("COMMIT", function(commitErr) {
                    if (commitErr) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: commitErr.message });
                    }
                    res.json({ message: 'Products imported successfully', count: products.length });
                });
            });
        });
    });

    apiRouter.delete('/products/:id', isAdmin, (req, res) => {
        db.run(`DELETE FROM products WHERE id = ?`, req.params.id, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Product deleted' });
        });
    });

    // --- Client-Course Management ---
    apiRouter.get('/clients/:id/courses', (req, res) => {
        const sql = `
            SELECT cc.*, p.name as course_name 
            FROM client_courses cc
            JOIN products p ON cc.course_id = p.id
            WHERE cc.client_id = ?
        `;
        db.all(sql, [req.params.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    apiRouter.post('/clients/:id/courses', (req, res) => {
        const { course_id, fecha_curso, completo_presencial, completo_online, realizo_practicas, obtuvo_certificacion, score_general } = req.body;
        db.run(`INSERT INTO client_courses (client_id, course_id, fecha_curso, completo_presencial, completo_online, realizo_practicas, obtuvo_certificacion, score_general) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, course_id, fecha_curso, completo_presencial, completo_online, realizo_practicas, obtuvo_certificacion, score_general],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ id: this.lastID });
            }
        );
    });
    
    // --- User Management (Admin) ---
    apiRouter.get('/users', isAdmin, (req, res) => {
        db.all("SELECT id, username, role, name FROM users", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    apiRouter.post('/users', isAdmin, (req, res) => {
        const { username, password, role, name } = req.body;
        if (!username || !password || !role || !name) return res.status(400).json({ error: 'All fields are required' });
        if (role !== 'admin' && role !== 'user') return res.status(400).json({ error: 'Invalid role' });

        bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
            if (err) return res.status(500).json({ error: 'Error hashing password' });
            db.run('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)', [username, hash, role, name], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Username already exists' });
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ id: this.lastID, username, role, name });
            });
        });
    });

    apiRouter.put('/users/:id', isAdmin, (req, res) => {
        const { id } = req.params;
        const { username, role, name } = req.body;
        if (!username || !role || !name) return res.status(400).json({ error: 'Username, role, and name are required' });

        db.run('UPDATE users SET username = ?, role = ?, name = ? WHERE id = ?', [username, role, name, id], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Username already exists' });
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
            res.json({ message: 'User updated successfully' });
        });
    });

    apiRouter.delete('/users/:id', isAdmin, (req, res) => {
        if (parseInt(req.params.id, 10) === req.session.userId) {
            return res.status(400).json({ error: "You cannot delete your own account." });
        }
        db.run(`DELETE FROM users WHERE id = ?`, req.params.id, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "User not found" });
            res.json({ message: 'User deleted' });
        });
    });

    // --- Current User Settings ---
    apiRouter.get('/user', isAuthenticated, (req, res) => {
        db.get("SELECT id, username, role, name FROM users WHERE id = ?", [req.session.userId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row);
        });
    });

    apiRouter.post('/user', isAuthenticated, (req, res) => {
        const { username, password, name } = req.body;
        if (!username || !name) return res.status(400).json({ error: 'Username and name are required' });

        if (password) {
            bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
                if (err) return res.status(500).json({ error: 'Error hashing password' });
                db.run('UPDATE users SET username = ?, password = ?, name = ? WHERE id = ?', [username, hash, name, req.session.userId], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'User credentials updated successfully' });
                });
            });
        } else {
            db.run('UPDATE users SET username = ?, name = ? WHERE id = ?', [username, name, req.session.userId], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Username and name updated successfully' });
            });
        }
    });
    
    // --- Dashboard Route (Authenticated Users) ---
    apiRouter.get('/dashboard', isAuthenticated, (req, res) => {
        const queries = {
            totalIncome: "SELECT SUM(monto) as total FROM movements WHERE temp_cancelled = 0 OR temp_cancelled IS NULL",
            totalMovements: "SELECT COUNT(*) as total FROM movements WHERE temp_cancelled = 0 OR temp_cancelled IS NULL",
            incomeByService: "SELECT tipo, SUM(monto) as total FROM movements WHERE temp_cancelled = 0 OR temp_cancelled IS NULL GROUP BY tipo",
            incomeByPaymentMethod: "SELECT metodo, SUM(monto) as total FROM movements WHERE (temp_cancelled = 0 OR temp_cancelled IS NULL) AND metodo IS NOT NULL AND metodo != '''' GROUP BY metodo",
            upcomingAppointments: `
                SELECT m.id, m.folio, m.fechaCita, m.horaCita, c.nombre as clienteNombre 
                FROM movements m 
                JOIN clients c ON m.clienteId = c.id 
                WHERE (m.temp_cancelled = 0 OR m.temp_cancelled IS NULL) AND m.fechaCita IS NOT NULL AND m.fechaCita >= date('now')
                ORDER BY m.fechaCita ASC, m.horaCita ASC 
                LIMIT 5`
        };

        const promises = Object.keys(queries).map(key => {
            return new Promise((resolve, reject) => {
                const query = queries[key];
                const method = ['incomeByService', 'incomeByPaymentMethod', 'upcomingAppointments'].includes(key) ? 'all' : 'get';
                db[method](query, [], (err, result) => {
                    if (err) return reject(err);
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
                const results = {};
                allResults.forEach(result => {
                    results[result.key] = result.value;
                });
                res.json(results);
            })
            .catch(err => {
                res.status(500).json({ error: err.message });
            });
    });

    app.use('/api', apiRouter);

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

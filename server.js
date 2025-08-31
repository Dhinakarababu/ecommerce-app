const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'ecommerce-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: '2004', // Replace with your MySQL password
    database: 'ecommerce_db'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database');
});

// Set EJS as templating engine
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    db.query('SELECT * FROM products LIMIT 8', (err, results) => {
        if (err) throw err;
        res.render('index', { products: results, user: req.session.user });
    });
});

app.get('/products', (req, res) => {
    const category = req.query.category;
    let query = 'SELECT * FROM products';
    let params = [];
    
    if (category) {
        query += ' WHERE category = ?';
        params.push(category);
    }
    
    db.query(query, params, (err, results) => {
        if (err) throw err;
        res.render('products', { products: results, user: req.session.user, category });
    });
});

app.get('/product/:id', (req, res) => {
    const productId = req.params.id;
    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.render('product-detail', { product: results[0], user: req.session.user });
        } else {
            res.status(404).send('Product not found');
        }
    });
});

app.get('/cart', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    db.query(
        `SELECT c.*, p.name, p.price, p.image_url 
         FROM cart c 
         JOIN products p ON c.product_id = p.id 
         WHERE c.user_id = ?`,
        [req.session.user.id],
        (err, results) => {
            if (err) throw err;
            
            let total = 0;
            results.forEach(item => {
                total += item.price * item.quantity;
            });
            
            res.render('cart', { cartItems: results, total: total.toFixed(2), user: req.session.user });
        }
    );
});

app.post('/add-to-cart', (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Please login first' });
    }
    
    const { productId, quantity } = req.body;
    
    // Check if product already in cart
    db.query(
        'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
        [req.session.user.id, productId],
        (err, results) => {
            if (err) throw err;
            
            if (results.length > 0) {
                // Update quantity if product already in cart
                const newQuantity = results[0].quantity + parseInt(quantity);
                db.query(
                    'UPDATE cart SET quantity = ? WHERE id = ?',
                    [newQuantity, results[0].id],
                    (err) => {
                        if (err) throw err;
                        res.json({ success: true, message: 'Product added to cart' });
                    }
                );
            } else {
                // Add new item to cart
                db.query(
                    'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                    [req.session.user.id, productId, quantity],
                    (err) => {
                        if (err) throw err;
                        res.json({ success: true, message: 'Product added to cart' });
                    }
                );
            }
        }
    );
});

app.post('/update-cart', (req, res) => {
    const { itemId, quantity } = req.body;
    
    if (quantity <= 0) {
        db.query('DELETE FROM cart WHERE id = ?', [itemId], (err) => {
            if (err) throw err;
            res.json({ success: true });
        });
    } else {
        db.query(
            'UPDATE cart SET quantity = ? WHERE id = ?',
            [quantity, itemId],
            (err) => {
                if (err) throw err;
                res.json({ success: true });
            }
        );
    }
});

app.get('/checkout', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    db.query(
        `SELECT c.*, p.name, p.price, p.image_url 
         FROM cart c 
         JOIN products p ON c.product_id = p.id 
         WHERE c.user_id = ?`,
        [req.session.user.id],
        (err, results) => {
            if (err) throw err;
            
            if (results.length === 0) {
                return res.redirect('/cart');
            }
            
            let total = 0;
            results.forEach(item => {
                total += item.price * item.quantity;
            });
            
            res.render('checkout', { cartItems: results, total: total.toFixed(2), user: req.session.user });
        }
    );
});

app.post('/place-order', (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Please login first' });
    }
    
    const { name, address, city, zip, cardNumber, expDate, cvv } = req.body;
    
    // First create the order
    db.query(
        `INSERT INTO orders (user_id, total_amount, status) 
         SELECT ?, SUM(p.price * c.quantity), 'pending'
         FROM cart c 
         JOIN products p ON c.product_id = p.id 
         WHERE c.user_id = ?`,
        [req.session.user.id, req.session.user.id],
        (err, result) => {
            if (err) throw err;
            
            const orderId = result.insertId;
            
            // Add order items
            db.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price)
                 SELECT ?, c.product_id, c.quantity, p.price
                 FROM cart c 
                 JOIN products p ON c.product_id = p.id 
                 WHERE c.user_id = ?`,
                [orderId, req.session.user.id],
                (err) => {
                    if (err) throw err;
                    
                    // Clear the cart
                    db.query(
                        'DELETE FROM cart WHERE user_id = ?',
                        [req.session.user.id],
                        (err) => {
                            if (err) throw err;
                            res.json({ success: true, orderId: orderId });
                        }
                    );
                }
            );
        }
    );
});

app.get('/orders', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    db.query(
        `SELECT o.*, 
         (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
         FROM orders o 
         WHERE o.user_id = ? 
         ORDER BY o.created_at DESC`,
        [req.session.user.id],
        (err, orders) => {
            if (err) throw err;
            res.render('orders', { orders: orders, user: req.session.user });
        }
    );
});

app.get('/order/:id', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    const orderId = req.params.id;
    
    db.query(
        `SELECT o.*, oi.*, p.name, p.image_url
         FROM orders o 
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE o.id = ? AND o.user_id = ?`,
        [orderId, req.session.user.id],
        (err, results) => {
            if (err) throw err;
            
            if (results.length === 0) {
                return res.status(404).send('Order not found');
            }
            
            res.render('order-detail', { 
                order: { 
                    id: results[0].order_id, 
                    total_amount: results[0].total_amount,
                    status: results[0].status,
                    created_at: results[0].created_at
                }, 
                items: results, 
                user: req.session.user 
            });
        }
    );
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null, user: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        
        if (results.length === 0) {
            return res.render('login', { error: 'Invalid username or password', user: null });
        }
        
        const user = results[0];
        
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            
            if (isMatch) {
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email
                };
                res.redirect('/');
            } else {
                res.render('login', { error: 'Invalid username or password', user: null });
            }
        });
    });
});

app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('register', { error: null, user: null });
});

app.post('/register', (req, res) => {
    const { username, email, password, confirmPassword } = req.body;
    
    console.log('Registration attempt:', { username, email });
    
    if (password !== confirmPassword) {
        console.log('Password mismatch');
        return res.render('register', { error: 'Passwords do not match', user: null });
    }
    
    // Check if user already exists
    db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, results) => {
        if (err) {
            console.log('Database error:', err);
            throw err;
        }
        
        console.log('Existing users found:', results);
        
        if (results.length > 0) {
            console.log('User already exists');
            return res.render('register', { error: 'Username or email already exists', user: null });
        }
        
        // Hash password and create user
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.log('Bcrypt error:', err);
                throw err;
            }
            
            db.query(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hash],
                (err, result) => {
                    if (err) {
                        console.log('Insert error:', err);
                        throw err;
                    }
                    
                    console.log('User inserted successfully, ID:', result.insertId);
                    res.redirect('/login');
                }
            );
        });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Debug route to check users in database
app.get('/debug-users', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    db.query('SELECT id, username, email, created_at FROM users', (err, results) => {
        if (err) throw err;
        
        console.log('Users in database:', results);
        res.json({ users: results });
    });
});

// Start server
app.listen(port, () => {
    console.log(`Ecommerce app listening at http://localhost:${port}`);
});
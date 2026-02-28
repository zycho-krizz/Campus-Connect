require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection Factory
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campus_connect',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET || 'super_secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/* ==================================
             USER MODULE 
===================================*/
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
            [fullName, email, hashedPassword, 'student']
        );
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        
        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'super_secret', { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, fullName: user.full_name, role: user.role, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

/* ==================================
           RESOURCE MODULE 
===================================*/
// Fetch matching resources (Search/Browse)
app.get('/api/resources', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = 'SELECT r.*, u.full_name as owner_name FROM resources r JOIN users u ON r.owner_id = u.id WHERE r.status = "available"';
        const params = [];

        if (category && category !== 'All') {
            query += ' AND r.category = ?';
            params.push(category);
        }
        
        if (search) {
            query += ' AND (r.title LIKE ? OR r.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY r.created_at DESC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

// Create new resource listing
app.post('/api/resources', authenticateToken, async (req, res) => {
    try {
        const { title, category, itemCondition, ownershipType, price, description } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO resources (owner_id, title, category, item_condition, ownership_type, price, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, title, category, itemCondition, ownershipType, price || 0, description]
        );
        res.status(201).json({ message: 'Resource listed successfully', resourceId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create listing' });
    }
});

// Checkout / Request Item
app.post('/api/requests', authenticateToken, async (req, res) => {
    try {
        const { resourceId, requestType, phoneNumber, department } = req.body;
        
        // Ensure resource is still available
        const [resource] = await pool.execute('SELECT * FROM resources WHERE id = ? AND status = "available"', [resourceId]);
        if (resource.length === 0) return res.status(400).json({ error: 'Resource no longer available' });

        // Update user phone/dept if provided during checkout
        await pool.execute('UPDATE users SET phone_number = ?, department = ? WHERE id = ?', [phoneNumber, department, req.user.id]);
        
        // Create Request
        await pool.execute(
            'INSERT INTO requests (resource_id, requester_id, request_type, phone_number, department) VALUES (?, ?, ?, ?, ?)',
            [resourceId, req.user.id, requestType, phoneNumber, department]
        );
        
        // Update Resource Status
        await pool.execute('UPDATE resources SET status = "requested" WHERE id = ?', [resourceId]);
        
        res.status(201).json({ message: 'Request submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit request', details: error.message });
    }
});

/* ==================================
            ADMIN MODULE 
===================================*/
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, full_name, email, role, phone_number, department, created_at FROM users');
        res.json(rows);
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

app.get('/api/admin/resources', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT r.*, u.full_name as owner_name FROM resources r JOIN users u ON r.owner_id = u.id');
        res.json(rows);
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

app.get('/api/admin/requests', authenticateToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT req.*, r.title as resource_title, u.full_name as requester_name, u.email as requester_email
            FROM requests req 
            JOIN resources r ON req.resource_id = r.id
            JOIN users u ON req.requester_id = u.id
        `);
        res.json(rows);
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Campus Connect API running on port ${PORT}`);
});

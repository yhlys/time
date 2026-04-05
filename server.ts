import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize SQLite Database
  const db = new Database('database.sqlite');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deadline DATETIME,
      type INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Middleware to authenticate JWT
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
      const info = stmt.run(username, hashedPassword);
      res.json({ id: info.lastInsertRowid, username });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Username already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
      const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
      const user = stmt.get(username) as any;

      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/tasks', authenticateToken, (req: any, res: any) => {
    try {
      const stmt = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC');
      const tasks = stmt.all(req.user.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/tasks', authenticateToken, (req: any, res: any) => {
    const { name, deadline, type } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });

    try {
      const stmt = db.prepare('INSERT INTO tasks (user_id, name, deadline, type) VALUES (?, ?, ?, ?)');
      const info = stmt.run(req.user.id, name, deadline || null, type);
      
      const newTaskStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
      const newTask = newTaskStmt.get(info.lastInsertRowid);
      res.json(newTask);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/tasks/:id', authenticateToken, (req: any, res: any) => {
    const { name, deadline, type } = req.body;
    const taskId = req.params.id;

    try {
      // Ensure the task belongs to the user
      const checkStmt = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?');
      const task = checkStmt.get(taskId, req.user.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const stmt = db.prepare('UPDATE tasks SET name = ?, deadline = ?, type = ? WHERE id = ?');
      stmt.run(name, deadline || null, type, taskId);
      
      const updatedTaskStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
      const updatedTask = updatedTaskStmt.get(taskId);
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/tasks/:id', authenticateToken, (req: any, res: any) => {
    const taskId = req.params.id;

    try {
      const stmt = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');
      const info = stmt.run(taskId, req.user.id);
      if (info.changes === 0) return res.status(404).json({ error: 'Task not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

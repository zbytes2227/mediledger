import 'dotenv/config';
import express from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.js';
import { dbStore } from './server/db.js';

async function seedDefaultAdmin() {
  // Check if any admin already exists
  const existingAdmin = dbStore.users.find(u => u.role === 'ADMIN');
  if (existingAdmin) return;

  // Create a default admin account for first-time use
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = {
    id: 'usr_admin_seed',
    _id: 'usr_admin_seed',
    name: 'Platform Administrator',
    email: 'admin@mediledger.local',
    passwordHash,
    role: 'ADMIN' as const,
    accountStatus: 'ACTIVE' as const,
    createdAt: new Date().toISOString()
  };

  await dbStore.saveUser(adminUser);
  console.log('[Seed] Default admin account created:');
  console.log('[Seed]   Email:    admin@mediledger.local');
  console.log('[Seed]   Password: admin123');
  console.log('[Seed]   (Change this password immediately in production!)');
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Basic Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Attempt MongoDB connection — falls back to in-memory mode on any error
  await dbStore.connectMongo();

  // Seed a default admin account if none exists
  await seedDefaultAdmin();

  // API Routes
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MediLedger Core API',
      timestamp: new Date().toISOString(),
      database: dbStore.isConnectedToMongo ? 'MongoDB Atlas' : 'In-Memory (no persistence)'
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const dbMode = dbStore.isConnectedToMongo ? 'MongoDB Atlas ✓      ' : 'In-Memory (no persist)';
    console.log(`\n╔══════════════════════════════════════════════════╗`);
    console.log(`║   MediLedger Healthcare Data Platform            ║`);
    console.log(`║   http://localhost:${PORT}                          ║`);
    console.log(`║   Database: ${dbMode}          ║`);
    console.log(`╚══════════════════════════════════════════════════╝\n`);
  });
}

startServer().catch(err => {
  console.error('[MediLedger Server Startup Error]:', err);
  process.exit(1);
});

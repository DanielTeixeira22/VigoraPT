import path from 'path';
import fs from 'fs';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/uploads.routes';
import chatRoutes from './routes/chat.routes';
import qrRoutes from './routes/qr.routes';
import plansRoutes from './routes/plans.routes';
import usersRoutes from './routes/users.routes';
import trainersRoutes from './routes/trainers.routes';
import clientsRoutes from './routes/clients.routes';
import trainerChangeRoutes from './routes/trainer-change.routes';
import notificationRoutes from './routes/notifications.routes';
import statsRoutes from './routes/stats.routes';





const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

try {
  const swaggerPath = path.join(process.cwd(), 'src', 'docs', 'swagger.json');
  if (fs.existsSync(swaggerPath)) {
    const swaggerDoc = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    console.log('📘 Swagger disponível em /api-docs');
  } else {
    console.warn('⚠️  swagger.json não encontrado em src/docs/');
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Erro ao carregar swagger.json:', message);
}

app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth/qr', qrRoutes);
app.use('/api', plansRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/trainer-change-requests', trainerChangeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);



app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Endpoint não encontrado.' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor.',
  });
});

export default app;

import dotenv from 'dotenv';
import { createServer } from 'http';
import app from './app';
import { connectDB } from './config/db';
import { initSocketServer } from './socket/socketServer';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

// Arranque coordenado: BD -> HTTP -> Socket.
const bootstrap = async () => {
  await connectDB();

  // Create HTTP server from Express app
  const httpServer = createServer(app);

  // Inicializa Socket.io
  initSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`API a correr em http://localhost:${PORT}`);
  });
};

bootstrap().catch((err) => {
  console.error('Erro a iniciar o servidor:', err);
  process.exit(1);
});

import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/db';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

const bootstrap = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`API a correr em http://localhost:${PORT}`);
  });
};

bootstrap().catch((err) => {
  console.error('Erro a iniciar o servidor:', err);
  process.exit(1);
});

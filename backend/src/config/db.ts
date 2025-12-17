import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI não definido no .env');
    process.exit(1);
  }
  mongoose.connection.on('connected', () => console.log('Conectado ao MongoDB'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB desconectado'));
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(uri, {});
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`MongoDB tentativa ${attempt}/${maxRetries} falhou:`, message);
      if (attempt === maxRetries) process.exit(1);
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
};

export default connectDB;

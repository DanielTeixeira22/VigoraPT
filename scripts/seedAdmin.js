require('dotenv').config();           // lê variáveis do .env
const mongoose = require('mongoose'); // conecta ao MongoDB
const bcrypt = require('bcrypt');
const User = require('../frontend/src/models/User'); // importa o modelo User

(async () => {
  try {
    // 1️⃣ liga à base de dados
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📡 Ligado ao MongoDB Atlas');

    // 2️⃣ cria o hash da password “admin123”
    const passwordHash = await bcrypt.hash('admin123', 12);

    // 3️⃣ insere o utilizador admin se ainda não existir
    await User.updateOne(
      { email: 'admin@gmail.com' }, // critério de procura
      {
        $setOnInsert: {             // só cria se não existir
          username: 'admin',
          email: 'admin@gmail.com',
          passwordHash,
          role: 'ADMIN',
          profile: { firstName: 'Admin', lastName: 'PT' },
          isActive: true,
        },
      },
      { upsert: true }              // cria se não existir
    );

    console.log('Admin seed criado com sucesso');
  } catch (err) {
    console.error('Erro ao criar seed:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0); // termina o script
  }
})();

# Setup do Projeto Vigora

## Pré-requisitos
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

## Instalação Rápida

### 1. Clonar repositório
```bash
git clone <repo_url>
cd Vigora
```

### 2. Instalar dependências

#### Frontend
```bash
cd frontend
npm install
```

#### Backend
```bash
cd backend
npm install
```

## Configuração de Variáveis de Ambiente

Cria o ficheiro `.env` na raiz do projeto (já existe `.env.example`):

```bash
cp .env.example .env
```

Edita `.env` com os teus valores:
```env
# Frontend
EXPO_PUBLIC_API_URL=http://localhost:3000

# Backend
DATABASE_URL=mongodb://...
JWT_SECRET=seu_secret_aqui
NODE_ENV=development
PORT=3000
```

## Executar o Projeto

### Frontend (Expo)
```bash
cd frontend
npm start       # Menu interativo
npm run web     # Web browser
npm run android # Android emulator
npm run ios     # iOS simulator
```

### Backend
```bash
cd backend
npm run dev     # Desenvolvimento com nodemon
npm run build   # Build para produção
npm run start   # Executar em produção
```

## Dependências Instaladas

Ver `requirements.txt` para lista completa de todas as dependências.

### Frontend (React Native + Expo + Tailwind)
- React 19.1.0
- React Native 0.81.5
- Expo 54.0.24
- NativeWind + Tailwind CSS
- React Navigation 7.6.4

### Backend (Express + MongoDB)
- Express 4.19.2
- MongoDB/Mongoose 8.6.0
- JWT Authentication
- CORS habilitado

## Troubleshooting

### Erro: "Cannot find module 'babel-preset-expo'"
```bash
cd frontend
npm install --save-dev babel-preset-expo
```

### Limpeza de cache
```bash
# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

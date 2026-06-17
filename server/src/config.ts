import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/todoflow',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtExpiresIn: '7d',
};

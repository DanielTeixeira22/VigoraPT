/**
 * Utilitários Bcrypt
 * Funções para hash e comparação de passwords.
 */

import bcrypt from 'bcryptjs';

/** Number of salt rounds. */
const SALT_ROUNDS = 10;

/**
 * Gera hash de uma password.
 * @param password - Password em texto plano
 * @returns Hash bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compara password com hash.
 * @param password - Password em texto plano
 * @param hash - Hash armazenado
 * @returns true se coincidirem
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

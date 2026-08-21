import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findUserByUsername, createUser } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  const existingUser = await findUserByUsername(username);

  if (existingUser) {
    return res.status(409).json({ error: 'Username is already taken' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // Create user
  const newUser = await createUser(username, hashedPassword);
  
  // Generate a JWT token valid for 24 hours so they are logged in immediately
  const token = jwt.sign({ username: newUser.username, id: newUser.id }, JWT_SECRET, { expiresIn: '24h' });
  return res.status(201).json({ token, user: { username: newUser.username } });
}

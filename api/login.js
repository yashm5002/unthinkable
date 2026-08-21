import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findUserByUsername } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const user = await findUserByUsername(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  // Generate a JWT token valid for 24 hours
  const token = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '24h' });
  return res.status(200).json({ token, user: { username: user.username } });
}

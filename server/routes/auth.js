const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'
const RESET_EXP_MINUTES = 60

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' })
  if (password.length < 6) return res.status(400).json({ error: 'Password too short' })
  try {
    const hash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      'INSERT INTO "User" (name, email, password_hash) VALUES ($1,$2,$3) RETURNING user_id, name, email, created_at',
      [name, email, hash]
    )
    res.json({ ok: true, user: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })
  try {
    const q = await pool.query('SELECT * FROM "User" WHERE email=$1', [email])
    const user = q.rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    await pool.query('UPDATE "User" SET last_login = NOW() WHERE user_id=$1', [user.user_id])
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '1d' })
    res.json({ ok: true, token, email: user.email, name: user.name })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Missing email' })
  try {
    const q = await pool.query('SELECT * FROM "User" WHERE email=$1', [email])
    const user = q.rows[0]
    if (!user) return res.json({ ok: true }) // don't reveal existence
    const token = uuidv4()
    const expiry = new Date(Date.now() + RESET_EXP_MINUTES * 60 * 1000)
    await pool.query('UPDATE "User" SET reset_token=$1, reset_token_expiry=$2 WHERE user_id=$3', [token, expiry, user.user_id])
    const resetLink = `${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/reset-password?token=${token}`
    console.log(`Password reset link for ${email}: ${resetLink}`)
    // In production: send email with resetLink
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Missing fields' })
  if (password.length < 6) return res.status(400).json({ error: 'Password too short' })
  try {
    const q = await pool.query('SELECT * FROM "User" WHERE reset_token=$1', [token])
    const user = q.rows[0]
    if (!user) return res.status(400).json({ error: 'Invalid token' })
    if (!user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date()) return res.status(400).json({ error: 'Token expired' })
    const hash = await bcrypt.hash(password, 10)
    await pool.query('UPDATE "User" SET password_hash=$1, reset_token=NULL, reset_token_expiry=NULL WHERE user_id=$2', [hash, user.user_id])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router

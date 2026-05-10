const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authenticateToken } = require('../middleware/auth')

// Apply authentication middleware to all elder routes
router.use(authenticateToken)

// helpers
function parseJSONField(value) {
  if (!value) return []
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch (e) { return [] }
  }
  return value
}

// GET /api/elders - list only user's elders
router.get('/', async (req, res) => {
  const userId = req.user.user_id
  try {
    const q = await pool.query(
      'SELECT elder_id, name, age, gender, height_cm, weight_kg, conditions, allergies, medicines, diet, created_at, updated_at FROM "Elder" WHERE user_id=$1 ORDER BY created_at DESC',
      [userId]
    )
    const rows = q.rows.map(r => ({
      ...r,
      conditions: parseJSONField(r.conditions),
      allergies: parseJSONField(r.allergies),
      preferences: parseJSONField(r.diet) || []
    }))
    res.json(rows)
  } catch (err) {
    console.error('GET /api/elders error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/elders/:id - only if owned by user
router.get('/:id', async (req, res) => {
  const id = req.params.id
  const userId = req.user.user_id
  try {
    const q = await pool.query('SELECT * FROM "Elder" WHERE elder_id=$1 AND user_id=$2', [id, userId])
    const row = q.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    // parse JSON-like fields
    const out = {
      ...row,
      conditions: parseJSONField(row.conditions),
      allergies: parseJSONField(row.allergies),
      preferences: parseJSONField(row.diet) || []
    }
    res.json(out)
  } catch (err) {
    console.error('GET /api/elders/:id error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/elders - create for current user
router.post('/', async (req, res) => {
  const { name, age, gender, height, weight, conditions, allergies, meds, diet } = req.body
  const userId = req.user.user_id
  
  if (!name) return res.status(400).json({ error: 'Missing name' })
  try {
    const q = await pool.query(
      `INSERT INTO "Elder" (user_id, name, age, gender, height_cm, weight_kg, conditions, allergies, medicines, diet, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
      [
        userId,
        name,
        age || null,
        gender || null,
        height || null,
        weight || null,
        JSON.stringify(conditions || []),
        allergies || null,
        JSON.stringify(meds || []),
        diet || null
      ]
    )
    res.json({ ok: true, elder: q.rows[0] })
  } catch (err) {
    console.error('POST /api/elders error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/elders/:id - update only if owned by user
router.put('/:id', async (req, res) => {
  const id = req.params.id
  const userId = req.user.user_id
  const { name, age, gender, height, weight, conditions, allergies, meds, diet } = req.body
  try {
    const q = await pool.query(
      `UPDATE "Elder" SET name=$1, age=$2, gender=$3, height_cm=$4, weight_kg=$5, conditions=$6, allergies=$7, medicines=$8, diet=$9, updated_at=NOW()
       WHERE elder_id=$10 AND user_id=$11 RETURNING *`,
      [
        name,
        age || null,
        gender || null,
        height || null,
        weight || null,
        JSON.stringify(conditions || []),
        allergies || null,
        JSON.stringify(meds || []),
        diet || null,
        id,
        userId
      ]
    )
    if (!q.rows[0]) return res.status(404).json({ error: 'Not found or unauthorized' })
    res.json({ ok: true, elder: q.rows[0] })
  } catch (err) {
    console.error('PUT /api/elders/:id error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/elders/:id/preferences - update preferences JSON stored in diet column
router.put('/:id/preferences', async (req, res) => {
  const id = req.params.id
  const userId = req.user.user_id
  const { preferences } = req.body
  if (!preferences) return res.status(400).json({ error: 'Missing preferences' })
  try {
    const q = await pool.query('UPDATE "Elder" SET diet=$1, updated_at=NOW() WHERE elder_id=$2 AND user_id=$3 RETURNING *', [JSON.stringify(preferences), id, userId])
    if (!q.rows[0]) return res.status(404).json({ error: 'Not found or unauthorized' })
    const row = q.rows[0]
    const out = {
      ...row,
      conditions: parseJSONField(row.conditions),
      allergies: parseJSONField(row.allergies),
      preferences: parseJSONField(row.diet) || []
    }
    res.json({ ok: true, elder: out })
  } catch (err) {
    console.error('PUT /api/elders/:id/preferences error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/elders/:id - only if owned by user
router.delete('/:id', async (req, res) => {
  const id = req.params.id
  const userId = req.user.user_id
  try {
    const result = await pool.query('DELETE FROM "Elder" WHERE elder_id=$1 AND user_id=$2', [id, userId])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not found or unauthorized' })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/elders/:id error', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router

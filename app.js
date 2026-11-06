const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'MyNewPass123', // CHANGE THIS to your MySQL password
  database: 'school',
  waitForConnections: true,
  connectionLimit: 10
});

async function init() {
  await pool.query('CREATE DATABASE IF NOT EXISTS studentdb');
  await pool.query('USE studentdb');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student (
      sno INT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      total INT NOT NULL
    )
  `);
  console.log('DB Ready');
}
init();

// 1. Insert
app.post('/students', async (req, res) => {
  try {
    const { sno, name, total } = req.body;
    await pool.execute(
      "INSERT INTO student (sno, name, total) VALUES (?,?,?)",
      [Number(sno), name, Number(total)]
    );
    res.json({ message: 'Inserted' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Sno already exists' });
    res.status(500).json({ error: 'Insert failed' });
  }
});

// 2. Get All
app.get('/students', async (req, res) => {
  const [rows] = await pool.execute("SELECT * FROM student ORDER BY sno");
  res.json(rows);
});

// 3. Get One - This was your error area - FIXED
app.get('/students/:sno', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT sno, name, total FROM student WHERE sno =?",
      [req.params.sno]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Student not found." });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Unable to find student." });
  }
});

// 4. Update
app.put('/students/:sno', async (req, res) => {
  try {
    const { name, total } = req.body;
    const [result] = await pool.execute(
      "UPDATE student SET name =?, total =? WHERE sno =?",
      [name, total, req.params.sno]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Student not found." });
    res.json({ message: 'Updated' });
  } catch (e) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// 5. Delete
app.delete('/students/:sno', async (req, res) => {
  try {
    const [result] = await pool.execute("DELETE FROM student WHERE sno =?", [req.params.sno]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Student not found." });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.listen(3000, () => {
  console.log('Student Management System running at http://localhost:3000');
});
// HealthTrack Pro - RESTful API Backend
// Tech: Node.js + Express + SQLite (via better-sqlite3)
// Run: npm install && node server.js

const express = require('express'); const cors	= require('cors'); const path	= require('path');

// ── In-memory DB (replace with SQLite/MongoDB in production) ─────────
let db = {
users: [], activities: [], vitals: [], nextId: 1
};

const app = express(); app.use(cors()); app.use(express.json());

// ── MIDDLEWARE: Simple JWT-like auth ──────────────────────────────────
function auth(req, res, next) {
const token = req.headers['authorization'];
if (!token) return res.status(401).json({ error: 'Unauthorized' });
// In production: verify JWT token req.userId = 1; // mock
next();
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
res.json({ status: 'ok', timestamp: new Date().toISoString(), version: '1.0.0'
});

// ── USER RoUTES ───────────────────────────────────────────────────────
/**
*	PoST /api/users/register
*	Body: { name, email, password, age, gender }
*/
app.post('/api/users/register', (req, res) => {
const { name, email, password, age, gender } = req.body; if (!name || !email || !password)
return res.status(400).json({ error: 'name, email and password are required'
 
if (db.users.find(u => u.email === email))
return res.status(409).json({ error: 'Email already registered' });

const user = { id: db.nextId++, name, email, age, gender, createdAt: new Date() db.users.push(user);
res.status(201).json({ message: 'User registered', user: { id: user.id, name, e
});

/**
*	PoST /api/users/login
*	Body: { email, password }
*/
app.post('/api/users/login', (req, res) => { const { email } = req.body;
const user = db.users.find(u => u.email === email);
if (!user) return res.status(401).json({ error: 'Invalid credentials' });
// In production: bcrypt.compare + JWT sign
res.json({ message: 'Login successful', token: 'mock-jwt-token-' + user.id, use
});

// ── ACTIVITY RoUTES ───────────────────────────────────────────────────
/**
*	GET /api/activities?userId=1&from=2024-01-01&to=2024-12-31
*	Returns list of activity logs for a user
*/
app.get('/api/activities', auth, (req, res) => { let { userId, from, to, type } = req.query;
let result = db.activities.filter(a => a.userId == (userId || req.userId)); if (from) result = result.filter(a => a.date >= from);
if (to)	result = result.filter(a => a.date <= to);
if (type) result = result.filter(a => a.type.toLowerCase() === type.toLowerCas result.sort((a, b) => b.date.localeCompare(a.date));
res.json({ count: result.length, activities: result });
});

/**
*	PoST /api/activities
*	Body: { type, duration, calories, date, notes, intensity }
*/
app.post('/api/activities', auth, (req, res) => {
const { type, duration, calories, date, notes, intensity } = req.body; if (!type || !duration || !calories)
return res.status(400).json({ error: 'type, duration and calories are require

const activity = { id: db.nextId++, userId: req.userId,
 
type, duration: +duration, calories: +calories,
date: date || new Date().toISoString().split('T')[0], notes: notes || '',
intensity: intensity || 'medium', createdAt: new Date().toISoString()
};
db.activities.push(activity);
res.status(201).json({ message: 'Activity logged', activity });
});

/**
*	PUT /api/activities/:id
*/
app.put('/api/activities/:id', auth, (req, res) => {
const idx = db.activities.findIndex(a => a.id == req.params.id && a.userId == r if (idx === -1) return res.status(404).json({ error: 'Activity not found' }); db.activities[idx] = { ...db.activities[idx], ...req.body, id: db.activities[id res.json({ message: 'Activity updated', activity: db.activities[idx] });
});

/**
*	DELETE /api/activities/:id
*/
app.delete('/api/activities/:id', auth, (req, res) => { const before = db.activities.length;
db.activities = db.activities.filter(a => !(a.id == req.params.id && a.userId = if (db.activities.length === before) return res.status(404).json({ error: 'Not res.json({ message: 'Activity deleted' });
});

// ── VITALS RoUTES ─────────────────────────────────────────────────────
/**
*	GET /api/vitals - get vitals history for user
*/
app.get('/api/vitals', auth, (req, res) => { const result = db.vitals
.filter(v => v.userId == req.userId)
.sort((a, b) => b.date.localeCompare(a.date)); res.json({ count: result.length, vitals: result });
});

/**
*	PoST /api/vitals
*	Body: { weight, bloodPressure, heartRate, sleep, date }
*/
app.post('/api/vitals', auth, (req, res) => {
const { weight, bloodPressure, heartRate, sleep, date } = req.body;
 
const vital = { id: db.nextId++,
userId: req.userId,
weight: weight ? +weight : null,
bloodPressure: bloodPressure ? +bloodPressure : null, heartRate: heartRate ? +heartRate : null,
sleep: sleep ? +sleep : null,
date: date || new Date().toISoString().split('T')[0], createdAt: new Date().toISoString()
};
db.vitals.push(vital);
res.status(201).json({ message: 'Vitals saved', vital });
});

// ── STATS / ANALYTICS ─────────────────────────────────────────────────
/**
*	GET /api/stats/weekly - weekly summary
*/
app.get('/api/stats/weekly', auth, (req, res) => { const today = new Date();
const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7); const weekAgoStr = weekAgo.toISoString().split('T')[0];

const weekActivities = db.activities.filter(
a => a.userId == req.userId && a.date >= weekAgoStr
);

const summary = {
totalWorkouts: weekActivities.length,
totalCalories: weekActivities.reduce((s, a) => s + a.calories, 0), totalMinutes: weekActivities.reduce((s, a) => s + a.duration, 0), avgCaloriesPerSession: weekActivities.length
? Math.round(weekActivities.reduce((s,a)=>s+a.calories,0) / weekActivities.
: 0,
byType: weekActivities.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc;
}, {}),
dailyBreakdown: (() => { const breakdown = {};
for (let i = 0; i < 7; i++) {
const d = new Date(today); d.setDate(today.getDate() - i); const ds = d.toISoString().split('T')[0];
breakdown[ds] = weekActivities
.filter(a => a.date === ds)
.reduce((s, a) => s + a.calories, 0);
}
return breakdown;
 
})()
};
res.json(summary);
});

/**
*	GET /api/stats/bmi?weight=70&height=175
*/
app.get('/api/stats/bmi', (req, res) => { const { weight, height } = req.query; if (!weight || !height)
return res.status(400).json({ error: 'weight (kg) and height (cm) required' } const bmi = +weight / ((+height / 100) ** 2);
let category, risk;
if	(bmi < 18.5) { category = 'Underweight';	risk = 'Moderate'; } else if (bmi < 25)	{ category = 'Normal weight';		risk = 'Low'; }
else if (bmi < 30)	{ category = 'overweight';	risk = 'Moderate'; } else if (bmi < 35)	{ category = 'obese (Class I)';	risk = 'High'; }
else if (bmi < 40)	{ category = 'obese (Class II)';	risk = 'Very High'; } else	{ category = 'obese (Class III)'; risk = 'Extreme'; } res.json({ bmi: +bmi.toFixed(2), category, risk });
});

// ── 404 ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── START ─────────────────────────────────────────────────────────────
const PoRT = process.env.PoRT || 3000;
app.listen(PoRT, () => console.log(`HealthTrack API running on http://localhost:$ module.exports = app;

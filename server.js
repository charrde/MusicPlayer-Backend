require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');

const app = express();
const dbConfig = {
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	password: process.env.PGPASSWORD,
	port: process.env.PGPORT
};

const pool = new Pool(dbConfig);

const jwtSecret = process.env.JWT_SECRET;
const preSharedSecret = process.env.PRE_SHARED_SECRET;

if (!jwtSecret) {
	console.error('JWT_SECRET environment variable is not set');
	process.exit(1);
}

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use(express.static(path.join(__dirname)));

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, 'data/audio'));
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + path.extname(file.originalname));
	},
});
const upload = multer({ storage });

// Middleware to protect routes
const requireAuth = expressJwt({ secret: jwtSecret, algorithms: ['HS256'] });

app.get('/', (req, res) => {
	res.send('Welcome to the Shmoovin Music Player API');
});

// Register new users
app.post('/register', async (req, res) => {
	const { username, password, secret } = req.body;

	// Check secret
	if (secret !== preSharedSecret) {
		return res.status(403).json({ error: 'Forbidden' });
	}

	const hashedPassword = await bcrypt.hash(password, 10);
	try {
		const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *', [username, hashedPassword]);
		res.status(201).json({ user: result.rows[0] });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Login users
app.post('/login', async (req, res) => {
	const { username, password } = req.body;
	try {
		const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
		const user = result.rows[0];
		if (!user || !(await bcrypt.compare(password, user.password))) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}
		const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: '1h' });
		res.json({ token });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/artists', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM artists');
		res.json({ artists: result.rows });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.post('/artists', requireAuth, async (req, res) => {
	const { name } = req.body;
	try {
		const result = await pool.query('INSERT INTO artists (name) VALUES ($1) RETURNING *', [name]);
		res.status(201).json({ artist: result.rows[0] });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/albums/:artist_id', async (req, res) => {
	const artist_id = req.params.artist_id;
	try {
		const result = await pool.query('SELECT * FROM albums WHERE artist_id = $1', [artist_id]);
		res.json({ albums: result.rows });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.post('/albums', requireAuth, async (req, res) => {
	const { title, artist_id, release_year, genres } = req.body;
	try {
		const result = await pool.query(
			'INSERT INTO albums (title, artist_id, release_year, genres) VALUES ($1, $2, $3, $4) RETURNING *',
			[title, artist_id, release_year, genres]
		);
		res.status(201).json({ album: result.rows[0] });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/songs', async (req, res) => {
	try {
		const result = await pool.query(`
			SELECT
				songs.id AS song_id,
				songs.title AS song_title,
				COALESCE(songs.album_id, 0) AS album_id,
				COALESCE(albums.title, 'Single') AS album_title,
				songs.artist_id,
				artists.name AS artist_name,
				songs.file_path AS file_path,
				songs.rating
			FROM
				songs
			LEFT JOIN
				albums ON songs.album_id = albums.id
			JOIN
				artists ON songs.artist_id = artists.id
		`);
		res.json({ songs: result.rows });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/random-songs', async (req, res) => {
	try {
		const result = await pool.query(`
			SELECT
				songs.id AS song_id,
				songs.title AS song_title,
				COALESCE(songs.album_id, 0) AS album_id,
				COALESCE(albums.title, 'Single') AS album_title,
				songs.artist_id,
				artists.name AS artist_name,
				songs.file_path AS file_path,
				songs.rating
			FROM
				songs
			LEFT JOIN
				albums ON songs.album_id = albums.id
			JOIN
				artists ON songs.artist_id = artists.id
			ORDER BY RANDOM() LIMIT 6
		`);
		res.json({ songs: result.rows });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.post('/add-song', [requireAuth, upload.single('file')], async (req, res) => {
	const { title, album_id, artist_id, rating } = req.body;
	const file_path = `/data/audio/${req.file.filename}`;

	try {
		await pool.query(
			`INSERT INTO songs (title, album_id, artist_id, file_path, rating) VALUES ($1, $2, $3, $4, $5)`,
			[title, album_id, artist_id, file_path, rating]
		);
		res.status(201).json({ message: 'Song added successfully!' });
	} catch (err) {
		console.error('Error adding song:', err);
		res.status(500).json({ error: err.message });
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const dbConfig = {
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	password: process.env.PGPASSWORD,
	port: process.env.PGPORT
};

const pool = new Pool(dbConfig);

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
	res.send('Welcome to the Shmoovin Music Player API');
});

app.get('/artists', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM artists');
		res.json({ artists: result.rows });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/albums', async (req, res) => {
	try {
		const result = await pool.query(`
			SELECT albums.*, artists.name as artist_name
			FROM albums
			JOIN artists ON albums.artist_id = artists.id
		`);
		res.json({ albums: result.rows });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/songs', async (req, res) => {
	try {
		const result = await pool.query(`
			SELECT songs.*, albums.title as album_title, artists.name as artist_name
			FROM songs
			LEFT JOIN albums ON songs.album_id = albums.id
			JOIN artists ON songs.artist_id = artists.id
		`);
		res.json({ songs: result.rows });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/random-songs', async (req, res) => {
	try {
		const result = await pool.query(`
			SELECT songs.id, songs.title AS songTitle, artists.name AS artistName, albums.title AS albumTitle, songs.file_path AS filePath, songs.rating 
			FROM songs 
			LEFT JOIN albums ON songs.album_id = albums.id 
			JOIN artists ON songs.artist_id = artists.id 
			ORDER BY RANDOM() LIMIT 6
		`);
		res.json({ songs: result.rows });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

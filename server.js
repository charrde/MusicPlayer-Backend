const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const dbPath = path.resolve(__dirname, './data/music.db');
const db = new sqlite3.Database(dbPath);


app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/', (req, res) => {
	res.send('Welcome to the Music Player API');
});

app.get('/artists', (req, res) => {
	db.all('SELECT * FROM artists', [], (err, rows) => {
		if (err) {
			res.status(500).json({ error: err.message });
			return;
		}
		res.json({ artists: rows });
	});
});

app.get('/albums', (req, res) => {
	db.all(
		`SELECT albums.*, artists.name as artist_name
		FROM albums
		JOIN artists ON albums.artist_id = artists.id`,
		[],
		(err, rows) => {
			if (err) {
				res.status(500).json({ error: err.message });
				return;
			}
			res.json({ albums: rows });
		}
	);
});

app.get('/songs', (req, res) => {
	db.all(
		`SELECT songs.*, albums.title as album_title
		FROM songs
		JOIN albums ON songs.album_id = albums.id`,
		[],
		(err, rows) => {
			if (err) {
				res.status(500).json({ error: err.message });
				return;
			}
			res.json({ songs: rows });
		}
	);
});

app.get('/random-songs', (req, res) => {
	db.all(
		`SELECT songs.id, songs.title AS songTitle, artists.name AS artistName, albums.title AS albumTitle, songs.file_path AS filePath 
		FROM songs 
		JOIN albums ON songs.album_id = albums.id 
		JOIN artists ON albums.artist_id = artists.id 
		ORDER BY RANDOM() LIMIT 6`,
		[],
		(err, rows) => {
			if (err) {
				res.status(500).json({ error: err.message });
				return;
			}
			res.json({ songs: rows });
		}
	);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

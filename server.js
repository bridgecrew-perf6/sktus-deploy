const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/content-kernel.js', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/content-kernel.js'));
});

app.get('/auth.html', function (req, res) {
  res.sendFile(path.join(__dirname, 'public/auth.html'));
});

app.listen(port);
console.log('Server started at http://localhost:' + port);

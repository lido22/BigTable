const http = require('http');
const server = http.createServer();
const mongoose = require('mongoose');

const clientIO = require('socket.io-client');
const fs = require('fs');
const Track = require('../common/track.model');

//connect to database
const url = 'mongodb://127.0.0.1:27017/tracks';
const dbName = 'tracks';

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB...'))
  .catch((err) => console.log('Unable to connect...'));

let meta = {};

async function set(row, obj) {
  const track = await Track.findOneAndUpdate(row, obj);
}

async function DeleteCells(row, obj) {
  const track = await Track.findOneAndUpdate(row, obj);
  console.log(track);
  console.log(track);
}
// DeleteCells(1, {Name:"", Date:"", Position:""})

async function DeleteRow(row) {
  await Track.findOneAndRemove(row);
}
//to-do
async function AddRow(obj) {
  const track = new Track(obj);
  await track.save();
}

async function ReadRows(rows) {
  tracks = [];
  for (const row of rows) {
    const track = await Track.findOne(row);
    tracks.push(track);
  }

  return tracks;
}

function connectMaster(url) {
  const socket = clientIO(url);
  socket.on('connect', () => {
    handleGetMeta(socket);
  });
  return socket;
}

function openServer() {
  server.listen(8081, () => console.log('server started'));
  const io = require('socket.io')(server);
  io.on('connection', (socket) => {
    handleSet(socket);
    handleAddRow(socket);
    handleDelete(socket);
    handleDeleteCells(socket);
    handleReadRows(socket);
  });
}

function loadMetaData() {
  let rawdata = fs.readFileSync('./metadata.json');
  let metaTable = {};
  try {
    metaTable = JSON.parse(rawdata);
  } catch (err) {
    console.log('metadata File is Empty');
  }
  return metaTable;
}

function writeMeta(meta) {
  fs.writeFile(
    './metadata.json',
    JSON.stringify(meta, null, 4),
    function (err) {
      if (err) throw err;
      console.log('metadata written!');
    }
  );
}

connectMaster('http://localhost:3000');
openServer();

const handleGetMeta = (socket) => {
  socket.on('get-meta', (newMeta) => {
    meta = newMeta;
    console.log(meta);
  });
};

const handleDelete = (socket) => {
  socket.on('delete', (req) => {
    console.log(req);
    DeleteRow(req);
  });
};

const handleDeleteCells = (socket) => {
  socket.on('deleteCells', (req) => {
    DeleteCells(req.row, req.object);
  });
};

const handleAddRow = (socket) => {
  socket.on('addRow', (req) => {
    AddRow(req.object);
  });
};

const handleSet = (socket) => {
  socket.on('set', (req) => {
    set(req.row, req.object);
  });
};

const handleReadRows = (socket) => {
  socket.on('readRows', (req) => {
    ReadRows(req).then((tracks) => {
      console.log(tracks);
      socket.emit('sendingRows', tracks);
    });
  });
};

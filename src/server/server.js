const http = require('http');
const server = http.createServer();
const io = require('socket.io')(server);
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
async function AddRow(row, obj) {
  obj.ID = row;
  const track = new Track(obj);
  await track.save();
}

async function ReadRows(rows) {
  tracks = [];
  rows.forEach(async (row) => {
    const track = await Track.findOne(row);
    tracks.push(track);
  });
  return tracks;
}

/*const rows = [
  { Region: 'ec', ID: 11 },
  { Region: 'fr', ID: 54 },
  { Region: 'it', ID: 358 },
];

ReadRows(rows)
  .then((tracks) => {
    console.log(tracks);
  })
  .catch((err) => console.log(err));
*/
function connectMaster(url) {
  const socket = clientIO(url);
  socket.on('connect', () => {
    console.log(socket.id);
    socket.emit('fetch-meta', socket.id);
    socket.on('get-meta', (meta) => {
      writeMeta(meta);
    });
  });
  console.log(socket.connected);
  return socket;
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

const socket = connectMaster('http://localhost:3000');
server.listen(8080, () => console.log('server started'));

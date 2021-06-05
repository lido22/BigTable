const http = require('http');
const server = http.createServer();
const io = require('socket.io')(server);
const clientIO = require('socket.io-client');
const fs = require('fs');
const Track = require('../common/track.model');

//connect to database
const url = 'mongodb://127.0.0.1:27017/tracks';
const dbName = 'tracks';
mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB...'))
  .catch((err) => console.log('Unable to connect...'));

async function set(row, obj) {
  const track = await Track.find({ ID: row });
  track[0].set(obj);
  track[0].save();
}

async function DeleteCells(row, obj) {
  const track = await Track.find({ ID: row });
  console.log(track);
  console.log(track);
}
// DeleteCells(1, {Name:"", Date:"", Position:""})

async function DeleteRow(row) {
  const track = await Track.find({ ID: row });
  track[0].remove();
}
//to-do
async function AddRow(row, obj) {
  obj.ID = row;
  const track = new Track(obj);
  const result = await track.save();
}

async function ReadRows(rows) {
  const tracks = await Track.find({ ID: { $in: rows } });
  return tracks;
}
// ReadRows(['ec11', 'fr54', 'it358'])
// .then(tracks => {
//    console.log(tracks)
// })
// .catch(err => console.log(err))

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

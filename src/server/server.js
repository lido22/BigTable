const http = require('http');
const server = http.createServer();
const mongoose = require('mongoose');

const AsyncLock = require('async-lock');
const lock = new AsyncLock();

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
let port = undefined;

async function set(row, obj) {
  return await Track.findOneAndUpdate(row, obj);
}

async function DeleteCells(row, obj) {
  return await Track.findOneAndUpdate(row, obj);
}
// DeleteCells(1, {Name:"", Date:"", Position:""})

async function DeleteRow(row) {
  return await Track.findOneAndRemove(row);
}
//to-do
async function AddRow(obj) {
  const lastTrack = await Track.findOne({ Region: obj.Region })
    .sort({ ID: -1 })
    .limit(1);

  const lastID = lastTrack.ID;

  obj.ID = lastID + 1;

  const track = new Track(obj);
  return track.save();
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
  server.listen(port, () => {
    console.log('server started');

    const io = require('socket.io')(server);
    io.on('connection', (socket) => {
      handleSet(socket);
      handleAddRow(socket);
      handleDelete(socket);
      handleDeleteCells(socket);
      handleReadRows(socket);
    });
  });
}

const masterSocket = connectMaster('http://localhost:3000');

const handleGetMeta = (socket) => {
  socket.on('get-meta', (newMeta) => {
    meta = newMeta;
    if (port === undefined) {
      port = meta.port;
      openServer();
    }
    console.log(meta);
  });
};

const handleDelete = (socket) => {
  socket.on('delete', (req) => {
    lock.acquire(req.row.Region, function (done) {
      DeleteRow(req.row)
        .then((row) => {
          if (row) {
            console.log(`Deleted Row ${row.ID} - ${row.Region}`);
            handleAddAndDelete([{ region: row.Region, count: -1 }]);
          }

          sendDoneEvent(socket);
          done();
        })
        .catch(console.log);
    });
  });
};

const handleDeleteCells = (socket) => {
  socket.on('deleteCells', (req) => {
    lock.acquire(req.row.Region, function (done) {
      DeleteCells(req.row, req.object)
        .then(() => sendDoneEvent(socket))
        .then(done);
    });
  });
};

const handleAddRow = (socket) => {
  socket.on('addRow', (req) => {
    lock
      .acquire(req.row.Region, function (done) {
        // chech if not locked
        done();
      })
      .then(() => {
        AddRow(req.object)
          .then((row) => {
            console.log(`Added Row ${row.ID} - ${row.Region}`);
            handleAddAndDelete([{ region: row.Region, count: 1 }]);
            sendDoneEvent(socket);
          })
          .catch(console.log);
      });
  });
};

const handleSet = (socket) => {
  socket.on('set', (req) => {
    lock.acquire(req.row.Region, function (done) {
      set(req.row, req.object)
        .then(() => sendDoneEvent(socket))
        .then(done);
    });
  });
};

const handleReadRows = (socket) => {
  socket.on('readRows', (req) => {
    lock.acquire(
      [...new Set(Object.values(req).map((row) => row.Region))],
      function (done) {
        // chech if not locked
        done();
      }
    );
    ReadRows(req).then((tracks) => {
      console.log(tracks);
      socket.emit('sendingRows', tracks);
    });
  });
};

const handleAddAndDelete = (addedRows) => {
  masterSocket.emit('addedRows', addedRows);
};

const sendDoneEvent = (socket) => {
  socket.emit('done');
};

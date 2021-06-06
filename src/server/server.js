const http = require('http');
const server = http.createServer();
const mongoose = require('mongoose');

const AsyncLock = require('async-lock');
const lock = new AsyncLock();

const clientIO = require('socket.io-client');
const fs = require('fs');
const Track = require('../common/track.model');

const {
  set,
  DeleteCells,
  DeleteRow,
  AddRow,
  ReadRows,
} = require('../common/track.service');

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

let meta = {};
let port = undefined;

let dataUpdate = [];

setInterval(() => {
  masterSocket.emit('update', dataUpdate);

  dataUpdate = [];
}, 10000); // every 10 serconds update master

function connectMaster(url) {
  const socket = clientIO(url);
  socket.on('connect', () => {
    handleGetMeta(socket);
    handleGetDB(socket);
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

const handleGetDB = (socket) => {
  socket.on('get-db', (db) => {
    // connect to db
    const url = `mongodb://127.0.0.1:27017/tracks${meta.port % 10}`;
    console.log(url);
    mongoose
      .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => console.log('Connected to MongoDB...'))
      .then(async () => {
        // create db
        await Track.deleteMany();
        await Track.insertMany(db);
        console.log('Created DB');
      })
      .catch((err) => console.log('Unable to connect...', err));
  });
};

const handleDelete = (socket) => {
  socket.on('delete', (req) => {
    lock.acquire(req.row.Region, function (done) {
      DeleteRow(req.row)
        .then((row) => {
          if (row) {
            console.log(`Deleted Row ${row.ID} - ${row.Region}`);
            dataUpdate.push({ req, type: 'delete' });
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
      DeleteCells(req.row, req.cells)
        .then((row) => {
          if (row) {
            console.log(row);
            dataUpdate.push({ req, type: 'deleteCells' });
          }
          sendDoneEvent(socket);
          done();
        })
        .catch(console.log);
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
            dataUpdate.push({ req, type: 'addRow' });
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
        .then(sendDoneEvent(socket))
        .then(dataUpdate.push({ req, type: 'set' }))
        .then(done)
        .catch(console.log);
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
    ReadRows(req)
      .then((tracks) => {
        //console.log(tracks);
        socket.emit('sendingRows', tracks);
      })
      .catch(console.log);
  });
};

const sendDoneEvent = (socket) => {
  socket.emit('done');
};

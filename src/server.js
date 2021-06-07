const http = require('http');
const server = http.createServer();
const mongoose = require('mongoose');

const AsyncLock = require('async-lock');
const lock = new AsyncLock();

const clientIO = require('socket.io-client');
const fs = require('fs');
const Track = require('./common/track.model');
const logger = require('./logs/logger');
const {
  set,
  DeleteCells,
  DeleteRow,
  AddRow,
  ReadRows,
} = require('./common/track.service');

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
// start log file
logger.openLog('server.log');

let meta = {};
let port = undefined;

let dataUpdate = [];

function updateEvent() {
  masterSocket.emit('update', dataUpdate);
  dataUpdate = [];
}

function connectMaster(url) {
  const socket = clientIO(url, { query: `url=${process.env.SERVER}` });
  socket.on('connect', () => {
    logger.log('connecting to master');
    handleGetMeta(socket);
    handleGetTablets(socket);
  });
  return socket;
}

function openServer() {
  server.listen(8080, () => {
    console.log('server started');

    const io = require('socket.io')(server);
    io.on('connection', (socket) => {
      logger.log('A client has been connected');
      handleSet(socket);
      handleAddRow(socket);
      handleDelete(socket);
      handleDeleteCells(socket);
      handleReadRows(socket);
    });
  });
}

const masterSocket = connectMaster(process.env.MASTER_TO_SERVER);

const handleGetMeta = (socket) => {
  socket.on('get-meta', (newMeta) => {
    meta = newMeta;
    if (port === undefined) {
      port = meta.port;
      openServer();
    }
    logger.log('receiving meta data');
    console.log(meta);
  });
};

const handleGetTablets = (socket) => {
  socket.on('get-tablets', (tablets) => {
    console.log(socket.id);
    logger.log('receiving tablets');
    // connect to mongo
    const url = `mongodb://127.0.0.1:27017/tracks_tablets`;
    console.log(url);
    mongoose
      .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => console.log('Connected to MongoDB...'))
      .then(async () => {
        // create tablets database
        await Track.deleteMany();
        console.log('DELETED DB');
        await Track.insertMany(tablets);
        console.log('Created tablets');
      })
      .catch((err) => console.log('Unable to connect...', err));
  });
};

const handleDelete = (socket) => {
  socket.on('delete', (req) => {
    lock
      .acquire(
        [...new Set(Object.values(req).map((row) => row.Region))],
        function (done) {
          DeleteRow(req)
            .then((row) => {
              if (row) {
                dataUpdate.push({ req, type: 'delete' });
                updateEvent();
              }

              sendDoneEvent(socket);
              done();
            })
            .catch(console.log);
        }
      )
      .then(logger.log('A row has been deleted'));
  });
};

const handleDeleteCells = (socket) => {
  socket.on('deleteCells', (req) => {
    lock
      .acquire(req.row.Region, function (done) {
        DeleteCells(req.row, req.cells)
          .then((row) => {
            if (row) {
              dataUpdate.push({ req, type: 'deleteCells' });
              updateEvent();
            }
            sendDoneEvent(socket);
            done();
          })
          .catch(console.log);
      })
      .then(logger.log('row cells has been deleted'));
  });
};

const handleAddRow = (socket) => {
  socket.on('addRow', (req) => {
    lock
      .acquire(req.Region, function (done) {
        AddRow(req)
          .then((row) => {
            console.log(`Added Row ${row.ID} - ${row.Region}`);
            dataUpdate.push({ req, type: 'addRow' });
            updateEvent();
            sendDoneEvent(socket);
            done();
          })
          .catch(console.log);
      })
      .then(logger.log('A row has been added'));
  });
};

const handleSet = (socket) => {
  socket.on('set', (req) => {
    lock
      .acquire(req.row.Region, async function (done) {
        await set(req.row, req.object);
        sendDoneEvent(socket);
        dataUpdate.push({ req, type: 'set' });
        updateEvent();
        done();
      })
      .then(logger.log('row data has been changed'))
      .catch((v) => console.log('CATCH', v));
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
        logger.log('reading some rows data');
        socket.emit('sendingRows', tracks);
      })
      .catch(console.log);

    logger.log('reading some rows data');
    logger.log('diconnecting client');
  });
};

const sendDoneEvent = (socket) => {
  logger.log('diconnecting client');
  socket.emit('done');
};

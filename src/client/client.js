const fs = require('fs');
const io = require('socket.io-client');

function startConnection(url) {
  const socket = io(url);

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

function sendrequest(requestType, data, socket) {
  socket.emit(requestType, JSON.stringify(data), socket.id);
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

const socket = startConnection('http://localhost:3000');
const serverSocket = startConnection('http://localhost:8080');

let metaTable = loadMetaData();
// test
function test() {
  setTimeout(() => {
    serverSocket.emit('set', {
      row: {
        ID: 1,
        Region: 'ec',
      },
      object: {
        Name: 'abozied',
      },
    });
  }, 1000);
  setTimeout(() => {
    console.log('deleting name');
    serverSocket.emit('deleteCells', {
      row: {
        ID: 1,
        Region: 'ec',
      },
      object: {
        Name: '',
      },
    });
  }, 5000);

  serverSocket.emit('delete', {
    ID: 1,
    Region: 'ec',
  });
  serverSocket.emit('addRow', {
    object: {
      Name: 'walid',
      Data: '1/7/2021',
      Artist: 'HBO',
      URL: 'https://youtube.com',
      Streams: '19270',
      Position: 2,
      // ID:1,
      Region: 'ec',
    },
  });
  serverSocket.emit('readRows', [
    {
      ID: 1,
      Region: 'ec',
    },
    {
      ID: 2,
      Region: 'ec',
    },
  ]);
  serverSocket.on('sendingRows', (tracks) => {
    console.log(tracks);
  });
}

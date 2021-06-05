const io = require('socket.io-client');

let meta = {};

function startMasterConnection(url) {
  const socket = io(url);

  socket.on('connect', () => {
    handleGetMeta(socket);
  });

  return socket;
}

function sendrequest(requestType, data, socket) {
  socket.emit(requestType, JSON.stringify(data), socket.id);
}

const masterSocket = startMasterConnection('http://localhost:3001');
//const serverSocket = startConnection('http://localhost:8080');

const handleGetMeta = (socket) => {
  socket.on('get-meta', (newMeta) => {
    meta = newMeta;
    console.log(meta);
  });
};

const getServerSocket = (region) => {
  let port = 0;
  console.log(meta);

  Object.values(meta).forEach((v) => {
    v.regions.forEach((r) => {
      if (r === region) port = v.port;
    });
  });

  const url = `http://localhost:${port}`;
  console.log(url);
  const serverSocket = io(url);

  serverSocket.on('done', () => {
    serverSocket.close();
  });

  return serverSocket;
};

async function test1() {
  // addRow
  const req = {
    row: {
      Region: 'ec',
    },
    object: {
      Name: 'walid',
      Data: '1/7/2021',
      Artist: 'HBO',
      URL: 'https://youtube.com',
      Streams: '19270',
      Position: 2,
      Region: 'ec',
    },
  };

  // get serverSocket
  const serverSocket = getServerSocket(req.row.Region);

  serverSocket.emit('addRow', req);
}

async function test2() {
  // addRow
  const req = {
    row: {
      Region: 'it',
      ID: 10,
    },
  };

  // get serverSocket
  const serverSocket = getServerSocket(req.row.Region);

  serverSocket.emit('delete', req);
}

setTimeout(() => {
  test1();
}, 1000);

setTimeout(() => {
  test2();
}, 2000);

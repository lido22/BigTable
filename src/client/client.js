const io = require('socket.io-client');

let meta = {};

function startMasterConnection(url) {
  const socket = io(url);

  socket.on('connect', () => {
    handleGetMeta(socket);
  });

  return socket;
}

const masterSocket = startMasterConnection('http://localhost:3001');

const handleGetMeta = (socket) => {
  socket.on('get-meta', (newMeta) => {
    meta = newMeta;
  });
};

const getServerSocket = (region) => {
  let port = 0;

  Object.values(meta).forEach((v) => {
    v.regions.forEach((r) => {
      if (r === region) port = v.port;
    });
  });

  const url = `http://localhost:${port}`;

  const serverSocket = io(url);

  serverSocket.on('done', () => {
    serverSocket.close();
  });

  serverSocket.on('sendingRows', (tracks) => {
    console.log(tracks);

    // close socket
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
      ID: 11,
    },
  };

  // get serverSocket
  const serverSocket = getServerSocket(req.row.Region);

  serverSocket.emit('delete', req);
}

async function test3() {
  // addRow
  const req = [
    {
      Region: 'fr',
      ID: 2,
    },
    {
      Region: 'ec',
      ID: 21,
    },
  ];

  // get serverSocket
  const serverSocket = getServerSocket('it');

  serverSocket.emit('readRows', req);
}

async function test4() {
  // addRow
  const req = {
    row: {
      Region: 'fr',
      ID: 3,
    },
    cells: ['URL', 'Name'],
  };

  // get serverSocket
  const serverSocket = getServerSocket(req.row.Region);

  serverSocket.emit('deleteCells', req);
}

setTimeout(() => {
  test1();
}, 1000);

setTimeout(() => {
  test2();
}, 2000);

setTimeout(() => {
  test3();
}, 3000);

setTimeout(() => {
  test4();
}, 1000);

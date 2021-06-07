const io = require('socket.io-client');
const logger = require('./logs/logger');

let meta = {};

logger.openLog('client.log');
function startMasterConnection(url) {
  const socket = io(url);

  socket.on('connect', () => {
    logger.log('connecting to master');
    handleGetMeta(socket);
  });

  return socket;
}

const masterSocket = startMasterConnection(process.env.MASTER_TO_CLIENT);

const handleGetMeta = (socket) => {
  socket.on('get-meta', (newMeta) => {
    meta = newMeta;
    logger.log('meta data recieved');
  });
};

const getServerSocket = (region) => {
  let url;

  Object.values(meta).forEach((v) => {
    v.regions.forEach((r) => {
      if (r === region) url = v.url;
    });
  });

  if (!url) {
    const keys = Object.keys(meta);

    if (!keys.length) return undefined;

    let idx = Math.floor(Math.random() * keys.length);
    ({ url } = meta[keys[idx]]);
  }

  const serverSocket = io(url);
  logger.log('connecting to server');

  serverSocket.on('done', () => {
    logger.log('connection closed');

    serverSocket.close();
  });

  serverSocket.on('sendingRows', (tracks) => {
    console.log(tracks);
    logger.log('receiving rows data');

    // close socket
    serverSocket.close();
  });

  return serverSocket;
};

function sendRequest(requestName, request, tabletRange) {
  const serverSocket = getServerSocket(tabletRange);

  if (!serverSocket) {
    logger.log('No server available');
    return;
  }

  serverSocket.emit(requestName, request);
}

async function testSet() {
  logger.log('Set a row');

  const req = {
    row: {
      Region: 'fr',
      ID: 1,
    },
    object: {
      Name: 'ALI',
      Date: '6/6/2021',
    },
  };

  sendRequest('set', req, req.row.Region);
}

async function testDeleteCells() {
  logger.log('deleting cells from a row');

  // deletecells
  const req = {
    row: {
      Region: 'fr',
      ID: 3,
    },
    cells: ['URL', 'Name'],
  };

  sendRequest('deleteCells', req, req.row.Region);
}

async function testDelete() {
  logger.log('deleting a row');

  const req = [
    {
      Region: 'it',
      ID: 11,
    },
    {
      Region: 'it',
      ID: 12,
    },
  ];

  sendRequest('delete', req, req[0].Region);
}

async function testAdd() {
  // addRow
  logger.log('Adding a row');

  const req = {
    Name: 'walid',
    Data: '1/7/2021',
    Artist: 'HBO',
    URL: 'https://youtube.com',
    Streams: '19270',
    Position: 2,
    Region: 'fr',
  };

  sendRequest('addRow', req, req.Region);
}

async function testReadRows() {
  logger.log('reading rows');

  // readRows
  const req = [{ Region: 'fr', Artist: 'HBO', Name: 'walid' }];

  sendRequest('readRows', req, req[0].Region);
}
/*
setTimeout(() => {
  testAdd();
}, 2000);
*/
/*
setTimeout(() => {
  testSet();
}, 3000);
*/
/*
setTimeout(() => {
  testDeleteCells();
}, 2000);
*/
/*
setTimeout(() => {
  testDelete();
}, 2000);
*/

setTimeout(() => {
  testAdd();
}, 2000);

setTimeout(() => {
  testReadRows();
}, 3000);

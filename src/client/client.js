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

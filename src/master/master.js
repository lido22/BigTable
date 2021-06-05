const mongoose = require('mongoose');
const fs = require('fs');
const http = require('http');
const Track = require('../common/track.model');
const masterToServer = http.createServer();
const masterToClient = http.createServer();

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

let sockets = [];
let socketsCount = 0;
let tabletsCounts = [];
let portMap = {};

let clientSockets = [];

function isPortTaken(port) {
  let taken = 0;
  Object.values(portMap).forEach((p) => {
    taken |= p === port;
  });
  return taken;
}

function handleClientConnection() {
  const io = require('socket.io')(masterToClient);
  io.on('connection', (socket) => {
    clientSockets.push(socket);

    console.log('client connected!!!');

    // read meta from disk then send to client
    fs.readFile('./src/master/metadata.json', (err, data) => {
      if (err) throw err;
      const meta = JSON.parse(data);
      socket.emit('get-meta', meta);
    });
  });
}

makeTablets().then((tabletMarkers) => {
  const regions = tabletMarkers.map((marker) => marker._id);

  const meta = updateMeta(regions);

  // master to server socket
  const io = require('socket.io')(masterToServer);

  io.on('connection', (socket) => {
    sockets.push(socket);
    socketsCount++;

    if (!isPortTaken(8080)) portMap[socket.id] = 8080;
    else portMap[socket.id] = 8081;

    loadBalancing();

    socket.on('disconnect', () => {
      sockets = sockets.filter((v) => v.id !== socket.id);
      portMap[socket.id] = undefined;
      socketsCount--;
      loadBalancing();
    });

    socket.on('addedRows', (addedRows) => {
      loadBalancing(addedRows);
    });
  });
  console.log(tabletsCounts);
  writeMeta(meta);
});

masterToServer.listen(3000, () => console.log('server started'));
masterToClient.listen(3001);

async function makeTablets() {
  const aggregatorOpts = [
    {
      $group: {
        _id: '$Region',
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        count: 1,
      },
    },
  ];
  const regions = await Track.aggregate(aggregatorOpts);
  tabletsCounts = regions.reduce((prev, curr) => {
    prev[curr._id] = curr.count;
    return prev;
  }, {});

  return regions;
}

//writing metadata
function writeMeta(meta) {
  fs.writeFile(
    './src/master/metadata.json',
    JSON.stringify(meta, null, 2),
    function (err) {
      if (err) throw err;
      console.log('metadata written!');
    }
  );
}

async function sendMeta(meta) {
  // send meta to all servers
  for (const socket of sockets) {
    //console.log(meta[socket.id]);
    socket.emit('get-meta', meta[socket.id]);
  }

  // send meta to all clients
  for (const socket of clientSockets) {
    socket.emit('get-meta', meta);
  }
}

async function sendDB(meta) {
  // send DB to all servers
  for (const socket of sockets) {
    const regions = meta[socket.id].regions;
    const tracks = await Track.find({ Region: { $in: regions } });
    socket.emit('get-db', tracks);
  }
}

async function loadBalancing(addedRows = []) {
  addedRows.forEach((addedRow) => {
    tabletsCounts[addedRow.region] =
      tabletsCounts[addedRow.region] || 0 + addedRow.count;
  });

  const sortedRegions = Object.keys(tabletsCounts).sort(
    (a, b) => tabletsCounts[a] - tabletsCounts[b]
  );

  const meta = updateMeta(sortedRegions);
  writeMeta(meta);
}

function updateMeta(sortedRegions) {
  // no servers
  if (socketsCount === 0) {
    const meta = {};
    sendMeta(meta);
    return meta; // empty meta
  }

  if (socketsCount < 2) {
    // if one server connected
    const meta = {
      [sockets[0].id]: {
        regions: sortedRegions,
        port: portMap[sockets[0].id],
      },
    };

    sendMeta(meta);
    sendDB(meta);

    return meta;
  }

  const firstServerRegions = [];
  const secondServerRegions = [];
  for (
    let i = 0,
      j = sortedRegions.length - 1,
      servers = [firstServerRegions, secondServerRegions];
    i < sortedRegions.length / 2;
    i++, j--
  ) {
    if (i == j) {
      servers[i % 2].push(sortedRegions[i]);
      break;
    }
    servers[i % 2].push(sortedRegions[i], sortedRegions[j]);
  }

  const meta = {
    [sockets[0].id]: {
      regions: firstServerRegions,
      port: portMap[sockets[0].id],
    },
    [sockets[1].id]: {
      regions: secondServerRegions,
      port: portMap[sockets[1].id],
    },
  };

  sendMeta(meta);
  sendDB(meta);

  return meta;
}

handleClientConnection();

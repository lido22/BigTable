const mongoose = require('mongoose');
const fs = require('fs');
const http = require('http');
const Track = require('../common/track.model');
const master = http.createServer();
const io = require('socket.io')(master);

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

function isPortTaken(port) {
  let taken = 0;
  Object.values(portMap).forEach((p) => {
    taken |= p === port;
  });
  return taken;
}

makeTablets().then((tabletMarkers) => {
  const regions = tabletMarkers.map((marker) => marker._id);

  const meta = updateMeta(regions);

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
  });
  console.log(tabletsCounts);
  writeMeta(meta);
});

master.listen(3000, () => console.log('server started'));

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
  for (const socket of sockets) {
    console.log(meta[socket.id]);
    socket.emit('get-meta', meta[socket.id]);
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
    return []; // empty meta
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

  return meta;
}

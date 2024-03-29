const mongoose = require('mongoose');
const fs = require('fs');
const http = require('http');
const Track = require('./common/track.model');
const masterToServer = http.createServer();
const masterToClient = http.createServer();
const logger = require('./logs/logger');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();

const {
  set,
  DeleteCells,
  DeleteRow,
  AddRow,
} = require('./common/track.service');

//connect to database
const url = 'mongodb://127.0.0.1:27017/tracks';

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB...'))
  .catch((err) => console.log('Unable to connect...'));

console.log(logger);
logger.openLog('master.log');

let sockets = [];
let socketsCount = 0;
let tabletsCounts = [];
let portMap = {};
let urlMap = {};

let clientSockets = [];

let meta = {};

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
    logger.log('A client has been connected');

    socket.emit('get-meta', meta);
    logger.log('sending meta data to client');
  });
}

makeTablets().then((tabletMarkers) => {
  const regions = tabletMarkers.map((marker) => marker._id);

  //const meta = updateMeta(regions);

  // master to server socket
  const io = require('socket.io')(masterToServer);

  io.on('connection', (socket) => {
    sockets.push(socket);
    logger.log('A server has been connected');
    socketsCount++;

    urlMap[socket.id] = socket.request._query['url'];

    if (!isPortTaken(8080)) portMap[socket.id] = 8080;
    else portMap[socket.id] = 8081;

    console.log('LOAD B  in connection');
    loadBalancing();

    socket.on('disconnect', () => {
      sockets = sockets.filter((v) => v.id !== socket.id);
      portMap[socket.id] = undefined;
      urlMap[socket.id] = undefined;
      socketsCount--;
      logger.log('A server has been disconnected');
      console.log('LOAD B  in disconnection');
      loadBalancing();
    });

    socket.on('update', (dataUpdate) => {
      if (dataUpdate.length) logger.log('Updating orignal tables');
      handleDataBaseUpdate(dataUpdate);
    });
  });
  console.log(tabletsCounts);
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
function writeMeta() {
  fs.writeFile(
    './src/metadata.json',
    JSON.stringify(meta, null, 2),
    function (err) {
      if (err) throw err;
      console.log('metadata written!');
    }
  );
}

async function sendMeta() {
  console.log(meta);

  if (sockets.length !== 0) logger.log('sending meta data to servers');

  // send meta to all servers
  for (const socket of sockets) {
    //console.log(meta[socket.id]);
    socket.emit('get-meta', meta[socket.id]);
  }
  if (clientSockets.length !== 0) logger.log('sending meta data to clients');

  // send meta to all clients
  for (const socket of clientSockets) {
    socket.emit('get-meta', meta);
  }
}

async function sendTablets() {
  logger.log('sending tablets to servers');
  // send tablets to all servers
  for (const socket of sockets) {
    const regions = meta[socket.id].regions;
    const tracks = await Track.find({ Region: { $in: regions } });
    console.log(socket.id);
    socket.emit('get-tablets', tracks);
  }
}

async function loadBalancing(addedRows = []) {
  addedRows.forEach((addedRow) => {
    tabletsCounts[addedRow.region] =
      (tabletsCounts[addedRow.region] || 0) + addedRow.count;
  });

  const sortedRegions = Object.keys(tabletsCounts).sort(
    (a, b) => tabletsCounts[a] - tabletsCounts[b]
  );

  console.log(tabletsCounts);
  console.log(sortedRegions);

  logger.log('load balancing has been triggred ');

  updateMeta(sortedRegions);
}

function updateMeta(sortedRegions) {
  console.log(sortedRegions);
  // no servers
  if (socketsCount === 0) {
    const oldMeta = { ...meta };
    meta = {};
    if (!isEqual(oldMeta, meta)) {
      sendMeta();
      writeMeta();
    }
    return; // empty meta
  }

  if (socketsCount < 2) {
    // if one server connected
    const oldMeta = { ...meta };
    meta = {
      [sockets[0].id]: {
        regions: sortedRegions,
        port: portMap[sockets[0].id],
        url: urlMap[sockets[0].id],
      },
    };

    if (!isEqual(oldMeta, meta)) {
      console.log('NOT EQUAL');
      sendMeta();
      sendTablets();
      writeMeta();
    }

    return;
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

  const oldMeta = { ...meta };
  meta = {
    [sockets[0].id]: {
      regions: firstServerRegions,
      port: portMap[sockets[0].id],
      url: urlMap[sockets[0].id],
    },
    [sockets[1].id]: {
      regions: secondServerRegions,
      port: portMap[sockets[1].id],
      url: urlMap[sockets[1].id],
    },
  };

  if (!isEqual(oldMeta, meta)) {
    sendMeta();
    sendTablets();
    writeMeta();
  }

  return;
}

const handleDataBaseUpdate = async (dataUpdate) => {
  const addedRows = {};

  await lock.acquire('update-lock', async (done) => {
    for (const update of dataUpdate) {
      switch (update.type) {
        case 'set':
          await set(update.req.row, update.req.object);
          break;
        case 'deleteCells':
          await DeleteCells(update.req.row, update.req.cells);
          break;
        case 'delete':
          await DeleteRow(update.req);
          for (let { Region } of update.req)
            addedRows[Region] = (addedRows[Region] || 0) - 1;
          break;
        case 'addRow':
          await AddRow(update.req);
          addedRows[update.req.Region] =
            (addedRows[update.req.Region] || 0) + 1;
          break;
        default:
          break;
      }
    }
    done();
  });

  const addedRowsArr = Object.entries(addedRows).map((e) => {
    return { region: e[0], count: e[1] };
  });

  if (addedRowsArr.length > 0) {
    console.log('LOAD B  in tablet update');
    loadBalancing(addedRowsArr);
  }
};

handleClientConnection();

function isEqual(obj1, obj2) {
  if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;

  for (const key in obj1) {
    if (!obj2[key] || !obj2[key].regions) return false;
    if (obj2[key].regions.length !== obj1[key].regions.length) return false;

    for (const region of obj1[key].regions) {
      if (!obj2[key].regions.includes(region)) return false;
    }
  }

  return true;
}

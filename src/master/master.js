const mongoose = require('mongoose');
const fs = require('fs');
const http = require('http');
const Track = require('../common/track.model');
const masterToServer = http.createServer();
const masterToClient = http.createServer();

const {
  set,
  DeleteCells,
  DeleteRow,
  AddRow,
} = require('../common/track.service');

//connect to database
const url = 'mongodb://127.0.0.1:27017/tracks';

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

    socket.emit('get-meta', meta);
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

    socket.on('update', (dataUpdate) => {
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

  updateMeta(sortedRegions);
}

function updateMeta(sortedRegions) {
  // no servers
  if (socketsCount === 0) {
    const oldMeta = meta;
    meta = {};
    if (oldMeta !== meta) {
      sendMeta(meta);
      writeMeta(meta);
    }
    return meta; // empty meta
  }

  if (socketsCount < 2) {
    // if one server connected
    const oldMeta = meta;
    meta = {
      [sockets[0].id]: {
        regions: sortedRegions,
        port: portMap[sockets[0].id],
      },
    };

    if (oldMeta !== meta) {
      sendMeta(meta);
      sendDB(meta);
      writeMeta(meta);
    }

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

  const oldMeta = meta;
  meta = {
    [sockets[0].id]: {
      regions: firstServerRegions,
      port: portMap[sockets[0].id],
    },
    [sockets[1].id]: {
      regions: secondServerRegions,
      port: portMap[sockets[1].id],
    },
  };

  if (oldMeta !== meta) {
    sendMeta(meta);
    sendDB(meta);
    writeMeta(meta);
  }

  return meta;
}

const handleDataBaseUpdate = (dataUpdate) => {
  const addedRows = {};
  for (const update of dataUpdate) {
    switch (update.type) {
      case 'set':
        set(update.req.row, update.req.object).then();
        break;
      case 'deleteCells':
        DeleteCells(update.req.row, update.req.cells).then();
        addedRows[update.req.row.Region] =
          addedRows[update.req.row.Region] || 0 - 1;
        break;
      case 'delete':
        DeleteRow(update.req.row).then();
        break;
      case 'addRow':
        AddRow(update.req.object).then();
        addedRows[update.req.row.Region] =
          addedRows[update.req.row.Region] || 0 + 1;
        break;
      default:
        break;
    }
  }

  const addedRowsArr = Object.entries(addedRows).map((e) => {
    return { region: e[0], count: e[1] };
  });

  if (addedRowsArr.length > 0) loadBalancing(addedRowsArr);
};

handleClientConnection();

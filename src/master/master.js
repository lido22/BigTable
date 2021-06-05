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

async function makeTablets() {
  let tabletMarkers = [];
  const ec = await Track.find({ Region: 'ec' }).sort({ ID: 1 });
  // console.log(ec[0].ID)
  // console.log(ec[ec.length-1].ID)
  tabletMarkers.push({ Region: ec[0].Region, ID: ec[0].ID });
  tabletMarkers.push({
    Region: ec[ec.length - 1].Region,
    ID: ec[ec.length - 1].ID,
  });

  // console.log('fr')
  const fr = await Track.find({ Region: 'fr' }).sort({ ID: 1 });
  // console.log(fr[0].ID)
  // console.log(fr[fr.length-1].ID)
  tabletMarkers.push({ Region: fr[0].Region, ID: fr[0].ID });
  tabletMarkers.push({
    Region: fr[fr.length - 1].Region,
    ID: fr[fr.length - 1].ID,
  });

  // console.log('it')
  const it = await Track.find({ Region: 'it' }).sort({ ID: 1 });
  // console.log(it[0].ID)
  // console.log(it[it.length-1].ID)
  tabletMarkers.push({ Region: it[0].Region, ID: it[0].ID });
  tabletMarkers.push({
    Region: it[it.length - 1].Region,
    ID: it[it.length - 1].ID,
  });

  return tabletMarkers;
}
makeTablets().then((tabletMarkers) => {
  var randomBoolean = Math.random() < 0.5;
  var server1Lenght = randomBoolean ? tabletMarkers[3] : tabletMarkers[1];
  var server2Start = randomBoolean ? tabletMarkers[4] : tabletMarkers[2];
  meta = {
    tabletServer1: {
      startKey: tabletMarkers[0],
      endKey: server1Lenght,
    },
    tabletServer2: {
      startKey: server2Start,
      endKey: tabletMarkers[5],
    },
  };
  io.on('connection', (socket) => {
    socket.on('fetch-meta', (room) => {
      socket.emit('get-meta', meta);
    });
  });
  writeMeta(meta);
});

//writing metadata
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

master.listen(3000, () => console.log('server started'));

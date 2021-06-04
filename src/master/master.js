const mongoose = require('mongoose')
const fs = require('fs')
const http = require('http');
const master = http.createServer();
const io = require('socket.io')(master);

//connect to database
const url = 'mongodb://127.0.0.1:27017/tracks'
const dbName = 'tracks'
mongoose.connect(url, { useNewUrlParser: true,  useUnifiedTopology: true })
  .then(()=> console.log('Connected to MongoDB...'))
  .catch(err => console.log('Unable to connect...'))

//schema and model
const tracksSchema = mongoose.Schema({
  ID: {
    type:String,
    required:true
  },
  Position:{
    type:Number,
    required:true
  },
  Name: {
    type:String,
    required:true
  },
  Artist: String,
  Streams: {
    type:String,
    required:true
  },
  URL: {
    type:String,
    required:true
  },
  Date: String,
  Region: {
    type:String,
    required:true
  }
});
const Track = mongoose.model('track',tracksSchema);
async function makeTablets(){
    let tabletMarkers = []
    const ec = await Track
      .find({ID:/^ec/})
      .sort({ID:1})
    // console.log(ec[0].ID)
    // console.log(ec[ec.length-1].ID)
    tabletMarkers.push(ec[0].ID)
    tabletMarkers.push(ec[ec.length-1].ID)

    // console.log('fr')
    const fr = await Track
        .find({ID:/^fr/})
        .sort({ID:1})
    // console.log(fr[0].ID)
    // console.log(fr[fr.length-1].ID)
    tabletMarkers.push(fr[0].ID)
    tabletMarkers.push(fr[fr.length-1].ID)

    // console.log('it')
    const it = await Track
        .find({ID:/^it/})
        .sort({ID:1})
    // console.log(it[0].ID)
    // console.log(it[it.length-1].ID)
    tabletMarkers.push(it[0].ID)
    tabletMarkers.push(it[it.length-1].ID)
    return tabletMarkers
}
makeTablets()
.then(tabletMarkers =>{
    var randomBoolean = Math.random() < 0.5  
    var server1Lenght = randomBoolean? tabletMarkers[3]:tabletMarkers[1];
    var server2Start = randomBoolean? tabletMarkers[4]:tabletMarkers[2]
    meta = {
        tabletServer1:{
            startKey : tabletMarkers[0],
            endKey : server1Lenght
        },
        tabletServer2:{
            startKey : server2Start,
            endKey : tabletMarkers[5]
        }
    }
    io.on('connection', (socket) => {
      socket.on('fetch-meta', room => {
        socket.emit('get-meta', meta)
      })
    })
    writeMeta(meta)
})




//writing metadata
function writeMeta(meta){
    fs.writeFile('./metadata.json', JSON.stringify(meta, null, 4), function (err) {
        if (err) throw err;
        console.log('metadata written!');
    });
}



master.listen(3000, () => console.log('server started'));
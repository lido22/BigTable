const mongoose = require('mongoose')
const fs = require('fs')
//connect to database
const url = 'mongodb://127.0.0.1:27017/tracks'
const dbName = 'tracks'
mongoose.connect(url, { useNewUrlParser: true,  useUnifiedTopology: true })
  .then(()=> console.log('Connected to MongoDB...'))
  .catch(err => console.log('Unable to connect...'))

//schema and model
const tracksSchema = mongoose.Schema({
  ID: {
    type:Number,
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
      .find({Region:'ec'})
      .sort({ID:1})
    // console.log(ec[0].ID)
    // console.log(ec[ec.length-1].ID)
    tabletMarkers.push(ec[0].ID)
    tabletMarkers.push(ec[ec.length-1].ID)

    // console.log('fr')
    const fr = await Track
        .find({Region:'fr'})
        .sort({ID:1})
    // console.log(fr[0].ID)
    // console.log(fr[fr.length-1].ID)
    tabletMarkers.push(fr[0].ID)
    tabletMarkers.push(fr[fr.length-1].ID)

    // console.log('it')
    const it = await Track
        .find({Region:'it'})
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
    meta = {
        tabletServer1:{
            startKey : tabletMarkers[0],
            endKey : server1Lenght
        },
        tabletServer2:{
            startKey : server1Lenght+1,
            endKey : tabletMarkers[5]
        }
    }
    writeMeta(meta)
})




//writing metadata
function writeMeta(meta){
    fs.writeFile('./metadata.json', JSON.stringify(meta, null, 4), function (err) {
        if (err) throw err;
        console.log('metadata written!');
    });
    
}

const mongoose = require('mongoose')

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

async function set(row, obj){
  const track = await Track
    .find({ID:row})
      track[0].set(obj) 
      track[0].save()
}

async function DeleteCells(row, obj){
  const track = await Track
    .find({ID:row})
      console.log(track)
      track[0].set(obj) 
      console.log(track)
      track[0].save()
}
// DeleteCells(1, {Name:"", Date:"", Position:""})

async function DeleteRow(row){
  const track = await Track.find({ID : row})
  track[0].remove()
}

async function AddRow(row, obj){
  obj.ID = row
  const track = new Track(obj)
  const result = await track.save()
}
// AddRow(1, {Position:1, 
//               Name:"Ahmed", 
//               Date:"1/1/2017",
//               Region:'ec', 
//               URL:"www.sd.com",
//               Streams:"1515", 
//               Artist:"Ahmed"})

async function ReadRows(rows){
  const tracks = await Track
      .find({ID: {$in: [1,2,3]}})
  return tracks
}
ReadRows([1,2,3])
.then(tracks => {
   console.log(tracks)
})
.catch(err => console.log(err))

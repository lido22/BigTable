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
    .find({Region:row})
      track[0].set(obj) 
      track[0].save()
}

async function DeleteCells(row, obj){
  const track = await Track
    .find({Region:row})
      console.log(track)
      console.log(track)
}
// DeleteCells(1, {Name:"", Date:"", Position:""})

async function DeleteRow(row){
  const track = await Track.find({Region : row})
  track[0].remove()
}

async function AddRow(row, obj){
  obj.Region = row
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
      .find({Region: {$in: rows}})
  return tracks
}
ReadRows(['ec11', 'fr54', 'it358'])
.then(tracks => {
   console.log(tracks)
})
.catch(err => console.log(err))

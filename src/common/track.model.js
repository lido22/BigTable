const mongoose = require('mongoose');

//schema and model
const tracksSchema = mongoose.Schema({
  _id: false,
  Region: {
    type: String,
    required: true,
  },
  ID: {
    type: Number,
    required: true,
  },
  Position: {
    type: Number,
    required: true,
  },
  Name: {
    type: String,
    required: true,
  },
  Artist: String,
  Streams: {
    type: String,
    required: true,
  },
  URL: {
    type: String,
    required: true,
  },
  Date: String,
});

tracksSchema.index({ Reqgion: 1, ID: 1 }, { unique: true });
const Track = mongoose.model('track', tracksSchema);

module.exports = Track;

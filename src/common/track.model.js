const mongoose = require('mongoose');

//schema and model
const tracksSchema = mongoose.Schema({
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
  },
  Name: {
    type: String,
  },
  Artist: String,
  Streams: {
    type: String,
  },
  URL: {
    type: String,
  },
  Date: String,
});

tracksSchema.index({ Region: 1, ID: 1 }, { unique: true });
const Track = mongoose.model('track', tracksSchema);

module.exports = Track;

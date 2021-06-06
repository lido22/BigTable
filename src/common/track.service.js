const Track = require('./track.model');

async function set(row, obj) {
  return await Track.findOneAndUpdate(row, obj);
}

async function DeleteCells(row, cells) {
  const obj = cells.reduce((m, e, i) => Object.assign(m, { [e]: 1 }), {});

  return await Track.findOneAndUpdate(row, { $unset: obj }, { new: true });
}
// DeleteCells(1, {Name:"", Date:"", Position:""})

async function DeleteRow(row) {
  return await Track.findOneAndRemove(row);
}
//to-do
async function AddRow(obj) {
  const lastTrack = await Track.findOne({ Region: obj.Region })
    .sort({ ID: -1 })
    .limit(1);

  const lastID = lastTrack.ID;

  obj.ID = lastID + 1;

  const track = new Track(obj);
  return track.save();
}

async function ReadRows(rows) {
  tracks = [];
  for (const row of rows) {
    const track = await Track.findOne(row);
    tracks.push(track);
  }

  return tracks;
}

module.exports = {
  set,
  DeleteCells,
  DeleteRow,
  AddRow,
  ReadRows,
};

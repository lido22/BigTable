const fs = require('fs');

let rawdata = fs.readFileSync('tracks.json');
let tracks = JSON.parse(rawdata);
let tracksUpdated = [];
let offset = 1;
counter = 1;
var d = new Date('1/1/2017');

tracks.map((track) => {
  track['Date'] =
    d.getDay() + 1 + '/' + d.getMonth() + 1 + '/' + d.getFullYear();

  track['ID'] = counter;
  track['_id'] = undefined;

  if (!(counter % 200)) {
    d.setDate(d.getDate() + offset);
    offset *= -1;
  }

  if (counter == 400) counter = 1;
  else counter++;

  tracksUpdated.push(track);
});

fs.writeFileSync('trackUpdate.json', JSON.stringify(tracksUpdated, null, 4));

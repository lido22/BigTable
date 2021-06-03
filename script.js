const fs = require('fs');

let rawdata = fs.readFileSync('tracks.json');
let tracks = JSON.parse(rawdata);
let tracksUpdated = []
let day = 1
let month = 1
let year = 2017
counter = 1
var d = new Date("1/1/2017");

tracks.map((track) => {
    track["Date"] = d.getDay() + 1 + "/" + d.getMonth() + 1 + "/" + d.getFullYear()
    if (!(counter % 200)) {
        d.setDate(d.getDate() + 1);
    }
    counter++
    tracksUpdated.push(track)
})
fs.writeFileSync("trackUpdate.json", JSON.stringify(tracksUpdated));

const XLSX = require('xlsx')
const fs = require('fs')

var workbook = XLSX.readFile('tracks.xlsx');
var sheet_name_list = workbook.SheetNames;
var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

//creating tablets
var fr = [], ec = [], it = [];
xlData.forEach((obj) => {
    if(obj.Region === 'ec'){
        ec.push(obj)
    }
    else if(obj.Region === 'it'){
        it.push(obj)
    }
    else{
        fr.push(obj)
    }
})
//get to know the shape of data
// console.log(xlData[0])
// console.log(it.length)
// console.log(fr.length)
// console.log(ec.length)

//assigning tablets to tablet server
var randomBoolean = Math.random() < 0.5
server1Lenght = randomBoolean? 800:400;
meta = {
    tabletServer1:{
        startKey : 1,
        endKey : server1Lenght
    },
    tabletServer2:{
        startKey : server1Lenght+1,
        endKey : 1200
    }
}

//writing metadata
fs.writeFile('./metadata.json', JSON.stringify(meta, null, 4), function (err) {
    if (err) throw err;
    console.log('Replaced!');
});

const fs = require('fs');
const io = require('socket.io-client');

function startConnection(url) {

    const socket = io(url);

    socket.on('connect', () => {
        console.log(socket.id);
        socket.emit('fetch-meta', socket.id);
        socket.on('get-meta', meta=>{
            writeMeta(meta)
        })

    });
    console.log(socket.connected);
    return socket;
}

function sendrequest(requestType, data, socket) {
    socket.emit(requestType, JSON.stringify(data), socket.id);

}

function loadMetaData() {
    let rawdata = fs.readFileSync('./metadata.json');
    let metaTable = {}
    try{
        metaTable = JSON.parse(rawdata);
    }
    catch(err){
        console.log("metadata File is Empty")
    }
    return metaTable
}

function writeMeta(meta){
    fs.writeFile('./metadata.json', JSON.stringify(meta, null, 4), function (err) {
        if (err) throw err;
        console.log('metadata written!');
    });
    
}

const socket = startConnection('http://localhost:3000');

let metaTable = loadMetaData()
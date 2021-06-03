const fs = require('fs');
const io = require('socket.io-client');

function startConnection(url) {

    const socket = io(url);

    socket.on('connect', () => {
        console.log(socket.id);
    });
    console.log(socket.connected);
    return socket;
}

function sendrequest(requestType, data, socket) {
    socket.emit(requestType, JSON.stringify(data));

}

function loadMetaData() {
    let rawdata = fs.readFileSync('matedata.json');
    let metaTable = JSON.parse(rawdata);
    return metaTable
}

const socket = startConnection('http://localhost:8080');
const metaTable = loadMetaData()

sendrequest('insert', { name: 'ali' }, socket);

const webSocket = require("ws")
const socket = new webSocket("ws://localhost:3000")


const prompt = require('prompt');
const { json } = require("express");



socket.addEventListener('open', (event) => {
    console.log("Connected to WS server")
})

socket.addEventListener('message', (event) => {
    console.log("message from server", JSON.parse(event.data))
})

let newInput = true;
prompt.start();


setInterval(() => {
    if (newInput) {
        newInput = false
        prompt.get(['username'], function (err, result) {
            if (err) { return onErr(err) }
            socket.send(result.username)
            newInput = true
        });
    }
}, 3000)


function onErr(err) {
    console.log(err)
    return 1
}


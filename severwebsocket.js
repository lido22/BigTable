const http = require('http');

const server = http.createServer();

const io = require('socket.io')(server);

let numberOfClients = 0;
io.on('connection', (client) => {
  numberOfClients++;
  currentClient = numberOfClients;
  console.log('client number ' + currentClient + ' connected ');
  client.on('disconnect', () => {
    console.log('client number ' + currentClient + ' disconnected ');
  });

  client.on('insert', (data) => {
    console.log('your are inserting ', data);
  });
});

server.listen(8080, () => console.log('server started'));

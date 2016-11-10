var express = require('express');
var path = require('path');
var app = express();
var game_server = require('./game.server');


app.configure(function() {
    app.use(express.logger('dev'));
    app.use(express.static(path.join(__dirname,'public')));
});

var server = require('http').createServer(app).listen(process.env.PORT || 5000);
var io = require('socket.io').listen(server);

io.set('log level',1);

/*player.fill({
    playerName: tertert,
    posX: 12,
    posY: 12,
    course: tertert,
    kill: tertert,
    dead: tertert
});
console.log(player);*/

io.sockets.on('connection', function (socket) {
    game_server.initGame(io, socket);
});

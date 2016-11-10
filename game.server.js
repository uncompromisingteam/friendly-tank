var io;
var gameSocket;
var players = [];
//var bullets = [null, null, null, null];
//var bullets = [ [null, null], [null, null], [null, null], [null, null] ];
var gameStatus = false;
var positions = [
    { posX: 40, posY: 40, course: 'right'},
    { posX: 1040, posY: 40, course: 'left'},
    { posX: 40, posY: 640, course: 'right'},
    { posX: 1040, posY: 640, course: 'left'}
];

var player = require('./models/player');
var bullet = require('./models/bullet');

exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
    gameSocket.emit('connected', { message: "You are connected!" , gameStatus: gameStatus});

    //host events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);

    //player events
    gameSocket.on('playerJoinGame', playerJoinGame);

    gameSocket.on('playerRun', playerRun);
    gameSocket.on('playerFire', playerFire);
    gameSocket.on('bulletRemove', bulletRemove);


    gameSocket.on('deadPlayer', deadPlayer);

    gameSocket.on('disconnect', playerDisconnect);

}


function hostCreateNewGame() {
    //console.log(data);
    var thisGameId = 999;
    this.emit('newGameCreated', { gameId: thisGameId, mySocketId: this.id});
    this.join(thisGameId.toString());
    gameStatus = true;
}




function playerJoinGame(data) {
    var sock = this;
    var room = gameSocket.manager.rooms["/" + data.gameId];
    this.playerName = data.playerName;
    this.gameId = data.gameId;

    if( room != undefined ){

        data.mySocketId = sock.id;
        sock.join(data.gameId);

        data.posX = positions[players.length].posX;
        data.posY = positions[players.length].posY;
        data.course = positions[players.length].course;
        data.kill = 0;
        data.dead = 0;
        data.reloading = true;
        data.bullets = [null, null];

        var newPlayer = new player(data);
        players.push(newPlayer);

        io.sockets.in(data.gameId).emit('playerJoinedRoom', { player: newPlayer, players: players});

    } else {
        this.emit('error',{message: "This room does not exist."} );
    }
}

function playerRun(data) {
    players[data.playerNum].posX = data.player.posX;
    players[data.playerNum].posY = data.player.posY;
    players[data.playerNum].course = data.player.course;

    io.sockets.in(this.gameId).emit('playerUpdated', { player: players[data.playerNum], playerNum: data.playerNum, players: players });
}


function playerFire(data) {
    var bulletNum;

    if ( players[data.playerNum].bullets[0] === null ) { players[data.playerNum].bullets[0] = data.bullet; bulletNum = 0;}
    else { players[data.playerNum].bullets[1] = data.bullet; bulletNum = 1;}

    players[data.playerNum].reloading = false;

    io.sockets.in(this.gameId).emit('playerFired', { players: players, playerNum: data.playerNum, bulletNum: bulletNum });

}

function bulletRemove(data) {


    if (data.reloading) { players[data.playerNum].reloading = true; } else {
        // console.log( bullets[data.playerNum] );
        players[data.playerNum].bullets[data.bulletNum] = null;
    }
    io.sockets.in(this.gameId).emit('refreshBullets', { players: players });

}

function deadPlayer(data) {


    players = data.players.slice();

    players[data.deadNum].posX = positions[data.deadNum].posX;
    players[data.deadNum].posY = positions[data.deadNum].posY;
    players[data.deadNum].course = positions[data.deadNum].course;

    //io.sockets.in(this.gameId).emit('refreshAfterDead', { players: players });
}


function playerDisconnect() {
    var numDisconnectPlayer;


    for (var i = 0, l = players.length; i < l; i++) {
        if ( players[i].playerName === this.playerName) { numDisconnectPlayer = i; }
    }

    if ( players.length === 1 ) { gameStatus = false; }

    players.splice(numDisconnectPlayer, 1);

    if ( players.length > 0 && numDisconnectPlayer != players.length) {

        (function refreshPosition(){
            var stek = positions[numDisconnectPlayer];
            positions[numDisconnectPlayer] = positions[players.length];
            positions[players.length] = stek;
        })(); // так как при дисконнекте игрок удаляется из массива players, то позиция всех игроков смещается! чтобы предотвратить мы меняем нужные элементы массива positions!

        console.log( positions );
    }


    io.sockets.in(this.gameId).emit('refreshAfterDisconnect', {players: players, playerName: this.playerName});

}















//

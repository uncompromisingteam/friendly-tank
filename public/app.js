;jQuery(function($) {
    'use strict';

    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(callback,  element){
                window.setTimeout(callback, 1000 / 60);
              };
    })();

    var IO = {

        init: function() {
            IO.socket = io.connect();
            IO.bindEvents();
        },

        bindEvents: function() {
            IO.socket.on('connected', IO.onConnected);
            IO.socket.on('newGameCreated', IO.onNewGameCreated);
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom);

            IO.socket.on('playerUpdated', IO.playerUpdated);
            IO.socket.on('playerFired', IO.playerFired);

            //IO.socket.on('refreshAfterDead', IO.refreshAfterDead);

            IO.socket.on('refreshAfterDisconnect', IO.refreshAfterDisconnect);
            IO.socket.on('refreshBullets', IO.refreshBullets);
        },

        onConnected: function(data) {
            App.mySocketId = IO.socket.socket.sessionid;
            App.gameStatus = data.gameStatus;
        },

        onNewGameCreated: function(data) {
            App.Host.gameInit(data);
        },

        playerJoinedRoom: function(data){
            if (App.Player.myName === data.player.playerName) {
                App.Player.updateWaitingScreen(data);
            } else {
                //App.Player.players = data.players.slice();

                App.Player.createPlayers(data.player, undefined, data.players);
                //App.Player.playerRefresh(data.player);
            }

        },

        playerUpdated: function(data){
            //App.Player.gameWorld(data);
            App.Player.playerRefresh(data);

        },

        playerFired: function(data){
            // data.players[data.playerNum].bullets[data.bulletNum]
            App.Player.players = data.players.slice();

            App.Player.fire().showAllBullets(data.players[data.playerNum].bullets[data.bulletNum], data.playerNum, data.bulletNum);

        },

        refreshBullets: function(data){
            App.Player.players = data.players.slice();
        },

        /*refreshAfterDead: function(data){
            App.Player.players = data.players.slice();
        },*/

        refreshAfterDisconnect: function(data){
            App.Player.removePlayer(data);
        }



    };

    var App = {

        gameId: 0,
        myRole: '',
        gameStatus: null,
        mySocketId: '',
        levelPlan : [
          "wwwwwwwwwwwwwwwwwwwwwwwwwwww",   // (1)
          "w           wwww           w",   // (2)
          "w www wwwww      wwwww www w",   // (3)
          "w www wwwwwwwwwwwwwwww www w",   // (4)
          "w www wwwwwwwwwwwwwwww www w",   // (5)
          "w                          w",   // (6)
          "w wwwwwwwwwwwwwwwwwwwwwwww w",   // (7)
          "w wwwwwwwwwwwwwwwwwwwwwwww w",   // (8)
          "w wwwwwwwwwwwwwwwwwwwwwwww w",   // (9)
          "w wwwwwwwwwwwwwwwwwwwwwwww w",   // (9)
          "w wwwwwwwwwwwwwwwwwwwwwwww w",   // (9)
          "w wwwwwwwwwwwwwwwwwwwwwwww w",   // (10)
          "w                          w",   // (11)
          "w www wwwwwwwwwwwwwwww www w",   // (12)
          "w www wwwwwwwwwwwwwwww www w",   // (13)
          "w www wwwww      wwwww www w",   // (14)
          "w           wwww           w",   // (15)
          "wwwwwwwwwwwwwwwwwwwwwwwwwwww",   // (16)
        ],

        init: function() {
            App.cacheElements();
            App.cacheProperty();
            App.showInitScreen();
            App.bindEvents();

            FastClick.attach(document.body);
        },

        cacheElements: function() {
            App.$doc = $(document);

            // Templates
            App.$gameArea = $('#gameArea');
            App.$gameFieldArea = $('#gameFieldArea');
            App.$templateHelloScreen = $('#hello-screen-template').html();
            App.$templateNewGame = $('#create-game-template').html();
            App.$templateJoinGame = $('#join-game-template').html();
            App.$gameFieldTemplate = $('#game-field-template').html();

            var bodyWidth = document.body.clientWidth;
            var bodyHeight = document.body.clientHeight;
            var percent = bodyHeight/bodyWidth*100;
        },

        cacheProperty: function() {

            App.$bodyWidth = document.body.clientWidth;
            App.$bodyHeight = document.body.clientHeight;

            App.Player.$courseLeft = 'url(img/tankLeft.png)';
            App.Player.$courseRight = 'url(img/tankRight.png)';
            App.Player.$courseTop = 'url(img/tankTop.png)';
            App.Player.$courseBottom = 'url(img/tankBottom.png)';

            App.$initSize = 40;
        },

        bindEvents: function() {

            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);

            App.$doc.on('click', '#btnJoinGame', App.Player.onJoinClick);
            App.$doc.on('click', '#btnStart', App.Player.onPlayerStartClick);

            App.$doc.on('keydown', App.Player.runPlayerEvent );

        },

        showInitScreen: function() {
            App.$gameArea.html(App.$templateHelloScreen);
            App.doTextFit('.title');
        },

        Host: {

            players: [],
            isNewGame: false,
            numPlayersInRoom: 0,

            onCreateClick: function() {
                // App.myRole = 'Host';
                if (App.gameStatus === false) {
                    IO.socket.emit('hostCreateNewGame');
                }
            },

            gameInit: function(data){
                App.gameId = data.gameId;
                App.mySocketId = data.mySocketId;
                //App.myRole = 'Host';
                App.Host.numPlayersInRoom = 1;

                App.Host.displayNewGameScreen();
            },

            displayNewGameScreen: function() {

                App.$gameArea.html( App.$templateJoinGame );

            }

        },


        /* *****************************
         *        PLAYER CODE        *
         ***************************** */

        Player: {
            hostSocketId: '',
            myName: '',
            players: [],
            playerSize: 40,
            speedBullet: 400,
            speedPlayer: 200,
            playerActive: 0,
            canRun: true,

            onJoinClick: function() {
                if (App.gameStatus === true) {
                    App.$gameArea.html(App.$templateJoinGame);
                }
            },

            onPlayerStartClick: function() {

                var data = {
                    gameId: +($('#inputGameId').val()),
                    playerName: $('#inputPlayerName').val() || 'anon',
                };

                App.Player.myName = data.playerName;

                IO.socket.emit('playerJoinGame', data);

                //App.Player.players.push(data);

            },

            updateWaitingScreen: function(data) {
                //console.log(data[0]);

                if (IO.socket.socket.sessionid === data.player.mySocketId) {
                    App.myRole = 'Player';
                    App.gameId = data.player.gameId;

                    App.Player.players = data.players.slice();

                    App.Player.gameWorld(data.players);

                }
            },

            gameWorld: function(players) {
                // console.log( players );
                App.$gameArea.html( App.$gameFieldTemplate );
                App.Player.drawingLevel();
                for (var i = 0, l = players.length; i < l; i++) {
                    (function(e){
                        App.Player.createPlayers( players[e], e );
                    })(i);
                }
                // App.$doc.on('keydown', App.Player.runPlayerEvent );
            },

            drawingLevel: function() {

                $("#gameFieldArea").css({ 'width': App.$initSize*App.levelPlan[0].length + "px",
                                          'height': App.$initSize*App.levelPlan.length + "px",
                                          'margin': '10px' });

                $("#gameArea").css({ 'background-image': 'none' });

                $("#statFieldArea").css({ 'width': App.$bodyWidth - $("#gameFieldArea").width() - 50 + "px" });

                App.doTextFit('.statisticTitle');


                for (var i = 0; i < App.levelPlan.length; i++) {
                    for (var j = 0; j < App.levelPlan[i].length; j++) {

                        if ( App.levelPlan[i][j] === "w" ) {

                            $("#gameFieldArea").append( $('<div/>').addClass('wallContainer')
                                                                   .css({'left': App.$initSize * j,
                                                                         'top': App.$initSize * i,
                                                                         'width': App.$initSize + 'px',
                                                                         'height': App.$initSize + 'px' }) );
                        }
                    }
                }


            },

            createPlayers: function(player, i, players) {

                //if ( $("."+ player.playerName) ) { $("."+ player.playerName).remove(); }

                $("#gameFieldArea").append( $('<div/>').addClass('tankContainer ' + player.playerName)
                                                       .css({'left': player.posX + 'px',
                                                            'top': player.posY + 'px',
                                                            'width': App.$initSize + 'px',
                                                            'height': App.$initSize + 'px',
                                                            'background-image':  App.Player.getCourseURL(player.course)
                                                        }) );

                $("#statFieldArea").append( $('<div/>').addClass('statPlayer statPlayer'+ player.playerName)
                                   .append( $('<p/>').addClass('statName').html(player.playerName + ":") )
                                   .append( $('<p/>').addClass('statKill').html("Kills: " + player.kill) )
                                   .append( $('<p/>').addClass('statDead').html("Dead: " + player.dead) ) );




               if ( i !== undefined ) { App.Player.playerActive = i; }
               if ( players !== undefined ) { App.Player.players = players.slice(); }


            },

            runPlayerEvent: function(eventObject) {

                var runAnimateFrameID;
                var lastTime;

                if ((eventObject.keyCode === 39) && (App.Player.canRun === true) ) {
                    App.Player.canRun = false;
                    runRightTank();
                }
                if ((eventObject.keyCode === 37) && (App.Player.canRun === true) ) {
                    App.Player.canRun = false;
                    runLeftTank();
                }
                if ((eventObject.keyCode === 38) && (App.Player.canRun === true) ) {
                    App.Player.canRun = false;
                    runTopTank();
                }
                if ((eventObject.keyCode === 40) && (App.Player.canRun === true) ) {
                    App.Player.canRun = false;
                    runBottomTank();
                }

                function runRightTank() {

                    runAnimateFrameID = requestAnimationFrame(runRightTank);

                    var now = Date.now();
                    var dt = (now - (lastTime || now)) / 1000.0;
                    lastTime = now;

                    App.Player.players[App.Player.playerActive].course = 'right';

                    if ( App.Player.checkStepRun(App.Player.players[App.Player.playerActive], App.Player.players).right() === true ) {
                        App.Player.players[App.Player.playerActive].posX += App.Player.speedPlayer*dt;
                        $('div.'+ App.Player.players[App.Player.playerActive].playerName ).css({'left': App.Player.players[App.Player.playerActive].posX + 'px'});
                    }

                    IO.socket.emit('playerRun', {player: App.Player.players[App.Player.playerActive], playerNum: App.Player.playerActive});

                }
                function runLeftTank() {

                    runAnimateFrameID = requestAnimationFrame(runLeftTank);

                    var now = Date.now();
                    var dt = (now - (lastTime || now)) / 1000.0;
                    lastTime = now;

                    App.Player.players[App.Player.playerActive].course = 'left';

                    if ( App.Player.checkStepRun(App.Player.players[App.Player.playerActive], App.Player.players).left() === true ) {
                        App.Player.players[App.Player.playerActive].posX -= App.Player.speedPlayer*dt;
                        $('div.'+ App.Player.players[App.Player.playerActive].playerName ).css({'left': App.Player.players[App.Player.playerActive].posX + 'px'});
                    }

                    IO.socket.emit('playerRun', {player: App.Player.players[App.Player.playerActive], playerNum: App.Player.playerActive});

                }
                function runTopTank() {

                    runAnimateFrameID = requestAnimationFrame(runTopTank);

                    var now = Date.now();
                    var dt = (now - (lastTime || now)) / 1000.0;
                    lastTime = now;

                    App.Player.players[App.Player.playerActive].course = 'top';

                    if ( App.Player.checkStepRun(App.Player.players[App.Player.playerActive], App.Player.players).top() === true ) {
                        App.Player.players[App.Player.playerActive].posY -= App.Player.speedPlayer*dt;
                        $('div.'+ App.Player.players[App.Player.playerActive].playerName ).css({'top': App.Player.players[App.Player.playerActive].posY + 'px'});
                    }

                    IO.socket.emit('playerRun', {player: App.Player.players[App.Player.playerActive], playerNum: App.Player.playerActive});

                }
                function runBottomTank() {

                    runAnimateFrameID = requestAnimationFrame(runBottomTank);

                    var now = Date.now();
                    var dt = (now - (lastTime || now)) / 1000.0;
                    lastTime = now;

                    App.Player.players[App.Player.playerActive].course = 'bottom';

                    if ( App.Player.checkStepRun(App.Player.players[App.Player.playerActive], App.Player.players).bottom() === true ) {
                        App.Player.players[App.Player.playerActive].posY += App.Player.speedPlayer*dt;
                        $('div.'+ App.Player.players[App.Player.playerActive].playerName ).css({'top': App.Player.players[App.Player.playerActive].posY + 'px'});
                    }

                    IO.socket.emit('playerRun', {player: App.Player.players[App.Player.playerActive], playerNum: App.Player.playerActive});

                }

                App.$doc.on('keyup', function(){
                    App.Player.canRun = true;
                    window.cancelAnimationFrame(runAnimateFrameID);
                });


                // event run right
                /*if (eventObject.keyCode === 39 ) {
                    $('div.'+ App.Player.players[App.Player.playerActive].playerName ).stop()
                                                                                      .css({'background-image': App.Player.$courseRight});
                    App.Player.players[App.Player.playerActive].course = 'right';

                    if ( App.Player.checkStepRun(App.Player.players[App.Player.playerActive], App.Player.players).right() === true ) {
                        App.Player.players[App.Player.playerActive].posX +=5;

                        $('div.'+ App.Player.players[App.Player.playerActive].playerName ).animate({
                            left: "+=5",
                        }, 35, function() {
                            App.$doc.on('keyup', function(){
                                $('div.'+ App.Player.players[App.Player.playerActive].playerName ).stop();
                            });
                        });
                    }

                    IO.socket.emit('playerRun', {player: App.Player.players[App.Player.playerActive], playerNum: App.Player.playerActive});
                }*/

                // event run left
                /*if (eventObject.keyCode === 37 ) {
                    $('div.'+ App.Player.players[App.Player.playerActive].playerName ).stop()
                                                                                      .css({'background-image': App.Player.$courseLeft});
                    App.Player.players[App.Player.playerActive].course = 'left';
                    if ( App.Player.checkStepRun(App.Player.players[App.Player.playerActive], App.Player.players).left() === true ) {
                        App.Player.players[App.Player.playerActive].posX -=5;
                        $('div.'+ App.Player.players[App.Player.playerActive].playerName ).animate({
                            left: "-=5",
                        }, 35, function() {
                            App.$doc.on('keyup', function(){
                                $('div.'+ App.Player.players[App.Player.playerActive].playerName ).stop();
                            });
                        });
                    }
                    IO.socket.emit('playerRun', {player: App.Player.players[App.Player.playerActive], playerNum: App.Player.playerActive});

                }*/

                // event run top
                /*if (eventObject.keyCode === 38 ) {
                    $('div.'+ App.Player.players[App.Player.playerActive].playerName ).stop()
                                                                                      .css({'background-image': App.Player.$courseTop});
                    App.Player.players[App.Player.playerActive].course = 'top';
                    if ( App.Player.checkStepRun(App.Player.players[App.Player.playerActive], App.Player.players).top() === true ) {
                        App.Player.players[App.Player.playerActive].posY -=5;
                        $('div.'+ App.Player.players[App.Player.playerActive].playerName ).animate({
                            top: "-=5",
                        }, 35, function() {
                            App.$doc.on('keyup', function(){
                                $('div.'+ App.Player.players[App.Player.playerActive].playerName ).stop();
                            });
                        });
                    }
                    IO.socket.emit('playerRun', {player: App.Player.players[App.Player.playerActive], playerNum: App.Player.playerActive});
                }*/

                // event run bottom
                /*if (eventObject.keyCode === 40 ) {
                    $('div.'+ App.Player.players[App.Player.playerActive].playerName ).stop()
                                                                                      .css({'background-image': App.Player.$courseBottom});
                    App.Player.players[App.Player.playerActive].course = 'bottom';
                    if ( App.Player.checkStepRun(App.Player.players[App.Player.playerActive], App.Player.players).bottom() === true ) {
                        App.Player.players[App.Player.playerActive].posY +=5;
                        $('div.'+ App.Player.players[App.Player.playerActive].playerName ).animate({
                            top: "+=5",
                        }, 35, function() {
                            App.$doc.on('keyup', function(){
                                $('div.'+ App.Player.players[App.Player.playerActive].playerName ).stop();
                            });
                        });
                    }
                    IO.socket.emit('playerRun', {player: App.Player.players[App.Player.playerActive], playerNum: App.Player.playerActive});
                }*/

                if (eventObject.keyCode === 32 ) {
                    App.Player.fire().createBullet( App.Player.players[App.Player.playerActive] );
                }


                // console.log(App.Player.players[1].posX);
                // console.log(App.Player.players[App.Player.playerActive].posY);

            },

            playerRefresh: function(data) {
                $('div.'+ data.player.playerName ).remove();
                $("#gameFieldArea").append( $('<div/>').addClass('tankContainer ' + data.player.playerName)
                                                      .css({'left': data.player.posX + 'px',
                                                            'top': data.player.posY + 'px',
                                                            'background-image':  App.Player.getCourseURL(data.player.course)
                                                      }) );
                if ( data.players !== undefined ) { App.Player.players = data.players.slice(); }
            },

            getCourseURL: function(course) {
                if ( course === 'left' ) { return App.Player.$courseLeft };
                if ( course === 'right' ) { return App.Player.$courseRight };
                if ( course === 'top' ) { return App.Player.$courseTop };
                if ( course === 'bottom' ) { return App.Player.$courseBottom };

            },

            removePlayer: function(data) {
                $('div.'+ data.playerName ).remove();
                $(".statPlayer" + data.playerName).remove();
            },

            undeadPlayer: function(data) {

                var deadPlayerName = App.Player.players[data.deadNum].playerName;
                var killPlayerName = App.Player.players[data.killNum].playerName;

                $('div.'+ deadPlayerName ).css({'display': 'none' });

                $('.statPlayer'+ deadPlayerName).find('.statDead').html("Dead: " + App.Player.players[data.deadNum].dead);
                $('.statPlayer'+ killPlayerName).find('.statKill').html("Kills: " + App.Player.players[data.killNum].kill);

                if (undead) { while (undead--) { clearTimeout(undead); }}
                var undead = setTimeout(function() {

                    $('div.'+ deadPlayerName ).css({'display': 'block',
                                                        'left': App.Player.players[App.Player.getPlayerNum(deadPlayerName)].posX + 'px',
                                                         'top': App.Player.players[App.Player.getPlayerNum(deadPlayerName)].posY + 'px' });


                }, 1000);

            },

            getPlayerNum: function(playerName) {
                var num;
                for (var i = 0; i < App.Player.players.length; i++) {
                    (function(e){
                        if ( App.Player.players[e].playerName === playerName ) { num = e; }
                    })(i);
                }
                return num;
            },

            checkStepRun: function(player) {
                var players = App.Player.players;

                var positionConvert = function(posX, posY) {

                    var x = Math.floor(posX/App.$initSize),
                        y = Math.floor(posY/App.$initSize),
                        vertical = true, horizontal = true;

                    if ( posX % App.$initSize > 0 ) { x++; } else { vertical = false; }
                    if ( posY % App.$initSize > 0 ) { y++; } else { horizontal = false; }

                    return {coordX: x, coordY: y, vertical: vertical, horizontal: horizontal}
                };
                var comparePlayers = function(newPos) {
                    for(var i = 0; i < players.length; i++) {

                        if ( (newPos.w - players[i].posX)===0  && (newPos.h - players[i].posY)<0 ) {
                            if ( (players.length > 1) && ( App.Player.playerActive !== i) && Math.abs(newPos.h - players[i].posY)<40 ) { return false; }
                        }
                        if ( (newPos.w - players[i].posX)===0  && (newPos.h - players[i].posY)>0 ) {
                            if ( (players.length > 1) && ( App.Player.playerActive !== i) && (newPos.h - players[i].posY)<10 ) { return false; }
                        }

                        if ( (newPos.w - players[i].posX)<0  && (newPos.h - players[i].posY)===0 ) {
                            if ( (players.length > 1) && ( App.Player.playerActive !== i) && Math.abs(newPos.w - players[i].posX)<40 ) { return false; }
                        }
                        if ( (newPos.w - players[i].posX)>0  && (newPos.h - players[i].posY)===0 ) {
                            if ( (players.length > 1) && ( App.Player.playerActive !== i) && (newPos.w - players[i].posX)<10 ) { return false; }
                        }
                    }
                };

                return {
                    left: function() {
                        var newCoord = positionConvert(player.posX - 40, player.posY);
                        var oldCoord = positionConvert(player.posX, player.posY);
                        if ( App.levelPlan[newCoord.coordY][newCoord.coordX] ==="w" || newCoord.horizontal === true || comparePlayers({ w: player.posX - 40, h: player.posY }) === false ) { return false; } else { return true; }
                    },
                    right: function() {
                        var newCoord = positionConvert(player.posX + 5, player.posY);
                        var oldCoord = positionConvert(player.posX, player.posY);
                        if ( App.levelPlan[newCoord.coordY][newCoord.coordX] ==="w" || newCoord.horizontal === true || comparePlayers({ w: player.posX + 5, h: player.posY }) === false ) { return false; } else { return true; }
                    },
                    top: function() {
                        var newCoord = positionConvert(player.posX, player.posY - 40);
                        var oldCoord = positionConvert(player.posX, player.posY);
                        if ( App.levelPlan[newCoord.coordY][newCoord.coordX] ==="w" || newCoord.vertical === true || comparePlayers({ w: player.posX, h: player.posY - 40 }) === false ) { return false; } else { return true; }
                    },
                    bottom: function() {
                        var newCoord = positionConvert(player.posX, player.posY + 5);
                        var oldCoord = positionConvert(player.posX, player.posY);
                        if ( App.levelPlan[newCoord.coordY][newCoord.coordX] ==="w" || newCoord.vertical === true || comparePlayers({ w: player.posX, h: player.posY + 5 }) === false ) { return false; } else { return true; }
                    }
                }
            },

            fire: function() {

                return {
                    createBullet: function(player) {

                        if ( App.Player.players[App.Player.playerActive].reloading === true ) {
                            var course = player.course;

                            var getInitialValue = function() {
                                var value = {};
                                if ( course === 'right' ) {
                                    value.x = player.posX + 42;
                                    value.y = player.posY + App.$initSize/2 - 7;
                                }

                                if ( course === 'left' ) {
                                    value.x = player.posX - 16;
                                    value.y =  player.posY + App.$initSize/2 - 7;
                                }

                                if ( course === 'top' ) {
                                    value.x = player.posX + App.$initSize/2 - 8;
                                    value.y = player.posY - 16;
                                }

                                if ( course === 'bottom' ) {
                                    value.x = player.posX + App.$initSize/2 - 8;
                                    value.y = player.posY + 41;
                                }
                                return { x: value.x, y: value.y }
                            };

                            var bullet = {
                                posX: getInitialValue().x,
                                posY: getInitialValue().y,
                                course: course,
                                playerName: player.playerName
                            }

                            IO.socket.emit('playerFire', { bullet: bullet, playerNum: App.Player.playerActive });

                        }

                    },

                    showAllBullets: function(bullet, playerNum, bulletNum) {

                        $("#gameFieldArea").append( $('<div/>').addClass('bigFuckingShot bigFuckingShot' + App.Player.players[playerNum].playerName + bulletNum)
                            .css({'left': bullet.posX + 'px',
                                  'top': bullet.posY + 'px',
                                  'background-position':  bullet.course === 'left' ? "0px 0px" : ( bullet.course === 'right' ? "-15px 0px" : ( bullet.course === 'top' ? "0px -15px" : (bullet.course === 'bottom' ? "-15px -15px" : "-15px -15px" )))
                            }) );


                        /*var interval1 = setInterval(function(){

                            bullet.posX = (bullet.course === 'left') ? (bullet.posX-1) : ( bullet.course === 'right' ? (bullet.posX+1) : bullet.posX );
                            bullet.posY = (bullet.course === 'top') ? (bullet.posY-1) : ( bullet.course === 'bottom' ? (bullet.posY+1) : bullet.posY );

                            $(".bigFuckingShot" + App.Player.players[playerNum].playerName + bulletNum).css({ 'left': bullet.posX + 'px', 'top': bullet.posY + 'px' });


                        }, 1);*/

                        var animateFrameID;
                        var lastTime, stopped;

                        (function flyBullet() {
                            animateFrameID = requestAnimationFrame(flyBullet);
                            var now = Date.now();
                            var dt = (now - (lastTime || now)) / 1000.0;
                            lastTime = now;

                            // var bulletOldPosX = bullet.posX;
                            // var bulletOldPosY = bullet.posY;

                            bullet.posX = (bullet.course === 'left') ? (bullet.posX-App.Player.speedBullet*dt) : ( bullet.course === 'right' ? (bullet.posX+App.Player.speedBullet*dt) : bullet.posX );
                            bullet.posY = (bullet.course === 'top') ? (bullet.posY-App.Player.speedBullet*dt) : ( bullet.course === 'bottom' ? (bullet.posY+App.Player.speedBullet*dt) : bullet.posY );

                            var bulletCoordX = (bullet.course === 'left') ? Math.floor((bullet.posX+10)/40) : Math.floor(bullet.posX/40);
                            var bulletCoordY = (bullet.course === 'top') ? Math.floor((bullet.posY+10)/40) : Math.floor(bullet.posY/40);
                            var checkHit = App.Player.bulletCheckHit(bullet).hit;
                            var y = 0;

                            //if ( App.Player.bulletCheckWall(bullet) ) {
                            if ( App.levelPlan[bulletCoordY][bulletCoordX] ==="w" || checkHit === true ) {

                                if ( checkHit === true ) {
                                    y = y + 1;

                                    var deadNum = App.Player.bulletCheckHit(bullet).deadTankNum;
                                    var killNum = App.Player.getPlayerNum(bullet.playerName);
                                    App.Player.players[deadNum].dead += 1;
                                    App.Player.players[killNum].kill += 1;

                                    // IO.socket.emit('deadPlayer', { killPlayerNUm: killNum, deadTankNum: deadNum });
                                    IO.socket.emit('deadPlayer', { players: App.Player.players, deadNum: deadNum });
                                    App.Player.undeadPlayer({ killNum: killNum, deadNum: deadNum });

                                    //console.log(App.Player.bulletCheckHit(bullet).deadTankNum);
                                }
                                console.log(y);

                                window.cancelAnimationFrame(animateFrameID);
                                IO.socket.emit('bulletRemove', { playerNum: playerNum, bulletNum: bulletNum });
                                //App.Player.boom( $(".bigFuckingShot" + App.Player.players[playerNum].playerName + bulletNum), { x: bulletOldPosX, y: bulletOldPosY, course: bullet.course }, function() {
                                    $(".bigFuckingShot" + App.Player.players[playerNum].playerName + bulletNum).remove();
                                //});
                            } else {
                                $(".bigFuckingShot" + App.Player.players[playerNum].playerName + bulletNum).css({ 'left': bullet.posX + 'px', 'top': bullet.posY + 'px' });
                            }


                        })();

                        if (timeout1) { while (timeout1--) { clearTimeout(timeout1); }}
                        //if (timeout2) { while (timeout2--) { clearTimeout(timeout2); }}

                        var timeout1 = setTimeout(function() {
                            IO.socket.emit('bulletRemove', { playerNum: playerNum, bulletNum: bulletNum, reloading: true });
                        }, 1000);

                        /*var timeout2 = setTimeout(function() {
                            //clearInterval(interval1);
                            window.cancelAnimationFrame(animateFrameID);
                            IO.socket.emit('bulletRemove', { playerNum: playerNum, bulletNum: bulletNum });

                            App.Player.boom( $(".bigFuckingShot" + App.Player.players[playerNum].playerName + bulletNum), { x: bullet.posX, y: bullet.posY, course: bullet.course }, function() {
                                $(".bigFuckingShot" + App.Player.players[playerNum].playerName + bulletNum).remove();
                            });

                        }, 1500);*/


                    }
                }

            },

            boom: function(DOMelementBullet, boomValue, callback) {

                DOMelementBullet.addClass("boom");
                DOMelementBullet.removeClass("bigFuckingShot");

                DOMelementBullet.css({
                    'left': (boomValue.course === 'left' || boomValue.course === 'right') ? boomValue.x + 'px' : boomValue.x - 6 + 'px',
                    'top': (boomValue.course === 'top' || boomValue.course === 'bottom') ? boomValue.y + 'px' : boomValue.y - 6 + 'px',
                    'background-position': "0px 0px"
                });

                for (var i = 1; i < 5; i++) {

                    (function(e) {

                        if (timeout3) { while (timeout3--) { clearTimeout(timeout3); }}
                        var timeout3 = setTimeout(function() {
                            DOMelementBullet.css({
                                'background-position': -25*e + "px 0px"
                            });
                        }, 100);

                    })(i);

                }

                if (timeout4) { while (timeout4--) { clearTimeout(timeout4); }}
                var timeout4 = setTimeout(function() {
                    callback();
                }, 350);


            },

            /*bulletCheckWall: function(bullet) {
                return false;
            },*/

            bulletCheckHit: function(bullet) {
                var hit = false;
                var deadTankNum;

                function getCoord(posX, posY){
                    return {
                        coordX: Math.floor(posX/40),
                        coordY: Math.floor(posY/40)
                    }
                }

                var bulletCoordinate = getCoord(bullet.posX, bullet.posY);
                bulletCoordinate.playerName = bullet.playerName;

                for (var i = 0; i < App.Player.players.length; i++) {
                    (function(e){
                        if ( bulletCoordinate.coordX === getCoord(App.Player.players[e].posX, App.Player.players[e].posY).coordX &&
                        bulletCoordinate.coordY === getCoord(App.Player.players[e].posX, App.Player.players[e].posY).coordY &&
                        bulletCoordinate.playerName !== App.Player.players[e].playerName ) {
                            hit = true; deadTankNum = e;
                        }
                    })(i);
                }

                return { hit:hit, deadTankNum: deadTankNum }
            }

        },

        doTextFit: function(el) {
            textFit(
                $(el)[0], {
                    alignHoriz: true,
                    alignVert: false,
                    widthOnly: true,
                    reProcess: true,
                    maxFontSize: 300
                }
            );
        }

    };

    IO.init();
    App.init();

    // $('#gameArea').html( $('#hello-screen-template').html() );

}($));

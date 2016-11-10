var Player = function () {

	this.data = {
		gameId: null,
		mySocketId: null,
		playerName: null,
        posX: null,
		posY: null,
        course: null,
        kill: null,
        dead: null,
		reloading: null,
		bullets: [null, null]
	};

    this.fill = function (info) {
		for(var prop in this.data) {
			if(this.data[prop] !== 'undefined') {
				this.data[prop] = info[prop];
			}
		}
	};

    this.getInformation = function () {
		return this.data;
	};

};



module.exports = function (info) {
	var player = new Player();

	player.fill(info);

	return player.getInformation();
};

var Bullet = function () {

	this.data = {
		playerName: null,
        posX: null,
		posY: null,
        course: null
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
	var bullet = new Bullet();

	bullet.fill(info);

	return bullet.getInformation();
};

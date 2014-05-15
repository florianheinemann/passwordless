'use strict';

function Schema() {

}

Schema.prototype.sendToken = function(clearTextToken) {
	throw new Error('Schema shall never be called in its abstract form');
}

module.exports = Schema;
module.exports = function(grunt) {

	grunt.loadNpmTasks('grunt-mocha-test');

	grunt.initConfig({
		mochaTest: {
			test: {
				options: {
					reporter: 'spec'
				},
				src: ['test/**/*.test.js']
			}
		}
	});

	grunt.registerTask('test', ['mochaTest']);
};
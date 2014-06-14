module.exports = function(grunt) {

	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-jsdoc');

	grunt.initConfig({
		mochaTest: {
			test: {
				options: {
					reporter: 'spec'
				},
				src: ['test/**/*.test.js']
			}
		},
		jsdoc : {
			dist : {
				src: ['lib/**/*.js'], 
				options: {
					destination: 'docs'
				}
			}
		}
	});

	grunt.registerTask('test', ['mochaTest', 'jsdoc']);
};
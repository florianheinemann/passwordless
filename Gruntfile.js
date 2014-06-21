module.exports = function(grunt) {

	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-jsdoc');
	grunt.loadNpmTasks('grunt-contrib-clean');

	grunt.initConfig({
		clean: {
			docs: ['docs']
		},
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
				src: ['lib/passwordless/passwordless.js'], 
				options: {
					destination: 'docs'
				}
			}
		}
	});

	grunt.registerTask('test', ['mochaTest']);
	grunt.registerTask('docs', ['clean:docs', 'jsdoc']);
};
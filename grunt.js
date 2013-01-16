module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    concat: {
      dist: {
        src: [
          'ooyala.client.js', 'eventdispatcher.js', 'assetcreator.js',
          'uploader.js', 'chunk-providers/html5provider.js', 'htmluploader.js'
        ],
        dest: 'dist/ooyala-web-uploader.js'
      }
    },
    min: {
      dist: {
        src: ['dist/ooyala-web-uploader.js'],
        dest: 'dist/ooyala-web-uploader.min.js'
      }
    },
    lint: {
      all: ['grunt.js']
    },
    jshint: {
      options: {
        browser: true
      }
    }
  });

  // Default task.
  grunt.registerTask('default', 'lint concat min');
};

/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    bower: {
      install: {
        options: {
          targetDir: 'example/lib',
          layout: 'byType',
          install: true,
          verbose: true,
          cleanTargetDir: true,
          cleanBowerDir: false
        }
      }
    },
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      dist: {
        src: [
         'src/portable-cache.prefix',
         'src/portable-cache.js',
         'src/portable-cache.suffix'
        ],
        dest: 'dist/portable-cache.js'
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>',
        compress: {
          global_defs: {
            "__debug": false
          },
          dead_code: true
        }
      },
      my_target: {
        files: {
          'dist/portable-cache.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        browser: true,
        globals: {
          jQuery: true
        }
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib_test: {
        src: ['lib/**/*.js', 'test/**/*.js']
      }
    },
    qunit: {
      files: ['test/**/*.html']
    },
    watch: {
      files: [
        'Gruntfile.js',
        'src/*'
      ],
      tasks: ['compress']
    },
    jsdoc: {
      dist: {
        src: ['src/portable-cache.js'],
        options: {
          destination: 'doc'
        }
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-jsdoc');

  // Default task.
  grunt.registerTask('compress', ['concat', 'uglify']);
  grunt.registerTask('install', ['bower']);
  grunt.registerTask('doc', ['jsdoc']);

};

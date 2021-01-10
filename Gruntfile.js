module.exports = function (grunt) {
  'use strict' // Allow trailing commas only in the Gruntfile

  grunt.initConfig({
    app: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        process: true
      },
      all: {
        files: {
          // 'build/dragnipur2.debug.js': [
          //   'public/src/header.txt',
          //   'public/src/js/**/*.js'
          //   // List the files that must go into this
          //   // Because this is a debug file, you should
          //   // probably keep logging on wherever possible
          //   // 'public/src/lib/class.js',
          // ],
          // 'build/dragnipur2.debug.css': [
          //   'public/src/header.txt',
          //   'public/src/css/**/*.css'
          //   // List the files that must go into this
          //   // Because this is a debug file, you should
          //   // probably keep logging on wherever possible
          //   // 'public/src/parchment/parchment.css',
          // ],
          // 'build/dragnipur2.min.js': [
          //   'public/src/header.txt',
          //   'public/src/js/**/*.js'
          //   // List the files that must go into this
          //   // Because this is a minified file, you should
          //   // probably keep logging off wherever possible
          //   // 'public/src/lib/class.js',
          // ],
          // 'build/dragnipur2.min.css': [
          //   'public/src/header.txt',
          //   'public/src/css/**/*.css'
          //   // List the files that must go into this
          //   // Because this is a minified file, you should
          //   // probably keep logging off wherever possible
          //   // 'public/src/lib/class.css',
          // ],

          // 'build/worker.min.js': ['public/src/header.txt', 'public/worker.js'],
          'build/manifest.json': ['public/manifest.json']
        }
      },
      css: {
        files: {
          'concat/dragnipur2.min.css': [
            'public/src/css/**/*.css'
          ],
          'concat/dragnipur2.debug.css': [
            'public/src/css/**/*.css'
          ]
        }
      },
      js: {
        files: {
          'concat/dragnipur2.min.js': [
            'public/src/js/**/*.js'
          ],
          'concat/dragnipur2.debug.js': [
            'public/src/js/**/*.js'
          ]
        }
      }
    },

    cssmin: {
      debug: {
        files: [
          {
            cwd: 'public/src/css/', // set working folder / root to copy
            src: '**/*.css',
            dest: 'build/src/css/', // destination folder
            expand: true // required when using cwd
          }
        ]
      }
    },

    jshint: {
      options: {
        // Enforcing options
        curly: true, // Require brackets for all blocks
        eqeqeq: true, // Require === and !==
        latedef: true, // require all vars to be defined before being used
        newcap: true, // require classes to begin with a capital
        strict: true, // ES5 strict mode
        undef: true, // all vars must be defined
        unused: true, // warn for unused vars

        // Relaxing options
        boss: true, // Allow assignments in if, return etc
        evil: true, // eval() :)
        funcscope: true, // don't complain about using variables defined inside if statements

        // Environment
        browser: true,
        node: true,
        nonstandard: true,
        predef: ['DEBUG']
      },
      all: [
        // 'Gruntfile.js'
        // "public/src/js/**/*.js"
      ]
    },

    uglify: {
      options: {
        beautify: {
          ascii_only: true
        },
        compress: {
          global_defs: {
            DEBUG: false
          }
        },
        mangle: {
          eval: true
        },
        preserveComments: function (node, token) {
          return (/Built/).test(token.value)
        },
        report: false
      },
      build: {
        files: [
          {
            cwd: 'public/src/js/', // set working folder / root to copy
            src: '**/*.js',
            dest: 'build/src/js/', // destination folder
            expand: true // required when using cwd
          }
        ]
      },
      buildConcatenated: {
        files: {
          'build/dragnipur2.debug.js': ['concat/dragnipur2.debug.js'],
          'build/dragnipur2.min.js': ['concat/dragnipur2.min.js']
        }
      }
    },

    htmlmin: {
      all: {
        options: {
          removeComments: true,
          collapseWhitespace: true
        },
        files: [
          {
            expand: true, // Enable dynamic expansion.
            cwd: 'public', // Src matches are relative to this path.
            src: ['**/*.html'], // Actual pattern(s) to match.
            dest: 'build' // Destination path prefix.
          }
        ]
      }
    },

    generateSW: {
      build: {
        swDest: 'build/worker.js',
        globDirectory: 'build',
        globPatterns: ['**/*.{json}'],
        cacheId: 'dragnipur',
        cleanupOutdatedCaches: true,
        mode: process.env.NODE_ENV || 'production',
        runtimeCaching: [
          {
            // Match any request that ends with .png, .jpg, .jpeg or .svg.
            urlPattern: /\.(?:png|jpg|jpeg|svg)$/,
            // Apply a cache-first strategy.
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 10
              }
            }
          },
          {
            // Match any request that ends with .woff, .otf, .ttf.
            urlPattern: /\.(?:woff|otf|ttf)$/,
            // Apply a network-first strategy.
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fonts',
              expiration: {
                maxEntries: 10
              }
            }
          },
          {
            // Match any request that ends with .js or, .css.
            urlPattern: /\.(?:js|css)$/,
            // Apply a network-first strategy.
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-css',
              expiration: {
                maxEntries: 15
              }
            }
          }
        ]
      }
    },

    copy: {
      vendor: {
        files: [
          {
            cwd: 'public/vendor', // set working folder / root to copy
            src: '**/*.min.*', // copy all files and subfolders
            dest: 'build/vendor', // destination folder
            expand: true // required when using cwd
          }
        ]
      },
      images: {
        files: [
          {
            cwd: 'public/images', // set working folder / root to copy
            src: '**/*', // copy all files and subfolders
            dest: 'build/images', // destination folder
            expand: true // required when using cwd
          }
        ]
      },
      fonts: {
        files: [
          {
            cwd: 'public/fonts', // set working folder / root to copy
            src: '**/*', // copy all files and subfolders
            dest: 'build/fonts', // destination folder
            expand: true // required when using cwd
          }
        ]
      },
      assets: {
        files: [
          {
            cwd: 'public/assets', // set working folder / root to copy
            src: '**/*', // copy all files and subfolders
            dest: 'build/assets', // destination folder
            expand: true // required when using cwd
          }
        ]
      }
    },

    imagemin: {
      options: {
        optimizationLevel: 3,
        progressive: true,
        interlaced: true
      },
      all: {
        files: [{
          expand: true,
          cwd: 'build/images',
          src: ['**/*.{png,jpg,gif}'],
          dest: 'build/images'
        }]
      }
    },

    usebanner: {
      css: {
        options: {
          position: 'top',
          banner: grunt.file.read('public/src/header.txt'),
          linebreak: true
        },
        files: {
          src: ['build/**/*.css']
        }
      },
      html: {
        options: {
          position: 'top',
          banner: grunt.file.read('public/src/html-header.txt'),
          linebreak: true
        },
        files: {
          src: ['build/**/*.html']
        }
      },
      js: {
        options: {
          position: 'top',
          banner: grunt.file.read('public/src/header.txt'),
          linebreak: true
        },
        files: {
          src: ['build/**/*.js']
        }
      }
    }
  })

  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-cssmin')
  grunt.loadNpmTasks('grunt-contrib-jshint')
  grunt.loadNpmTasks('grunt-contrib-uglify-es')
  grunt.loadNpmTasks('grunt-contrib-htmlmin')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-imagemin')
  grunt.loadNpmTasks('grunt-workbox')
  grunt.loadNpmTasks('grunt-banner')

  grunt.registerTask('default', ['kyi'])

  grunt.registerTask(
    'kyi',
    ['concat', 'jshint', 'cssmin',
      'uglify', 'htmlmin', 'copy',
      'imagemin', 'generateSW', 'usebanner'])
}

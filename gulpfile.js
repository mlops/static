var gulp = require('gulp');
// Requires the gulp-sass plugin
var sass = require('gulp-sass');
var watch = require('gulp-watch');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var browserSync = require('browser-sync');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var spritesmith = require('gulp.spritesmith');
var gulpIf = require('gulp-if');
var nunjucksRender = require('gulp-nunjucks-render');
var data = require('gulp-data');
var del = require('del');
var fs = require('fs');
var gutil = require('gulp-util');
var runSequence = require('run-sequence');

//JS testing
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var scssLint = require('gulp-scss-lint');
var Server = require('karma').Server;

//optimazation 
var concat = require('gulp-concat');
var useref = require('gulp-useref');
// optimazation JavaScript
var uglify = require('gulp-uglify');
var debug = require('gulp-debug-streams');
var cached = require('gulp-cached');
//optimazation css
var unCss = require('gulp-uncss');
var cleanCSS = require('gulp-clean-css');
var cssnano = require('gulp-cssnano');
var imagemin = require('gulp-imagemin');
var cache = require('gulp-cache');
var newer = require('gulp-newer');
//Cache Busting
var rev = require('gulp-rev')
var revReplace = require('gulp-rev-replace')


// ===========
// INTRO PHASE
// ===========

// Hello task
gulp.task('hello', function() {
  console.log('Hello Zell');
});


// =================
// DEVELOPMENT PHASE
// =================

// // Custom Plumber function for catching errors

// function customPlumber(errTitle) {
// 	return plumber({
// 		errorHandler: notify.onError({
// 			// Customizing error title
// 			title: errTitle || "Error running Gulp",
// 			message: "Error: <%= error.message %>",
// 			sound: "Glass"
// 		})
// 	});
// }

// Custom Plumber function for catching errors
function customPlumber(errTitle) {
	if (process.env.CI) {
		return plumber({
			errorHandler: function(err) {
				// Changes first line of error into red
				throw Error(gutil.colors.red(err.message));
			}
		});
	} else {
		return plumber({
			errorHandler: notify.onError({
				// Customizing error title
				title: errTitle || 'Error running Gulp',
				message: 'Error: <%= error.message %>',
			})
		});
	}

// Clean
gulp.task('clean:dev', function() {
  return del.sync([
    'app/css',
    'app/*.html'
  ]);
});

// Browser Sync
gulp.task('browserSync', function() {
  browserSync({
    server: {
      baseDir: 'app'
    },
  });
});


// Compiles Sass to CSS
gulp.task('sass', function() {
	return gulp.src('app/scss/**/*.scss')
		.pipe(customPlumber('Error Running Sass'))
		.pipe(sourcemaps.init())
		.pipe(sass({
			// includes bower_components as a import location
			includePaths: [
				'app/bower_components',
				'node_modules'
			]
		}))
		.pipe(autoprefixer({
			browsers: ['ie 8-9', 'last 2 versions']
		}))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('app/css'))
		.pipe(browserSync.reload({
			stream: true
		}))
})

// Sprites
gulp.task('sprites', function() {
	gulp.src('app/images/sprites/**/*')

	.pipe(spritesmith({
			cssName: '_sprites.scss',
			imgName: 'sprites.png',
			imgPath: '../images/sprites.png',
			retinaSrcFilter: 'app/images/sprites/*@2x.png',
			retinaImgName: 'sprites@2x.png',
			retinaImgPath: '../images/sprites@2x.png'
		}))
		.pipe(gulpIf('*.png', gulp.dest('app/images')))
		.pipe(gulpIf('*.scss', gulp.dest('app/scss')));
});


// Watch files for changes
gulp.task('watch', function() {
	gulp.watch('app/scss/**/*.scss', ['sass', 'lint:scss']);
	// Watch JavaScript files and warn us of errors
	gulp.watch('app/js/**/*.js',['watch-js']);
	gulp.watch([
		'app/pages/**/*.+(html|nunjucks|njk)',
		'app/templates/**/*',
		'app/data.json'
	], ['nunjucks']);
});

gulp.task('watch-js', ['lint:js'], browserSync.reload);

// Templating
gulp.task('nunjucks', function() {
	nunjucksRender.nunjucks.configure(['app/templates/'], {
    watch: false
  });
	// Gets .html and .nunjucks files in pages
	return gulp.src('app/pages/**/*.+(html|nunjucks|njk)')
		// Adding data to Nunjucks
		// .pipe(data(function() {
		// return require('./app/data.json')
		// }))
		.pipe(customPlumber('Error Running Nunjucks'))
		.pipe(data(function() {
			return JSON.parse(fs.readFileSync('./app/data.json'))
		}))
		// Renders template with nunjucks
		.pipe(nunjucksRender({
			path: ['app/templates']
		}))
		// output files in app folder
		.pipe(gulp.dest('app'))
		// browserSync watch nunjucks
		.pipe(browserSync.reload({
			stream: true
		}));
});

// Consolidated dev phase task
gulp.task('default', function(callback) {
	runSequence(
		'clean:dev', ['sprites', 'lint:js', 'lint:scss'], ['sass', 'nunjucks'], ['browserSync', 'watch'],
		callback
	);
});


// =============
// TESTING PHASE
// =============
// Linting JavaScript
gulp.task('lint:js', function() {
	return gulp.src('app/js/**/*.js')
		// Catching errors with customPlumber
		.pipe(customPlumber('JSHint Error'))
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))
		// Catching all JSHint errors
		.pipe(jshint.reporter('fail', {
			ignoreWarning: true,
			ignoreInfo: true
		}))
		.pipe(jscs({
			fix: true,
			configPath: '.jscsrc'
		}))
		// removed JSCS reporter
		.pipe(gulp.dest('app/js'))

});

// Linting Scss
gulp.task('lint:scss', function() {
	return gulp.src('app/scss/**/*.scss')
		// Linting files with SCSSLint
		.pipe(scssLint({
			// Pointing to config file
			config: '.scss-lint.yml'
		}));
})


// Test
gulp.task('test', function(done) {
  new Server({
    configFile: process.cwd() + '/karma.conf.js',
    singleRun: true
  }, done).start();
});



// =================
// INTEGRATION PHASE CI not works
// =================
// creating a new task that is exactly the same as
// default , except that it doesn’t contain the browserSync or watch tasks.
// gulp.task('dev-ci', function(callback) {
//   runSequence(
//     'clean:dev', ['sprites', 'lint:js', 'lint:scss'], ['sass', 'nunjucks'],
//     callback
//   );
// })
	gulp.task('dev-ci', function(callback) {
		runSequence(
			'clean:dev', ['sprites', 'lint:js', 'lint:scss'], ['sass', 'nunjucks'],
			callback
		);
	})

// ==================
// OPTIMIZATION PHASE
// ==================
// JavaScript and CSS
// gulp.task('useref', function() {
// 	return gulp.src('app/*.html')
// 	.pipe(useref())
// 	.pipe(cached('useref'))
// 	.pipe(gulpIf('*.js', uglify()))
// 	// Adds unCss
// 	.pipe(gulpIf('*.css', unCss({
// 	html: ['app/*.html'],
// 	ignore: [
// 	'.susy-test',
// 	/.is-/,
// 	/.has-/
// 	]
// 	})))
// 	// Adds cssnano
// 	.pipe(gulpIf('*.css', cssnano()))
// 	// Adding rev
// 	.pipe(gulpIf('*.js', rev()))
// 	.pipe(gulpIf('*.css', rev()))
// 	.pipe(revReplace())
// 	.pipe(gulp.dest('dist'));
// });


gulp.task('useref', function() {

  return gulp.src('app/*.html')
    .pipe(useref())
    .pipe(cached('useref'))
	    .pipe(gulpIf('*.js', uglify()))
	    .pipe(gulpIf('*.css', unCss({
	      html: ['app/*.html'],
	      ignore: [
	        '.susy-test',
	        /.is-/,
	        /.has-/
	      ]
	    })))
    .pipe(gulpIf('*.css', cssnano()))
	    // Adding rev
	.pipe(gulpIf('*.js', rev()))
	.pipe(gulpIf('*.css', rev()))
	.pipe(revReplace())
	.pipe(gulp.dest('dist'));
});



// 1 - Images (With Gulp-caches) + preciso
gulp.task('images', function() {
  return gulp.src('app/images/**/*.+(png|jpg|jpeg|gif|svg)')
    .pipe(cache(imagemin(), {
      name: 'project'
    }))
    .pipe(gulp.dest('dist/images'))
})

// Clearing caches ao usao o metodo 1 acima é necessario limpar cache
gulp.task('cache:clear', function(callback) {
  return cache.clearAll(callback);
})

// 2 - Images (With Gulp Newer)
// gulp.task('images', function() {
// 	//C:\Users\ANDRE\AppData\Local\Temp\
// 	return gulp.src('app/images/**/*.+(png|jpg|jpeg|gif|svg)')
// 		.pipe(newer('dist/images'))
// 		.pipe(imagemin())
// 		.pipe(gulp.dest('dist/images'))
// })


// Copying fonts
gulp.task('fonts', function() {
  return gulp.src('app/fonts/**/*')
    .pipe(gulp.dest('dist/fonts'))
});

// 1 - Cleaning (With gulp-cache)
gulp.task('clean:dist', function() {
  return del.sync(['dist']);
})

// 2 - Cleaning (with gulp-newer)
// gulp.task('clean:dist', function(callback) {
// 	return del.sync(['dist/**/*',
// 		'!dist/images',
// 		// Excluding images from glob
// 		'!dist/images/**/*']);
// })
// 

gulp.task('build', function(callback) {
  runSequence(
    ['clean:dev', 'clean:dist'], ['sprites', 'lint:js', 'lint:scss'], ['sass', 'nunjucks'], ['useref', 'images', 'fonts', 'test'],
    callback
  );
})


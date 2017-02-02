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
var runSequence = require('run-sequence');

//JS
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');

var scssLint = require('gulp-scss-lint');
var Server = require('karma').Server;


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

// Custom Plumber function for catching errors

function customPlumber(errTitle) {
	return plumber({
		errorHandler: notify.onError({
			// Customizing error title
			title: errTitle || "Error running Gulp",
			message: "Error: <%= error.message %>"
		})
	});
}



// Browser Sync

gulp.task('browserSync', function() {
	browserSync({
		server: {
			baseDir: 'app'
		},
	})
})


gulp.task('test', function(done) {
	new Server({
		configFile: process.cwd() + '/karma.conf.js',
		singleRun: true
	}, done).start();
});
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



// Templating
gulp.task('nunjucks', function() {
	nunjucksRender.nunjucks.configure(['app/templates/']);
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


// CLEAN gulp clean
gulp.task('clean:dev', function() {
	return del.sync([
		'app/css',
		'app/*.html'
	]);
});

// #################################################

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


gulp.task('lint:scss', function() {
	return gulp.src('app/scss/**/*.scss')
		// Linting files with SCSSLint
		.pipe(scssLint({
	// Pointing to config file
	config: '.scss-lint.yml'
	}));
})



	// Watchers files for changes
gulp.task('watch', function() {
	gulp.watch('app/scss/**/*.scss', ['sass','lint:scss']);
	// Other watchers
	// Reloads the browser when a JS file is saved
	gulp.watch('app/js/**/*.js', browserSync.reload);
	// Reloads the browser when a HTML file is saved
	gulp.watch('app/*.html', browserSync.reload);

	// Watch JavaScript files and warn us of errors
	gulp.watch('app/js/**/*.js', ['lint:js']);
	gulp.watch('app/js/**/*.js', browserSync.reload);
	gulp.watch([
		'app/pages/**/*.+(html|nunjucks)',
		'app/templates/**/*',
		'app/data.json'
	], ['nunjucks']);
})


// Consolidated dev phase task
gulp.task('default', function(callback) {
	runSequence(
		'clean:dev', ['sprites', 'lint:js','lint:scss'],
		 ['sass', 'nunjucks'], 
		 ['browserSync', 'watch'],
		callback
	);
});
var gulp          = require('gulp');
var sass          = require('gulp-sass');
var autoprefixer  = require('gulp-autoprefixer');
var livereload    = require('gulp-livereload');
var del           = require('del');

const STYLES_DIRECTORY = './src/www/styles/';
const BUILD_DIRECTORY = './src/www/build';
const VIEW_DIRECTORY = './src/www/views/';

const LIVERELOAD_PORT = process.env.BORISBOT_GULP_LIVERELOAD_PORT || 35729;

// # Tasks

// Clean build folder
gulp.task('cleanBuild', function (callback) {
  return del([BUILD_DIRECTORY + '**/*'], callback);
});

// .SCSS -> .CSS
gulp.task('buildCss', function() {
    return gulp.src(STYLES_DIRECTORY + 'main.scss')
        .pipe(sass({ errLogToConsole: true }))
        .pipe(autoprefixer())
        .pipe(gulp.dest(BUILD_DIRECTORY))
        .pipe(livereload());
});

// Reload page
gulp.task('refresh', function() {
    livereload.changed('*.jade');
});

// Keep watching styles and templates
gulp.task('watch', ['buildCss'], function() {
  livereload.listen({port: LIVERELOAD_PORT});
  gulp.watch(STYLES_DIRECTORY + '**/*.scss', ['buildCss']);
  gulp.watch(VIEW_DIRECTORY + '**/*.jade', ['refresh']);
});


gulp.task('build', ['cleanBuild', 'buildCss']);

gulp.task('default', ['cleanBuild', 'watch']);

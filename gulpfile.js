var gulp        = require('gulp');
    gutil       = require('gulp-util')
    coffee      = require('gulp-coffee');
    watch       = require('gulp-watch');
    merge       = require('merge-stream');
    coffeelint  = require('gulp-coffeelint');
    plumber     = require('gulp-plumber');
    map         = require('map-stream');
    concat      = require('gulp-concat');
    uglify      = require('gulp-uglify');
    scss        = require('gulp-sass');
    runSeq      = require('run-sequence');
    chmod       = require('gulp-chmod');
    fs          = require('fs');
    del         = require('del');
    sourcemaps  = require('gulp-sourcemaps');
    glob        = require('glob');
    runSequence = require('run-sequence');

var onError = function (err) {
  gutil.beep();
  gutil.log(err);
};


gulp.task("clean", function(cb) {
  del(['lib'], cb);
});

gulp.task('compile_src', function() {
  return merge(
          gulp.src('./src/**/*.coffee')
          .pipe(plumber({errorHandler: onError}))
          .pipe(coffeelint())
          .pipe(coffeelint.reporter())
          .pipe(sourcemaps.init())
          .pipe(coffee({bare: true}))
          .pipe(sourcemaps.write())
          .pipe(gulp.dest('./')),
          gulp.src(['./src/**/*', '!./src/**/*.coffee'])
          .pipe(plumber({errorHandler: onError}))
          .pipe(gulp.dest('./')))
});

gulp.task('compile', function(callback) {
  runSequence('clean',
              ['compile_src'],
              callback);
});

gulp.task("watch", function() {
  watch(glob.sync('src/**/*.coffee'), function(files, cb) {
    gulp.start('compile_src', cb);
  });
});


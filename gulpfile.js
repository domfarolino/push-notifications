var gulp = require('gulp'),
    babel = require('gulp-babel'),
    plumber = require('gulp-plumber'),
    es6Path = 'src/js/*.js',
    compilePath = 'dist/js',
    browserSync = require('browser-sync').create(),
    ghPages = require('gulp-gh-pages');
 
gulp.task('deploy', function() {
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});

gulp.task('build', function () {
  gulp.src(['src/**', '!src/js/**']).pipe(gulp.dest('dist/'));
});

gulp.task('babel', function () {
  gulp.src([es6Path])
    .pipe(plumber())
    .pipe(babel())
    .pipe(gulp.dest(compilePath));
});

gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: 'src'
    },
  })
});

gulp.task('watch', ['browserSync', 'build', 'babel'], function() {
  gulp.watch('dist/**', browserSync.reload);
  gulp.watch([es6Path], ['babel']);
});
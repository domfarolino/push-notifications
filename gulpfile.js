const gulp = require('gulp'),
    browserSync = require('browser-sync').create(),
    ghPages = require('gulp-gh-pages');

gulp.task('deploy', function() {
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});

gulp.task('build', function () {
  gulp.src(['src/**', '!src/js/**']).pipe(gulp.dest('dist/'));
});

gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: 'src'
    },
  })
});

gulp.task('watch', ['browserSync', 'build'], function() {
  gulp.watch('dist/**', browserSync.reload);
  gulp.watch('src/**', ['build']);
});

gulp.task('default', ['watch']);

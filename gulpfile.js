var gulp = require('gulp');

var browserSync = require('browser-sync').create();
var ghPages = require('gulp-gh-pages');
 
gulp.task('deploy', function() {
  return gulp.src('./src/**/*')
    .pipe(ghPages());
});

gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: 'src'
    },
  })
})

gulp.task('watch', ['browserSync'], function() {
  gulp.watch('src/**', browserSync.reload);
})
var gulp = require('gulp');

var browserSync = require('browser-sync').create();

gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: 'src'
    },
  })
})

gulp.task('testReload', function() {
  console.log("HTML Task Run");
  return gulp.src('src/**')
    .pipe(browserSync.reload({
      stream: true
    }))
});

gulp.task('watch', ['browserSync'], function() {
  gulp.watch('./src/**', ['testReload']);
})
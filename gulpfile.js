var gulp = require('gulp');

var browserSync = require('browser-sync').create();

gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: 'app'
    },
  })
})

// gulp.task('html', function() {
//   console.log("HTML Task Run");
// });

gulp.task('watch', function() {
  gulp.watch('app/*', ['browserSync']);
})
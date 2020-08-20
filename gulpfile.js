let gulp = require('gulp'),
  uglify = require('gulp-uglify'),
  cssmin = require('gulp-clean-css'),
  imagemin = require('gulp-imagemin'),
  htmlmin = require('gulp-htmlmin'),
  htmlclean = require('gulp-htmlclean');
concat = require('gulp-concat');

gulp.task('uglify', function() {
  return gulp
    .src(['./public/js/**/.js', '!./public/js/**/*min.js']) //只是排除min.js文件还是不严谨，一般不会有问题，根据自己博客的修改我的修改为return gulp.src(['./public/**/*.js','!./public/zuoxi/**/*.js',,'!./public/radio/**/*.js'])
    .pipe(uglify())
    .pipe(gulp.dest('./public/js')); //对应修改为./public即可
});
// 合并 JS
gulp.task('jsall', function() {
  return (
    gulp
      .src('./public/**/*.js')
      // 压缩后重命名
      .pipe(concat('app.js'))
      .pipe(gulp.dest('./public'))
  );
});

//CSS压缩
gulp.task('cssmin', function() {
  return gulp
    .src(['./public/css/**/*.css', '!./public/css/**/*min.css'])
    .pipe(cssmin())
    .pipe(gulp.dest('./public/css/'));
});
//图片压缩
gulp.task('minify-img-aggressive', function() {
    return gulp.src('./public/img/**/*.*')
        .pipe(imagemin(
        [imagemin.gifsicle({'optimizationLevel': 3}),
        imagemin.jpegtran({'progressive': true}),
        imagemin.optipng({'optimizationLevel': 7}),
        imagemin.svgo()],
        {'verbose': true}))
        .pipe(gulp.dest('./public/img'))
});
// 压缩 public 目录 html文件 public/**/*.hmtl 表示public下所有文件夹中html，包括当前目录
gulp.task('minify-html', function() {
  return gulp
    .src('./public/**/*.html')
    .pipe(htmlclean())
    .pipe(
      htmlmin({
        removeComments: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      })
    )
    .pipe(gulp.dest('./public'));
});

gulp.task('build', [
  // 'uglify',
  // 'cssmin',
  // 'minify-img-aggressive',
  // 'minify-html'
]);

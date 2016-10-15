'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const DIST = 'dist/';

gulp.task('build', function () {
    return gulp
        .src('src/**/*.js')
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(DIST));
});

gulp.task('default', ['build']);

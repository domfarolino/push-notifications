'use strict';

require('dotenv').config();

const path = require('path');
const logger = require('morgan');
const express = require('express');

const routes = require('./routes/index');
const app = express();

// View engine setup

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

console.log('Creating server');
require('http').createServer(app).listen(process.env.PORT, _ => {});

// Error handler

// Development error handler
// Will print stacktrace
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: err
  });
});

module.exports = app;

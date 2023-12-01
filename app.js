'use strict';

require('dotenv').config();

const path = require('path');
const logger = require('morgan');
const express = require('express');

const routes = require('./routes/index');
const app = express();

app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

console.log('Creating server on port', process.env.PORT);
require('http').createServer(app).listen(process.env.PORT, _ => {});

// Catch 404 and forward to error handler.
app.use((request, response, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});
app.use((err, request, response, next) => {
  response.status(err.status || 500);
  response.send(`${err.status} Error: ${err.message}`);
});

module.exports = app;

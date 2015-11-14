var sqlite3 = require('sqlite3');
var path = require('path');
var dbName = path.resolve(__dirname + '/../database/test.db');

function getDatabaseName() {
  return path.resolve(__dirname + '/../database/test.db');
};

function findAllCreate(options) {
  var sql = options.sql;
  var dbName = getDatabaseName();
  var db = new sqlite3.Database(dbName);
  var stmt = db.prepare(sql.text); 
  return function (callback) {
    stmt.all(sql.values, function (err, rows) {
      stmt.finalize();
      db.close();
      callback(err, rows);
    });
  };
}

function findCreate(options) {
  var sql = options.sql;
  var dbName = getDatabaseName();
  var db = new sqlite3.Database(dbName);
  var stmt = db.prepare(sql.text);
  return function (callback) {
    stmt.get(sql.values, function (err, row) {
      stmt.finalize();
      db.close();
      callback(err, row);
    });
  };
}

function insertCreate(options) {
  var sql = options.sql;
  var dbName = getDatabaseName();
  var db = new sqlite3.Database(dbName);
  var stmt = db.prepare(sql.text);
  return function (callback) {
    stmt.run(sql.values, function (err) {
      stmt.finalize();
      db.close();
      callback(err, this.lastID);
    });
  };
}

function updateCreate(options) {
  var sql = options.sql;
  var dbName = getDatabaseName();
  var db = new sqlite3.Database(dbName);
  var stmt = db.prepare(sql.text);
  return function (callback) {
    stmt.run(sql.values, function(err) {
      stmt.finalize();
      db.close();
      callback(err);
    });
  };
}

function deleteCreate(options) {
  var sql = options.sql;
  var dbName = getDatabaseName();
  var db = new sqlite3.Database(dbName);
  var stmt = db.prepare(sql.text);
  return function (callback) {
    stmt.run(sql.values, function (err) {
      stmt.finalize();
      db.close();
      callback(err);
    });
  };
}

module.exports = {
  findAllCreate: findAllCreate,
  findCreate: findCreate,
  insertCreate: insertCreate,
  updateCreate: updateCreate,
  deleteCreate: deleteCreate
}
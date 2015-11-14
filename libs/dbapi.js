/**
 * Sqlite binding
 * @module libs/dbapi
 */

var sqlite3 = require('sqlite3');
var path = require('path');

var dbName = path.resolve(__dirname + '/../database/test.db');

function unfoldFields(fields) {
	var len = fields.length;
	var str = fields[0];
	var i;
	for (i = 1; i < len; i++) {
		str = str + ', ' + fields[i];
	}
	return str;
}

function unfoldQM(fields) {
	var len = fields.length;
	var str = '?';
	var i;
	for (i = 1; i < len; i++) {
		str = str + ', ' + '?';
	}
	return str;
}

function unfoldPairs2(fields) {
	var len = fields.length;
	var str = fields[0] + ' = ? ';
	var i;
	for (i = 1; i < len ; i++) {
		str = str + ', ' + fields[i] + ' = ? ';
	}
	return str;
}

function selectCreate(table, fields, where) {
	var sql = 'SELECT ' + unfoldFields(fields);
	if (table !== '') {
		sql = sql + " FROM " + table;
	}
	if (where !== '') {
		sql = sql + " WHERE " + where;
	}
	return sql;
}

function insertCreate2(table, fields) {
	var sql = 'INSERT INTO ' + table + ' (' + unfoldFields(fields) + ') VALUES (' + unfoldQM(fields) + ')';
	return sql;
}

function updateCreate2(table, fields, where) {
	var sql = 'UPDATE ' + table + ' SET ' + unfoldPairs2(fields);
	if (where !== '') {
		sql = sql + " WHERE " + where;
	}
	return sql;
}

function deleteCreate(table, where) {
	var sql = 'DELETE FROM ' + table;
	if (where !== '') {
		sql = sql + ' WHERE ' + where;
	} 
	return sql;
}

/*function begin(callback) {
	var db = new sqlite3.Database(dbName);
	var sql = 'BEGIN TRANSACTION';
	console.log(sql);
	db.exec(sql,
		function (err) {
			if (err) {
				callback(err);
			} else {
				callback(null, db);
			}
		}
	);
}

function rollback(db, callback) {
	var sql = 'ROLLBACK';
	console.log(sql);
	db.exec(sql, callback);
}

function commit(db, callback) {
	var sql = 'COMMIT';
	console.log(sql);
	db.exec(sql, callback);
}

function findOne(db, table, fields, where, callback) {
	var sql = selectCreate(table, fields, where);
	console.log(sql);
	db.get(sql, 
		function (err, row) {
			if (err) {
				callback(err);
			} else if (typeof row === 'undefined') {
				callback(null, null);
			} else {
				callback(null, row);
			}
		}
	);
}

function findAll(db, table, fields, where, callback) {
	var sql = selectCreate(table, fields, where);
	console.log(sql);
	db.all(sql, callback);
}

function insert(db, table, fields, values, callback) {
	var sql = insertCreate(table, fields, values);
	console.log(sql);
	db.exec(sql, callback);
}

function update(db, table, fields, values, where, callback) {
	var sql = updateCreate(table, fields, values);
	console.log(sql);
	db.exec(sql, callback);
}

function remove(db, table, where, callback) {
	var sql = deleteCreate(table, where);
	console.log(sql);
	db.exec(sql, callback);
}*/

var getDatabaseName = function() {
	return path.resolve(__dirname + '/../database/test.db');
};

var getData = function (fields, table, where, callback) {
	var dbName = getDatabaseName();
	var db = new sqlite3.Database(dbName);
	var sql = "SELECT " + fields + " FROM " + table;
	if (where != '') {
		sql = sql + " WHERE " + where;
	}
	//console.log(sql);
	db.all(sql, function(err, rows){
		//console.log(err, rows);
		if (err) {
			callback(err);
		} else {
			callback(null, rows);
		}
		db.close();
	});
};

var putData = function (sql, callback) {
	var dbName = getDatabaseName();
	var db = new sqlite3.Database(dbName);
	//console.log(sql);
	db.exec(sql, function(err) {
		//console.log(err);
		if (err) {
			callback(err);
		} else {
			callback(null);
		}
		db.close();
	});
};

var gOne = function (fields, table, where, params, callback) {
	var dbName = getDatabaseName();
	var db = new sqlite3.Database(dbName);
	var sql = selectCreate(table, fields, where);
	//console.log(sql, ' ', params);
	var stmt = db.prepare(sql);
	stmt.get(params, function(err, row){
		//console.log(err, row);
		if (err) {
			callback(err);
		} else {
			callback(null, row);
		}
		stmt.finalize();
		db.close();
	});
};

var gAll = function (fields, table, where, params, callback) {
	var dbName = getDatabaseName();
	var db = new sqlite3.Database(dbName);
	var sql = selectCreate(table, fields, where);
	//console.log(sql, ' ', params);
	var stmt = db.prepare(sql);
	stmt.all(params, function(err, rows){
		//console.log(err, rows);
		if (err) {
			callback(err);
		} else {
			callback(null, rows);
		}
		stmt.finalize();
		db.close();
	});
};

var pInsert = function (table, fields, params, callback) {
	var dbName = getDatabaseName();
	var db = new sqlite3.Database(dbName);
	var sql = insertCreate2(table, fields);
	//console.log(sql, ' ', params);
	var stmt = db.prepare(sql);
	stmt.run(params, function(err) {
		//console.log(err);
		if (err) {
			callback(err);
		} else {
			callback(null);
		}
		stmt.finalize();
		db.close();
	});
};

var pInsert2 = function (table, fields, params, callback) {
	var dbName = getDatabaseName();
	var db = new sqlite3.Database(dbName);
	var sql = insertCreate2(table, fields);
	//console.log(sql, ' ', params);
	var stmt = db.prepare(sql);
	stmt.run(params, function(err) {
		//console.log(err);
		if (err) {
			callback(err);
		} else {
			callback(null, this.lastID);
		}
		stmt.finalize();
		db.close();
	});
};

var pUpdate = function (table, fields, where, params, callback) {
	var dbName = getDatabaseName();
	var db = new sqlite3.Database(dbName);
	var sql = updateCreate2(table, fields, where);
	//console.log(sql, ' ', params);
	var stmt = db.prepare(sql);
	stmt.run(params, function(err) {
		//console.log(err);
		if (err) {
			callback(err);
		} else {
			callback(null);
		}
		stmt.finalize();
		db.close();
	});
};

var pRemove = function (table, where, params, callback) {
	var dbName = getDatabaseName();
	var db = new sqlite3.Database(dbName);
	var sql = deleteCreate(table, where);
	//console.log(sql, ' ', params);
	var stmt = db.prepare(sql);
	stmt.run(params, function(err) {
		//console.log(err);
		if (err) {
			callback(err);
		} else {
			callback(null);
		}
		stmt.finalize();
		db.close();
	});
};

module.exports = {
	getData: getData,
	putData: putData,
	gOne: gOne,
	gAll: gAll,
	pInsert: pInsert,
	pInsert2: pInsert2,
	pUpdate: pUpdate,
	pRemove: pRemove
	/*begin: begin,
	rollback: rollback,
	commit: commit,
	findOne: findOne,
	findAll: findAll,
	insert: insert,
	update: update,
	remove: remove*/
};
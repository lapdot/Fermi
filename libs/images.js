var dbapi = require ('./dbapi');
var helper = require('./helperapi');
var u = require('./utility');
var fs = require('fs');
var path = require('path');
var formidable = require('formidable');

function internalPath(name) {
  return './public/images/' + name;
};

function externalPath(name) {
  return '/images/' + name;
};

rename = function (id, fileName) {
  var i6;
  var stdName, extName, resName;
  i6 = fileName.indexOf('.', 0);
  if (i6 > 0) {
    stdName = fileName.slice(0, i6);
    extName = fileName.slice(i6);
    resName = stdName + '-' + id + extName;
  } else {
    resName = stdName + '-' + picNum;
  }
  return resName;
}

setIdByParams = function (req, res, next) {
  req.id = req.params.id;
  next();
};

getRowById = function (req, res, next) {
  dbapi.gOne(
    ['*'],
    'images',
    'images.id = ?',
    [req.id],
    function (err, row) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else if (!row) {
        req.errorHandle.notFound(req, res);
      } else {
        req.image = row;
        next();
      }
    }
  );
};

insertRow = function (req, res, next) {
  dbapi.pInsert2('images',
    ['file_name'],
    ['TMP'],
    function (err, row_id) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else {
        req.lastRowId = row_id;
        next();     
      }
    }
  );
}

setIdByLast = function (req, res, next) {
  req.id = req.lastRowId;
  next();
};

updateRowSelectedId = function (id, file_name) {
  return function (req, res, next){
    dbapi.pUpdate(
      'images',
      ['file_name'],
      'id = ?',
      [file_name, id],
      function (err) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else {
          next();
        }
      }
    );
  }
}

updateRowById = function (req, res, next) {
  dbapi.pUpdate(
    'images',
    ['file_name'],
    'id = ?',
    [req.image.fileName, req.id],
    function (err) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else {
        next();
      }
    }
  );
};

moveFile = function (req, res, next) {
  req.image.fileName = rename(req.id, req.image.fileName);
  req.passage.cover = req.id;
  fs.rename(req.image.tmpName, 'public/images/' + req.image.fileName, 
    function (err) {
      if (err) {
        res.errorHandle.file(req, res);
      } else {
        next();
      }
    }
  );
};

sendImage = function (req, res) {
  var name = path.join(__dirname, '..', internalPath(req.image.file_name));
  var options = {
    headers: {
      'Content-Type': 'image'
    }
  };
  res.sendFile(name, options);
};

module.exports = {
  rename : rename,
  setIdByParams: setIdByParams,
  setIdByLast: setIdByLast,
  getRowById: getRowById,
  insertRow: insertRow,
  updateRowSelectedId: updateRowSelectedId,
  updateRowById: updateRowById,
  moveFile: moveFile,
  sendImage: sendImage
};
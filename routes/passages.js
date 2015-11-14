var dbapi = require ('./../libs/dbapi');
var helper = require('./../libs/helperapi');
var u = require('./../libs/utility');
var images = require('./../libs/images')
var fs = require('fs');
var rimraf = require('rimraf');
var formidable = require('formidable');
var path = require('path');


var passagesRoot = '/passages/';

setIdByParams = function (req, res, next) {
  req.id = req.params.id;
  next();
};

getRowById = function (req, res, next) {
  dbapi.gOne(
    ['*'],
    'passages',
    'passages.id = ?',
    [req.id],
    function (err, row) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else if (!row) {
        req.errorHandle.notFound(req, res);
      } else {
        req.passage = row;
        next();
      }
    }
  );
};

readFile = function (req, res, next) {
  fs.readFile('./public/passages/' + req.id + '/context',
    function (err, data) {
      if (err) {
        req.errorHandle.file(req, res);
      } else {
        req.passage.context = data;
        next();
      }
    }
  );
};

dir = function (req, res, next) {
  req.dir = {};
  if (req.passage.dir === 'overview') {
    req.dir.overview = true;
  } else if (req.passage.dir === 'faculty') {
    req.dir.faculty = true;
  } else if (req.passage.dir === 'diy') {
    req.dir.diy = true;
  } else if (req.passage.dir === 'news') {
    req.dir.news = true;
  }
  next();
};

teacher = function (req, res, next) {
  if (req.isAuthenticated() && (req.user.groupname === 'teacher' )) {
    req.teacher = true;
  }
  next();
};

render = function (req, res) {
  res.render('passages', {account: req.user, passage: req.passage, dir:req.dir, teacher: req.teacher});
};

redirect = function (req, res) {
  res.redirect(303, '/passages/' + req.id);
};

collectBasic = function (req, res, next) {
  var form = new formidable.IncomingForm();
  form.uploadDir = path.join(__dirname, './../public/images');
  form.on('fileBegin', 
    function(name, file) {
      if (name === 'cover') {
        req.image = {};
        req.image.fileName = file.name;
        req.image.tmpName = file.path;
      }
    }
  );
  form.parse(req, 
    function (err, fields, files) {
      if (err) {
        res.errorHandle.other(req, res);
      } else {      
        req.passage = {};
        req.passage.title = fields.title;
        req.passage.description = fields.description;
        req.passage.dir = fields.dir;
        req.passage.alias = fields.alias;
        req.passage.context = fields.context;
        next();
      }
    }
  );
},

insertRow = function (req, res, next) {
  dbapi.pInsert2('passages',
    ['title', 'description', 'cover', 'dir', 'alias'],
    [req.passage.title, req.passage.description, req.passage.cover, req.passage.dir, req.passage.alias],
    function (err, row_id) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else {
        req.lastRowId = row_id;
        next();     
      }
    }
  );
};

setIdByLast = function (req, res, next) {
  req.id = req.lastRowId;
  next();
};

updateRowById = function (req, res, next) {
  dbapi.pUpdate(
    'passages',
    ['title', 'description', 'cover', 'dir', 'alias'],
    'id = ?',
    [req.passage.title, req.passage.description, req.passage.cover, req.passage.dir, req.passage.alias, req.id],
    function (err) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else {
        next();
      }
    }
  );
};

deleteRowById = function (req, res, next) {
  dbapi.pRemove(
    'passages',
    'passages.id = ?',
    [req.id],
    function (err) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else {
        next();
      }
    }
  );
};

mkDir = function (req, res, next) {
  fs.mkdir('./public' + passagesRoot + req.id, function (err) {
    if (err)
      req.errorHandle.file(req, res);
    else {
      next();
    }
  });
};

rmDir = function (req, res, next) {
  rimraf('./public' + passagesRoot + req.id, function (err) {
    if (err) {
      req.errorHandle.file(req, res);
    } else {
      next();
    }
  });
};

parseContext = function (req, res, next) {
  var context = req.passage.context;
  var index = 0;
  var i0, i1, i2, i3, i4, i5;
  var base64str, binarystr;
  var origName;
  function parse() {
    i0 = context.indexOf('<img', index);
    if (i0 < 0){
      end();
      return;
    }
    i1 = context.indexOf(' src="', i0) + 6;
    if (i1 < 0){
      end();
      return;
    }
    index = i1;
    i2 = context.indexOf(';base64,',i1) + 8 ;
    if (i2 >= 10 && i2-i1 <= 35) {
      i3 = context.indexOf('"',i2);
      base64str = context.slice(i2, i3);
      binarystr = new Buffer(base64str, "base64").toString("binary");
      i4 = context.indexOf('data-filename="', i0) + 15;
      i5 = context.indexOf('"', i4);
      origName = context.slice(i4, i5);    
      images.insertRow(req, res, DBUpdate);
    } else {
      parse();
    }
  }
  function DBUpdate() {
    origName = images.rename(req.lastRowId, origName); 
    context = context.slice(0, i1) + '/images/' + origName + context.slice(i3);
    images.updateRowSelectedId(req.lastRowId, origName)(req, res, fileWrite);
  }
  function fileWrite() {
    fs.writeFile('./public/images/' + origName, binarystr, {encoding: 'binary'},
      function (err){
        if (err) {
          req.errorHandle.file(req, res);
        } else {
          parse();
        }
      }
    );
  }
  function end(){
    req.passage.context = context;
    next();
  }
  parse();
};

writeFile = function (req, res, next) {
  fs.writeFile('./public/passages/' + req.id + '/context', req.passage.context,
    function (err) {
      if (err) {
        req.errorHandle.file(req, res);
      } else {
        next();
      }
    }
  );
};

getList = function (name) {
  return function (req, res, next) {
    dbapi.gAll(
      ['*'],
      'passages',
      'passages.dir = ?',
      [name],
      function (err, rows) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else {
          req.passages = rows;
          next();
        }
      }
    );
  }
};

renderList = function (name) {
  return function (req, res) {
    res.render(name + '-list', {account: req.user, passages: req.passages});
  }
};

getRowByParamsAlias =  function (req, res, next) {
  dbapi.gOne(
    ['*'],
    'passages',
    'passages.alias = ?',
    [req.params.alias],
    function (err, row) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else if (!row) {
        req.errorHandle.notFound(req, res);
      } else {
        req.passage = row;
        req.id = row.id;
        next();
      }
    }
  );
};

module.exports = function(app) {

  app.get('/passages', u.checkTeacher,
    function (req, res, next) {
      dbapi.gAll(
        ['*'],
        'passages',
        '',
        [],
        function (err, rows) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            req.passages = rows;
            next();
          }
        }
      );
    },
    function (req, res) {
      res.render('passages-list',{account: req.user, passages: req.passages});
    }    
  );

  app.get('/passages/:id',
    setIdByParams,
    getRowById,
    readFile,
    dir,
    teacher,
    render
  );

  app.get('/passages-add', u.checkTeacher,
    function (req, res) {
      res.render('passages-edit', {account: req.user, id: null, passage: null, dir: null});
    }
  );

  app.get('/passages-edit/:id', u.checkTeacher,
    setIdByParams,
    getRowById,
    readFile,
    dir,
    function (req, res) {
      res.render('passages-edit', {account: req.user, id: req.params.id, passage: req.passage, dir:req.dir});
    }
  );

  app.post('/passages', u.checkTeacher,
    collectBasic,
    images.insertRow,
    images.setIdByLast,
    images.moveFile,
    images.updateRowById,
    insertRow,
    setIdByLast,
    mkDir, 
    parseContext,
    writeFile,
    redirect
  );

  app.post('/passages/:id', u.checkTeacher,
    collectBasic,
    images.insertRow,
    images.setIdByLast,
    images.moveFile,
    images.updateRowById,
    setIdByParams,
    rmDir, 
    updateRowById,
    mkDir,
    parseContext,
    writeFile,    
    redirect
  );

  /*app.delete('/passages/:id', u.checkTeacher,
    setIdByParams,
    getRowById,
    rmDir,
    deleteRowById,
    function (req, res) {
      res.redirect(303, '/passages-add');
    }
  );*/

  app.get('/overview',
    getList('overview'),
    renderList('overview')
  );

  app.get('/faculty',
    getList('faculty'),
    renderList('faculty')
  );

  app.get('/diy',
    getList('diy'),
    renderList('diy')
  );

  app.get('/news',
    getList('news'),
    renderList('news')
  );

  app.get('/overview/:alias',
    getRowByParamsAlias,
    readFile,
    dir,
    teacher,
    render
  );

  app.get('/faculty/:alias',
    getRowByParamsAlias,
    readFile,
    dir,
    teacher,
    render
  );

  app.get('/diy/:alias',
    getRowByParamsAlias,
    readFile,
    dir,
    teacher,
    render
  );

  app.get('/news/:alias',
    getRowByParamsAlias,
    readFile,
    dir,
    teacher,
    render
  );

};
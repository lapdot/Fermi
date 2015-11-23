var squel = require('squel');
var path = require('path');
var fs = require('fs');
var async = require('async');
var multiparty = require('multiparty');
var rimraf = require('rimraf');
var dbapi2 = require('./../libs/dbapi2');
var u = require('./../libs/utility');

var uploadDir = path.join(__dirname,'../tmp');
var passagesDir = path.join(__dirname,'../public/passages');

function getList(req) {
  return function (rows, callback) {
    req.passages = {};
    var len = rows.length;
    var i;
    for (i=0; i<len; i++) {
      req.passages[i] = {};
      req.passages[i].id = rows[i].id;
      req.passages[i].title = rows[i].title;
      req.passages[i].description = rows[i].description;
      req.passages[i].coverName = rows[i].cover_name;
      req.passages[i].dir = rows[i].dir;
      req.passages[i].alias = rows[i].alias;
    }
    callback(null);
  }
}

function getSingle(req) {
  return async.seq(
    function (row, callback) {
      if (!row) {
        callback(new Error("notFound"));
      } else {
        req.passage = {};
        req.passage.id = row.id;
        req.passage.title = row.title;
        req.passage.description = row.description;
        req.passage.coverName = row.cover_name;
        req.passage.dir = row.dir;
        req.passage.alias = row.alias;
        callback(null);
      }
    },
    function (callback) {
      fs.readFile(path.join(passagesDir, '' + req.passage.id, 'context'), callback);
    },
    function (data, callback) {
      req.passage.context = data;
      req.dir = {};
      if (req.passage.dir === 'overview') {
        req.dir.overview = true;
      } else if (req.passage.dir === 'faculty') {
        req.dir.faculty = true;
      } else if (req.passage.dir === 'diy') {
        req.dir.diy = true;
      } else if (req.passage.dir === 'activities') {
        req.dir.activities = true;
      } else if (req.passage.dir === 'notes') {
        req.dir.notes = true;
      } else if (req.passage.dir === 'QA') {
        req.dir.QA = true;
      } else if (req.passage.dir === 'news') {
        req.dir.news = true;
      }
      callback(null);
    }
  );
}

function queryByAlias(dir, alias) {
  return dbapi2.findCreate({
    sql: squel.select().from("passages")
      .where("dir = ?", dir)
      .where("alias = ?", alias)
      .toParam()
  });
}

function queryById(id) {
  return dbapi2.findCreate({
    sql: squel.select().from("passages").where("id = ?", id).toParam()
  }); 
}

function collectInfo(req) {
  return function (callback) {
    var passage = {};
    var form =  new multiparty.Form({
      autoFiles: true,
      uploadDir: uploadDir
    });
    form.parse(req, function (err, fields, files) {
      if (err) {
        callback(err);
      } else {
        passage.title = fields.title[0];
        passage.description = fields.description[0];
        passage.context = fields.context[0];
        passage.dir = fields.dir[0];
        passage.alias = fields.alias[0];
        passage.cover = files.cover[0];
        req.newpassage = passage;
        callback(null);
      }
    });
  }
}

function moveCover (req) {
  return function (id, coverName) {
    return function (callback) {
      if (req.newpassage.cover.size === 0) {
        fs.unlink(req.newpassage.cover.path, callback)
      } else {
        fs.rename(req.newpassage.cover.path, path.join(passagesDir, '' + id, coverName), callback);
      }
    }
  }
}

function done(next) {
  return function (err) {
    if (err) {
      next(err);
    } else {
      next();
    }
  }
}

module.exports = function(app) {
  app.get('/passages', //u.checkTeacher,
    function (req, res, next) {
      async.waterfall([
        dbapi2.findAllCreate({
          sql: squel.select().from("passages").toParam()
        }),
        getList(req)
        ], done(next)
      );
    },
    function (req, res) {
      res.render('passages-list', {account: req.user, passages: req.passages});
    }
  );

  app.get('/passages/:id',
    function (req, res, next) {
      async.waterfall([
        queryById(req.params.id),
        getSingle(req),
        ], done(next)
      );
    },
    function (req, res) {
      if (req.isAuthenticated() && req.user.groupname === 'teacher') {
        req.teacher = true;
      }
      res.render('passages', {account: req.user, passage: req.passage, dir:req.dir, teacher: req.teacher});
    }
  );

  app.get('/passages-add', //u.checkTeacher,
    function (req, res) {
      res.render('passages-edit', {account: req.user, passage: null});
    }
  )

  app.get('/passages-edit/:id', //u.checkTeacher,
    function (req, res, next) {
      async.waterfall([
        queryById(req.params.id),
        getSingle(req),
        ], done(next)
      );
    },
    function (req, res) {
      console.log(req.dir);
      res.render('passages-edit', {account: req.user, passage: req.passage, dir:req.dir});
    }
  )

  app.post('/passages', //u.checkTeacher,
    function (req, res, next) {
      var coverName;
      async.waterfall([
        collectInfo(req),
        function (callback) {
          if (req.newpassage.cover.size === 0) {
            coverName = "";
          } else {
            coverName = req.newpassage.cover.originalFilename;
          }
          callback(null);
        },
        function (callback) {
          dbapi2.insertCreate({
            sql: squel.insert().into("passages")
              .set("title", req.newpassage.title)
              .set("description", req.newpassage.description)
              .set("cover_name", coverName)
              .set("dir", req.newpassage.dir)
              .set("alias", req.newpassage.alias)
              .toParam()
          }) (callback);
        },
        function (lastId, callback) {
          if (!req.passage) {
            req.passage = {};
          }
          req.passage.id = lastId;
          fs.mkdir(path.join(passagesDir, '' + req.passage.id), callback);
        },
        function (callback) {
          fs.writeFile(path.join(passagesDir, '' + req.passage.id, 'context'), req.newpassage.context, callback);
        },
        function (callback) {
          moveCover(req) (req.passage.id, coverName) (callback);
        }
        ], done(next)
      );
    },
    function (req, res) {
      res.redirect(303, '/passages/' + req.passage.id);
    }
  );

  app.post('/passages-edit/:id', //u.checkTeacher,
    function (req, res, next) {
      var coverName;
      async.waterfall([
        queryById(req.params.id),
        getSingle(req),
        collectInfo(req),
        function (callback) {
          if (req.newpassage.cover.size === 0) {
            coverName = req.passage.coverName;
          } else {
            coverName = req.newpassage.cover.originalFilename;
          }
          callback(null);
        },
        function (callback) {
          dbapi2.updateCreate({
            sql: squel.update().table("passages")
              .set("title", req.newpassage.title)
              .set("description", req.newpassage.description)
              .set("cover_name", coverName)
              .set("dir", req.newpassage.dir)
              .set("alias", req.newpassage.alias)
              .where("id = ?", req.params.id)
              .toParam()
          }) (callback);
        },
        function (callback) {
          if (req.newpassage.cover.size > 0 && req.passage.coverName !== "") {
            fs.unlink(path.join(passagesDir, '' + req.params.id, req.passage.coverName), callback);
          }
          callback(null);
        },
        function (callback) {
          fs.writeFile(path.join(passagesDir, '' + req.passage.id, 'context'), req.newpassage.context, callback);
        },
        function (callback) {
          moveCover(req) (req.params.id, coverName) (callback);
        }
        ], done(next)
      );
    },
    function (req, res) {
      res.redirect(303, '/passages/' + req.params.id);
    }
  );

  app.post('/passages-delete/:id', //u.checkTeacher,
    function (req, res, next) {
      async.waterfall([
        queryById(req.params.id),
        getSingle(req),
        dbapi2.deleteCreate({
          sql: squel.delete().from("passages").where("id = ?", req.params.id).toParam()
        }),
        rimraf.bind(null, path.join(passagesDir, '' + req.params.id))
        ], done(next)
      );
    },
    function (req, res) {
      res.redirect(303, '/passages');
    }
  );

  app.get('/overview',
    function (req, res, next) {
      async.waterfall([
        dbapi2.findAllCreate({
          sql: squel.select().from("passages").where("dir = ?", "overview").toParam()
        }),
        getList(req)
        ], done(next)
      );
    },
    function (req, res) {
      res.render('overview-list', {account: req.user, passages: req.passages});
    }
  );

  app.get('/overview/:alias',
    function (req, res, next) {
      async.waterfall([
        queryByAlias("overview", req.params.alias),
        getSingle(req),
        ], done(next)
      );
    },
    function (req, res) {
      if (req.isAuthenticated() && req.user.groupname === 'teacher') {
        req.teacher = true;
      }
      res.render('passages', {account: req.user, passage: req.passage, dir:req.dir, teacher: req.teacher});
    }
  );

  app.get('/faculty',
    function (req, res, next) {
      async.waterfall([
        dbapi2.findAllCreate({
          sql: squel.select().from("passages").where("dir = ?", "faculty").toParam()
        }),
        getList(req)
        ], done(next)
      );
    },
    function (req, res) {
      var passages = [];
      passages.push(req.passages[0]);
      passages[0].description = '费米科学创始人、创新方法论学者、科学教育践行者。\
北京大学法学博士、理学学士、斯坦福商学院北京创业训练营首届学员、国际化学奥林匹克竞赛金牌。\
奉行“有用、有趣的科学”价值观、实践“创造性连接一切”的创新方法论，做有情怀的科学教育，培养有温度的科学人。';
      passages.push(req.passages[1]);
      passages[1].description = '北京大学物理学院学士、硕士学位，全国中学生物理竞赛金牌，国家冬令营成员。7年教育培训经验，北京四中、人大附、西安铁一中、高新一中物理竞赛教练，费米科学联合创始人。\
Physics（物理）一词源于Natural（自然），是人类对世界的感知和探索。费米将会建立Science、 Technology、Engineering、Mathematics四个主干学科，是满足孩子们好奇心的同时，陪伴他们运用理证和实证去伪存真。结合 国学知识，点亮孩子的内心，成为有人文素养的科学人。\
教育，是教会每个人追求幸福的事业。';
      /*passages.push(req.passages[2]);
      passages[2].description = '清华大学数学系学士学位，全国数学联赛全省第二、全国中学生物理竞赛全省第一，国家数学、物理冬令营成员。\
从“学霸保送生”到数学爱好者，从“做题破万道，考试如有神”到“数学就是把生活中的美解析化”，摆脱应试的桎梏发现真正有用的数学，让数学“化敌为友”，让更多人爱上数学。\
行胜于言，用行动走进美丽的数学世界，让思想迸发闪烁的智慧火花';*/
      passages.push(req.passages[2]);
      passages[2].description = '北京大学化学学士学位，心理学双学士，两届全国化学竞赛一等奖。\
教育行业五年工作经验，坚信Chem is try& Chem is DIY，真正能学好化学的人一定是有生活情趣的人。借鉴了咨询师“助人自助”的理念，带着真诚的心，陪伴更多孩子从费米学院走出，成为有温度的科学人。\
是心理咨询师也是分子美食家，但更希望通过费米计划中点亮孩子们的梦想。'
      res.render('faculty-list2.hbs', {account: req.user, passages: passages});
    }
  );

  app.get('/faculty/:alias',
    function (req, res, next) {
      async.waterfall([
        queryByAlias("faculty", req.params.alias),
        getSingle(req),
        ], done(next)
      );
    },
    function (req, res) {
      if (req.isAuthenticated() && req.user.groupname === 'teacher') {
        req.teacher = true;
      }
      res.render('passages', {account: req.user, passage: req.passage, dir:req.dir, teacher: req.teacher});
    }
  );

  app.get('/students',
    function (req, res) {
      res.render('diy-list.hbs', {account: req.user});
    }
  );
  /*app.get('/diy',
    function (req, res, next) {
      async.waterfall([
        dbapi2.findAllCreate({
          sql: squel.select().from("passages").where("dir = ?", "diy").toParam()
        }),
        getList(req)
        ], done(next)
      );
    },
    function (req, res) {
      res.render('diy-list', {account: req.user, passages: req.passages});
    }
  );*/

  /*app.get('/diy/:alias',
    function (req, res, next) {
      async.waterfall([
        queryByAlias("diy", req.params.alias),
        getSingle(req),
        ], done(next)
      );
    },
    function (req, res) {
      if (req.isAuthenticated() && req.user.groupname === 'teacher') {
        req.teacher = true;
      }
      res.render('passages', {account: req.user, passage: req.passage, dir:req.dir, teacher: req.teacher});
    }
  );*/

  app.get('/articles',
    function (req, res, next) {
      async.waterfall([
        dbapi2.findAllCreate({
          sql: squel.select().from("passages")
            .where("dir = 'news' OR dir = 'activities' OR dir = 'notes' OR dir = 'QA'")
            .toParam()
        }),
        getList(req)
        ], done(next)
      );
    },
    function (req, res) {
      var passages = [];
      for (var v in req.passages)
        passages.push(req.passages[v]);
      passages.sort(
        function (a,b) {
          return b.id - a.id;
        }
      );
      res.render('news-list', {account: req.user, passages: passages});
    }
  );

  app.get('/articles-activities',
    function (req, res, next) {
      async.waterfall([
        dbapi2.findAllCreate({
          sql: squel.select().from("passages")
            .where("dir = 'activities'")
            .toParam()
        }),
        getList(req)
        ], done(next)
      );
    },
    function (req, res) {
      var passages = [];
      for (var v in req.passages)
        passages.push(req.passages[v]);
      passages.sort(
        function (a,b) {
          return b.id - a.id;
        }
      );
      res.render('news-list', {account: req.user, passages: passages});
    }
  );


  app.get('/articles-notes',
    function (req, res, next) {
      async.waterfall([
        dbapi2.findAllCreate({
          sql: squel.select().from("passages")
            .where("dir = 'notes'")
            .toParam()
        }),
        getList(req)
        ], done(next)
      );
    },
    function (req, res) {
      var passages = [];
      for (var v in req.passages)
        passages.push(req.passages[v]);
      passages.sort(
        function (a,b) {
          return b.id - a.id;
        }
      );
      res.render('news-list', {account: req.user, passages: passages});
    }
  );

  app.get('/articles-QA',
    function (req, res, next) {
      async.waterfall([
        dbapi2.findAllCreate({
          sql: squel.select().from("passages")
            .where("dir = 'QA'")
            .toParam()
        }),
        getList(req)
        ], done(next)
      );
    },
    function (req, res) {
      var passages = [];
      for (var v in req.passages)
        passages.push(req.passages[v]);
      passages.sort(
        function (a,b) {
          return b.id - a.id;
        }
      );
      res.render('news-list', {account: req.user, passages: passages});
    }
  );

  /*app.get('/news/:alias',
    function (req, res, next) {
      async.waterfall([
        queryByAlias("news", req.params.alias),
        getSingle(req),
        ], done(next)
      );
    },
    function (req, res) {
      if (req.isAuthenticated() && req.user.groupname === 'teacher') {
        req.teacher = true;
      }
      res.render('passages', {account: req.user, passage: req.passage, dir:req.dir, teacher: req.teacher});
    }
  );*/
}
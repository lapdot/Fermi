var squel = require('squel');
var path = require('path');
var fs = require('fs');
var async = require('async');
var multiparty = require('multiparty');
var rimraf = require('rimraf');
var dbapi2 = require('./../libs/dbapi2');
var u = require('./../libs/utility');

var uploadDir = path.join(__dirname,'../tmp');
var videosDir = path.join(__dirname,'../public/videos');

function getById(req) {
  return function (id) {
    return async.seq(
      dbapi2.findCreate({
        sql: squel.select().from("videos").where("id = ?", id).toParam()
      }),
      function (row, callback) {
        req.video = {};
        req.video.id = row.id;
        req.video.title = row.title;
        req.video.description = row.description;
        req.video.coverName = row.cover_name;
        req.video.contentLink = row.content_link;
        if (!row) {
          callback(new Error("notFound"));
        } else {
          callback(null);
        }
      }
    );
  }  
}

function collectInfo(req) {
  return function (callback) {
    var video = {};
    var form =  new multiparty.Form({
      autoFiles: true,
      uploadDir: uploadDir
    });
    form.parse(req, function (err, fields, files) {
      if (err) {
        callback(err);
      } else {
        video.title = fields.title[0];
        video.description = fields.description[0];
        video.contentLink = fields.contentLink[0];
        video.cover = files.cover[0];
        req.newVideo = video;
        callback(null);
      }
    });
  }
}

function moveCover (req) {
  return function (id, coverName) {
    return function (callback) {
      if (req.newVideo.cover.size === 0) {
        fs.unlink(req.newVideo.cover.path, callback)
      } else {
        fs.rename(req.newVideo.cover.path, path.join(videosDir, '' + id, coverName), callback);
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
  app.get('/videos', 
    function (req, res, next) {
      async.waterfall([
        dbapi2.findAllCreate({
          sql: squel.select().from("videos").toParam()
        }),
        function (rows, callback) {
          req.videos = {};
          var len = rows.length;
          var i;
          for (i=0; i<len; i++) {
            req.videos[i] = {};
            req.videos[i].id = rows[i].id;
            req.videos[i].title = rows[i].title;
            req.videos[i].description = rows[i].description;
            req.videos[i].coverName = rows[i].cover_name;
            req.videos[i].contentLink = rows[i].content_link;
          }
          callback(null);
        }
        ], done(next)
      );
    },
    function (req, res) {
      var videos = [];
      videos.push(req.videos[3]);
      videos.push(req.videos[1]);
      videos.push(req.videos[2]);
      res.render('videos-list', {account: req.user, videos: videos});
    }
  );

  app.get('/videos/:id', 
    function (req, res, next) {
      async.waterfall([
        getById(req) (req.params.id)
        ], done(next)
      );
    },
    function (req, res) {
      if (req.isAuthenticated() && req.user.groupname === 'teacher') {
        req.teacher = true;
      }
      res.render('videos', {account: req.user, video: req.video, teacher: req.teacher});
    }
  );

  app.get('/videos-add', u.checkTeacher,
    function (req, res) {
      res.render('videos-edit', {account: req.user, video: null});
    }
  )

  app.get('/videos-edit/:id', u.checkTeacher,
    function (req, res, next) {
      async.waterfall([
        getById(req) (req.params.id)
        ], done(next)
      );
    },
    function (req, res) {
      res.render('videos-edit', {account: req.user, video: req.video});
    }
  )

  app.post('/videos', u.checkTeacher,
    function (req, res, next) {
      var coverName;
      async.waterfall([
        collectInfo(req),
        function (callback) {
          if (req.newVideo.cover.size === 0) {
            coverName = "";
          } else {
            coverName = req.newVideo.cover.originalFilename;
          }
          callback(null);
        },
        function (callback) {
          dbapi2.insertCreate({
            sql: squel.insert().into("videos")
              .set("title", req.newVideo.title)
              .set("description", req.newVideo.description)
              .set("content_link", req.newVideo.contentLink)
              .set("cover_name", coverName)
              .toParam()
          }) (callback);
        },
        function (lastId, callback) {
          if (!req.video) {
            req.video = {};
          }
          req.video.id = lastId;
          fs.mkdir(path.join(videosDir, '' + req.video.id), callback);
        },
        function (callback) {
          moveCover(req) (req.video.id, coverName) (callback);
        }
        ], done(next)
      );
    },
    function (req, res) {
      res.redirect(303, '/videos/' + req.video.id);
    }
  );

  app.post('/videos-edit/:id', u.checkTeacher,
    function (req, res, next) {
      var coverName;
      async.waterfall([
        getById(req) (req.params.id),
        collectInfo(req),
        function (callback) {
          if (req.newVideo.cover.size === 0) {
            coverName = req.video.coverName;
          } else {
            coverName = req.newVideo.cover.originalFilename;
          }
          callback(null);
        },
        function (callback) {
          dbapi2.updateCreate({
            sql: squel.update().table("videos")
              .set("title", req.newVideo.title)
              .set("description", req.newVideo.description)
              .set("content_link", req.newVideo.contentLink)
              .set("cover_name", coverName)
              .where("id = ?", req.params.id)
              .toParam()
          }) (callback);
        },
        function (callback) {
          if (req.newVideo.cover.size > 0 && req.video.coverName !== "") {
            fs.unlink(path.join(videosDir, '' + req.params.id, req.video.coverName), callback);
          }
          callback(null);
        },
        function (callback) {
          moveCover(req) (req.params.id, coverName) (callback);
        }
        ], done(next)
      );
    },
    function (req, res) {
      res.redirect(303, '/videos/' + req.params.id);
    }
  );

  app.post('/videos-delete/:id', u.checkTeacher,
    function (req, res, next) {
      async.waterfall([
        getById(req),
        dbapi2.deleteCreate({
          sql: squel.delete().from("videos").where("id = ?", req.params.id).toParam()
        }),
        rimraf.bind(null, path.join(videosDir, '' + req.params.id))
        ], done(next)
      );
    },
    function (req, res) {
      res.redirect(303, '/videos');
    }
  );
}
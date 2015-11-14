var images = require ('./../libs/images');
var u = require('./../libs/utility');
var path = require('path');

module.exports = function(app) {
  app.get('/images/:id',
    images.setIdByParams,
    images.getRowById,
    images.sendImage
  );

  app.get('/images-upload', u.checkTeacher,
    function (req, res, next) {
      res.render('images-edit', {account: req.user, image: null});
    }
  );

  app.post('/images', u.checkTeacher,
    images.insertRow,
    images.setIdByLast,
    function (req, res, next) {
      var form = new formidable.IncomingForm();
      form.uploadDir = path.join(__dirname, '/public/images');
      form.on('fileBegin', 
        function(name, file) {
          req.image = {};
          req.image.fileName = rename(req.id, file.name);
          if (name === 'cover') {
            file.path = 'public/images/' + req.image.fileName;
          }
        }
      );
      form.parse(req, 
        function (err, fields, files) {
          if (err) {
            res.errorHandle.other(req, res);
          } else {
            next();
          }
        }
      );
    },
    images.updateRowById,
    function (req, res, next) {
      res.redirect(303, '/images/' + req.id);
    }
  );
};
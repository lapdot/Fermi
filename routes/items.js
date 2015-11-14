var dbapi = require ('./../libs/dbapi');
var helper = require('./../libs/helperapi');
var u = require('./../libs/utility');
var u2s = u.u2s;

module.exports = function(app) {
  /**
   * A teacher GET the page to add an item
   */

  app.get('/items/add', u.checkTeacher,
    function (req, res) {
      res.render('items-add', {account: req.user, message: req.flash('error') });
    }
  );

  /**
   * GET the page for the item
   */

  app.get('/items/:id',
    function (req, res, next) {
      helper.findItemById(req.params.id,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (!data) {
            req.errorHandle.notFound(req, res);
          } else {
            req.item = data;
            next();
          }
        }
      );
    },
    function (req, res, next) {
      if (req.isAuthenticated() && (req.user.groupname === 'teacher' )) {
        helper.listUsersByItemBought(req.item,
          function (err, data){
            if (err) {
              req.errorHandle.dataBase(req, res);
            } else {
              req.users = data;
              req.teacher = req.user;
              next();
            }
          }
        )
      } else {
        next();
      }
    },
    function (req, res) {
      res.render('items', {account: req.user, item: req.item, users: req.users, teacher: req.teacher, message: req.flash('error') } );
    } 
  );

  /**
   * A teacher POST an item
   */

  app.post('/items', u.checkTeacher,
    function (req, res, next) {
      dbapi.pInsert('items', 
        ['name', 'semester', 'start_date', 'time_description', 'place', 'teacher_description',
         'total_times', 'total_price', 'remark', 'amount', 'available_amount', 'overdue'
        ],
        [u2s(req.body.name), u2s(req.body.semester), u2s(req.body.start_date), u2s(req.body.time_description),
         u2s(req.body.place), u2s(req.body.teacher_description), u2s(req.body.total_times), u2s(req.body.total_price),
         u2s(req.body.remark), u2s(req.body.amount), u2s(req.body.amount), u2s(req.body.overdue)
        ],
      /*dbapi.putData('INSERT INTO items ( ' 
        + 'name, semester, start_date, time_description, place, teacher_description, '
        + 'total_times, total_price, remark, amount, available_amount, overdue'
        + ') VALUES ( "' 
        + u2s(req.body.name) + '", "'
        + u2s(req.body.semester) + '", "'
        + u2s(req.body.start_date) + '", "'
        + u2s(req.body.time_description) + '", "'
        + u2s(req.body.place) + '", "'
        + u2s(req.body.teacher_description) + '", "'
        + u2s(req.body.total_times) + '", "'
        + u2s(req.body.total_price) + '", "'
        + u2s(req.body.remark) + '", "'
        + u2s(req.body.amount) + '", "'
        + u2s(req.body.amount) + '", "'
        + u2s(req.body.overdue) + '" )',*/
        function (err) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            next();
          }
        }
      )
    },
    function (req, res) {
      dbapi.getData('max(id) as last_id','items','',
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            res.redirect(303, '/items/' + data[0].last_id);
          }
        }
      );
    }
  );

  /**
   * A teacher GET the page to edit the item
   */

  app.get('/items/:id/edit', u.checkTeacher,
    function (req, res, next) {
      helper.findItemById(req.params.id,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (!data){
            req.errorHandle.notFound(req, res);
          } else {
            req.item = data;
            next();
          }
        }
      );
    },
    function (req, res) {
      res.render('items-edit', {account: req.user, item: req.item, message: req.flash('error') });
    }
  );

  /**
   * A teacher PUT an item 
   */

  app.put('/items/:id', u.checkTeacher,
    function (req, res, next) {
      helper.findItemById(req.params.id,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (!data) {
            req.errorHandle.htmlNotFound(req, res);
          } else if (data.available_amount < data.amount) {
            req.flash('error', '此课程/活动已经被某些用户购买')
            res.redirect(303, '/items/' + req.params.id);
          } else {
            next();
          }
        }
      );
    },
    function (req, res) {
      dbapi.pUpdate('items',
        ['name', 'semester', 'start_date', 'time_description', 'place', 'teacher_description',
         'total_times', 'total_price', 'remark', 'amount', 'available_amount', 'overdue'
        ],
        'id = ?',
        [u2s(req.body.name), u2s(req.body.semester), u2s(req.body.start_date), u2s(req.body.time_description),
         u2s(req.body.place), u2s(req.body.teacher_description), u2s(req.body.total_times), u2s(req.body.total_price),
         u2s(req.body.remark), u2s(req.body.amount), u2s(req.body.amount), u2s(req.body.overdue),
         req.params.id
        ],
      /*dbapi.putData('UPDATE items SET '
        + 'name = "' + u2s(req.body.name) + '", '
        + 'semester = "' + u2s(req.body.semester) + '", '
        + 'start_date = "' + u2s(req.body.start_date) + '", '
        + 'time_description = "' + u2s(req.body.time_description) + '", '
        + 'place = "' + u2s(req.body.place) + '", '
        + 'teacher_description = "' + u2s(req.body.teacher_description) + '", '
        + 'total_times = "' + u2s(req.body.total_times) + '", '
        + 'total_price = "' + u2s(req.body.total_price) + '", '
        + 'remark = "' + u2s(req.body.remark) + '", '
        + 'amount = "' + u2s(req.body.amount) + '", '
        + 'available_amount = "' + u2s(req.body.amount) + '", '
        + 'overdue = "' + u2s(req.body.overdue) + '" ' 
        + 'WHERE id = "' + req.params.id + '"',*/
        function (err, data) {
          if (err) {
            errorHandle.dataBase(req, res);
          } else {
            res.redirect(303, '/items/' + req.params.id);
          }
        }
      );
    }
  );
}
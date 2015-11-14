var dbapi = require ('./../libs/dbapi');
var helper = require('./../libs/helperapi');
var u = require('./../libs/utility');
var u2s = u.u2s;
var nodemailer = require('nodemailer');
var bcrypt = require('bcrypt');

function loginWithPrevURL(user, req, res) {
  req.logIn(user, function (err) {
    if (err) { return next(err); }
    if (!req.body.prevurl) {
      res.redirect(303, '/account');
    } else {
      res.redirect(303, req.body.prevurl);
    }
  });
};

/**
 * Render a user's info page
 */

function displayUser(user, req, res) {
  if (req.isAuthenticated() && (req.user.groupname === 'teacher' )) {
    req.teacher = true;
  }
  helper.listItemsBoughtByUser(user,
    function (err, data) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else {
        res.render('account', {user: user, account: req.user, items: data, teacher: req.teacher });
      }
    }
  );
};

function recheckPassword(req, res, next) {
  if (u.checkPassword(req.user, req.body.password)) {
    return next();
  } else {
    req.flash('error', '密码错误');
    res.redirect(303, 'back');
  }
};

module.exports = function(app, passport) {

  /**
   * GET the page to log in
   */

  app.get('/login',
    function (req, res){
      if (req.isAuthenticated()) {
        res.redirect('/account');
      } else {
        res.render('login', { message: req.flash('error') });
      }
    }
  );


  /**
   * POST to log in
   */

  app.post('/login', 
    function (req, res, next) {
      passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err) }
          if (!user) {
            req.flash('error', info.message);
            return res.redirect(303, '/login');
          }
          loginWithPrevURL(user, req, res);
        }) (req, res, next);
    }
  );

  /**
   * GET to log out
   */
  app.get('/logout', function (req, res){
    req.logout();
    res.redirect(303, '/');
  });

  /**
   * GET the page to sign up
   */

  app.get('/signup',
    function (req, res){
      if (req.isAuthenticated()) {
        res.redirect(303, '/account');
      } else {
        res.render('signup', { message: req.flash('error') });
      }
    }
  );



  /**
   * POST to sign up
   */

  app.post('/signup',
    function (req, res, next) {
      if (req.isAuthenticated()) {
        res.redirect('/account');
      } else if (req.body.password.length < 1 ) {
        req.flash('error', '密码太短');
        res.redirect(303, '/signup');
      } else if (req.body.password != req.body.password2) {
        req.flash('error', '两次输入的密码不同');
        res.redirect(303, '/signup');
      } else {
        next();
      }
    },
    function (req, res, next) {
      helper.findUserByPhone(req.body.phone,
        function (err, data){
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (data) {
            req.flash('error', '此号码已经被注册');
            res.redirect(303, '/signup');
          } else {
            next();
          }
        }
      )
    },
    function (req, res, next) {
      dbapi.pInsert('users',
        ['email', 'password', 'bcrypt', 'groupname', 'realname', 'gender', 'birthday', 'school', 'grade',
         'contact1', 'phone1', 'contact2', 'phone2', 'address'
        ],
        [u2s(req.body.email), '', u.bcryptPassword(req.body.password), 'student', u2s(req.body.realname), u2s(req.body.gender),
         u2s(req.body.birthday), u2s(req.body.school), u2s(req.body.grade), u2s(req.body.contact1),
         req.body.phone, u2s(req.body.contact2), u2s(req.body.phone2), u2s(req.body.address)
        ],
      /*dbapi.putData('INSERT INTO users ( email, password, groupname, realname, gender, birthday, school, grade,'
        + ' contact1, phone1, contact2, phone2, address ) VALUES ( "' 
        + u2s(req.body.email) + '", "' 
        + req.body.password + '", "' 
        + 'student", "'
        + u2s(req.body.realname) + '", "' 
        + u2s(req.body.gender) + '", "'
        + u2s(req.body.birthday) + '", "' 
        + u2s(req.body.school) + '", "' 
        + u2s(req.body.grade) + '", "'
        + u2s(req.body.contact1) + '", "'
        + req.body.phone + '", "'
        + u2s(req.body.contact2) + '", "'
        + u2s(req.body.phone2) + '", "'
        + u2s(req.body.address) + '")',*/
        function (err) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            next();
          }
        }
      )
    },
    function (req, res, next) {
      helper.findUserByPhone(req.body.phone,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            loginWithPrevURL(data, req, res);
          }
        }
      );
    }
  );
  
  /**
   * GET the page to find user's password
   */

  app.get('/find-password', function (req, res) {
    res.render('findPassword', {message: req.flash('error')});
  });

  app.post('/find-password',
    function (req, res, next) {
      helper.findUserByPhone(req.body.phone,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (!data) {
            req.flash('error', '此号码未注册');
            res.redirect(303, '/find-password');
          } else if (data.email === '') {
            req.flash('error', '此帐号没有留下邮箱');
            res.redirect(303, '/find-password');
          } else {
            req.user = data;
            next();
          }
        }
      );
    },
    function (req, res, next) {
      req.newpassword = u.creeateRandomPassword();
      dbapi.pUpdate('users', ['bcrypt'], 'id = ?', [u.bcryptPassword(req.newpassword), req.user.id],
        function (err) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            next();
          }
        }
      );
    },
    function (req, res) {
      // create reusable transport method (opens pool of SMTP connections)
      var smtpTransport = nodemailer.createTransport({
        host: 'smtp.163.com',
        port: 25,
        auth: {
          user: "lllnew2@163.com",
          pass: "lty142857"
        }
      });
      // setup e-mail data with unicode symbols
      var mailOptions = {
        from: "lllnew2@163.com", // sender address
        to: req.user.email, // list of receivers
        subject: "费米计划密码找回", // Subject line
        text: "", // plaintext body
        html: "<p>尊敬的" + req.user.realname + ": </p>" 
          + "<p>您的密码被重置为：" + req.newpassword + "</p>"// + req.user.password // html body
      };
      // send mail with defined transport object
      smtpTransport.sendMail(mailOptions, function(error, info){
        if(error){
          req.errorHandle.other(req, res);
        }else{ 
        }
        // shut down the connection pool, no more messages
        smtpTransport.close();
      });
      res.render('send-mail-success');
    }
  );

  /**
   * ajax POST phone number to check whether it has been registered
   */

  app.post('/api/check-phone-existed',
    function (req, res) {
      helper.findUserByPhone(req.body.phone,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (data) {
            res.send({success: true});
          } else {
            res.send({success: false});
          }
        }
      );
    }
  );

  /**
   * GET accoount's page
   */

  app.get('/account', u.checkAuth,
    function (req, res) {
      displayUser(req.user, req, res);
    }
  );

  /**
   * A teacher GET a user's page for 
   */

  app.get('/users/:id', u.checkTeacher,
    function (req, res, next) {
      helper.findUserById(req.params.id,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (!data) {
            req.errorHandle.notFound(req, res);
          } else {
            displayUser(data, req, res);
          }
        }
      );
    }
  );

  /**
   * GET the page to edit his account's infomation
   */

  app.get('/account/edit', u.checkAuth,
    function (req, res) {
      res.render('users-edit', {account: req.user, message: req.flash('error') });
    }
  );

  /**
   * PUT his account's infomation
   */

  app.put('/account', u.checkAuth,
    function (req, res, next) {
      if (req.body.realname === '') {
        req.flash('error', '姓名不能为空');
        res.redirect(303, 'back');
      } else {
        next();
      }
    },
    function (req, res) {
      dbapi.pUpdate('users', 
        ['realname', 'gender', 'school', 'grade', 'phone2'], 
        'id = ?',
        [u2s(req.body.realname), u2s(req.body.gender), u2s(req.body.school), 
         u2s(req.body.grade), u2s(req.body.phone2), req.user.id],
      /*dbapi.putData('UPDATE users SET '
        + 'realname = "' + u2s(req.body.realname) + '", '
        + 'gender = "' + u2s(req.body.gender) + '", '
        + 'school = "' + u2s(req.body.school) + '", '
        + 'grade = "' + u2s(req.body.grade) + '", '
        + 'phone2 = "' + u2s(req.body.phone2) + '" '
        + 'WHERE id = "' + req.user.id + '"',*/
        function (err) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            res.redirect(303, '/users-edit-success');
          }
        }
      );
    }
  );

  /**
   * GET the page to edit his primary phone number
   */

  app.get('/account/phone/edit', u.checkAuth,
    function (req, res) {
      res.render('users-phone-edit', {account: req.user, message: req.flash('error') });
    }
  );

  /**
   * PUT his primary phone number
   */

  app.put('/account/phone', u.checkAuth, recheckPassword,
    function (req, res, next) {
      if (req.body.newphone === ''){
        req.flash('error', '号码不能为空');
        res.redirect(303, 'back');
      } else if (req.body.newphone !== req.body.newphone2) {
        req.flash('error', '两次输入的号码不同');
        res.redirect(303, 'back');
      } else if (req.body.newphone === req.user.phone1) {
        req.flash('error', '号码与之前相同');
        res.redirect(303, 'back');
      } else {
        next();
      }
    },
    function (req, res, next) {
      helper.findUserByPhone(req.body.newphone,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (data) {
            req.flash('error', '此号码已经被注册');
            res.redirect(303, 'back');
          } else {
            next();
          }
        }
      )
    },
    function (req, res) {
      dbapi.pUpdate('users', ['phone1'], 'id = ?', [req.body.newphone, req.user.id],
      /*dbapi.putData('UPDATE users SET '
        + 'phone1 = "' + req.body.newphone + '" '
        + 'WHERE id = "' + req.user.id + '"',*/
        function (err) {
          if (err){ 
            req.errorHandle.dataBase(req, res);
          } else {
            res.redirect(303, '/users-edit-success');
          }
        }
      );
    }
  );

  /**
   * GET the page to edit his password
   */

  app.get('/account/password/edit', u.checkAuth,
    function (req, res) {
      res.render('users-password-edit', {account: req.user, message: req.flash('error') });
    }
  );

  /**
  * PUT his password
  */

  app.put('/account/password', u.checkAuth, recheckPassword,
    function (req, res, next) {
      if (req.body.newpassword.length <1 ) {
        req.flash('error', '密码太短');
        res.redirect(303, 'back');
      } else if (req.body.newpassword !== req.body.newpassword2) {
        req.flash('error', '两次输入的密码不同');
        res.redirect(303, 'back');
      } else {
        next();
      }
    },
    function (req, res) {
      dbapi.pUpdate('users', ['bcrypt'], 'id = ?', [u.bcryptPassword(req.body.newpassword), req.user.id],
      /*dbapi.putData('UPDATE users SET '
        + 'password = "' + req.body.newpassword + '" '
        + 'WHERE id = "' + req.user.id + '"',*/
        function (err) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            res.redirect(303, '/users-edit-success');
          }
        }
      );
    }
  );

  /**
   * GET a message for editing his account's infomations successfully
   */

  app.get('/users-edit-success',
    function (req, res, next) {
      res.render('users-edit-success');
    }
  );
  
}
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var formidable = require('formidable');
var dbapi = require('./libs/dbapi');
var helper = require('./libs/helperapi');
var u = require('./libs/utility');
var fetch = require('./libs/fetch');
var log4js = require('log4js');
var bcrypt = require('bcrypt');

/**
 * Website's main app
 * @module app
 */
var app = express();

app.set('views', path.join(__dirname, 'views'));

var handlebars = require('express-handlebars').create({
    defaultLayout:'fermi',
    helpers: {
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

var hbs2 = require('express-handlebars').create({
    defaultLayout:'fermi2.hbs',
    helpers: {
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
});
app.engine('hbs', hbs2.engine);


// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
//var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded( { extended: false, limit: '1000kb' } ); 
//app.use(jsonParser);
app.use(urlencodedParser);
app.use(methodOverride(function(req, res){
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it 
    var method = req.body._method
    delete req.body._method
    return method
  }
}));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  helper.findUserById(id, function (err, user) {
    if (!err && !user){
      done(new Error('User ' + id + ' does not exist'));
    }else{
      done(err, user);
    }
  });
});

passport.use(new LocalStrategy(
  { usernameField: 'phone' },
  function (phone, password, done) {
    process.nextTick(function () {
      helper.findUserByPhone(phone, function (err, user) {
        if (err) { 
          return done(err); 
        }
        if (!user) { 
          return done(null, false, { message: 'Unknown phone ' + phone }); 
        }
        if (!u.checkPassword(user, password)) {
          return done(null, false, { message: 'Invalid password' });
        }
        return done(null, user);
      })
    });
  }
));

app.use(passport.initialize());
app.use(passport.session());

htmlErrorHandle = {
  dataBase: function (req, res) {
    res.status(500);
    res.render('500', {account: req.user});
  },
  file: function (req, res) {
    res.status(500);
    res.render('500', {account: req.user});    
  },
  notFound: function (req, res) {
    res.status(404);
    res.render('404', {account: req.user});
  },
  notLogin: function (req, res) {
    res.redirect(303, '/login');
  },
  forbidden: function (req, res) {
    res.status(403);
    res.render('403', {account: req.user});
  },
  other: function (req, res) {
    res.status(500);
    res.render('500', {account: req.user});
  }
};

ajaxErrorHandle = {
  dataBase: function (req, res) {
    return;
  },
  file: function (req, res) {
    return;
  },
  notFound: function (req, res) {
    return;
  },
  notLogin: function (req, res) {
    return;
  },
  forbidden: function (req, res) {
    return;
  },
  other: function (req, res) {
    return;
  }
};

app.use(function (req, res, next) {
  if (req.xhr) {
    req.errorHandle = ajaxErrorHandle;
  } else {
    req.errorHandle = htmlErrorHandle;
  };
  next();
});

log4js.configure({
  appenders: [
    { type: 'console' },
    { type: 'file', filename: 'logs/running.log', category: 'running' }
  ]
});

var logger = log4js.getLogger('running');
logger.setLevel('INFO');

app.use(function (req, res, next) {
  logger.info(req.ip + ' ' + req.method + ' ' + req.originalUrl);
  next();
});


/**
 * Some pages's route which are almost static
 */

app.get('/', function (req, res) {
  res.render('index2.hbs', {account: req.user} );
});

app.get('/newindex', function (req, res) {
  res.render('index3.hbs', {account: req.user} );
});

app.get('/courses', function (req, res) {
  res.render('courses.hbs', {account: req.user} );
});

app.get('/activities', function (req, res) {
  res.render('activities.hbs', {account: req.user} );
});

require('./routes/static')(app);

require('./routes/users')(app, passport);

require('./routes/items')(app);

require('./routes/buy')(app);

//require('./routes/passages')(app);
require('./routes/passages2')(app);

require('./routes/images')(app);

require('./routes/videos')(app);

/**
 * A teacher GET the page to add a news
 */

/*app.get('/news-fetch', u.checkTeacher,
  function (req, res) {
    res.render('news-fetch', {account: req.user});
  }
);*/

/**
 * A teacher POST to fetch news from WeiXin (only for test)
 */

/*app.post('/news/', u.checkTeacher,
  function (req, res) {
    var form = new formidable.IncomingForm();
    var subDir;
    //subDir = "0";
    //form.uploadDir = "./public/images/news/" + subDir;
    //fetch.mkDir(form.uploadDir);
    //form.uploadDir = form.uploadDir + "/images";
    //fetch.mkDir(form.uploadDir);
    form.uploadDir = "./public/images/tmp";
    form.on("fileBegin", 
      function(name, file) {
        console.log("Name: ", name);
        console.log("File: ", file);
        if (name === 'coverpicture') {
          file.path = form.uploadDir + "/cover.jpeg";
        }
      }
    );
    form.parse(req, 
      function (err, fields, files) {
        console.log(fields);
        console.log(files);
        subDir = fields.subDir;
        if (fields.wxurl === '' ){
          res.redirect(303, '/news/test');
        } else {
          fetch.run(fields.wxurl, subDir,
            function () {
              var fullDir = "./public/images/news/" + subDir;
              fetch.mkDir(fullDir);
              fullDir = fullDir + "/images";
              fetch.mkDir(fullDir);
              fetch.copy("./public/images/tmp/cover.jpeg", fullDir + "/cover.jpeg");
              res.redirect(303, '/news/subDir');
            }
          );
        }
      }
    );
  }
);*/

/**
 * GET a list of items
 */

/*app.get('/item-lists/:id',
  function (req, res, next) {
    helper.listItemsByListId(req.params.id,
      function (err, data) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else {
          req.items = data;
          next();
        }
      }
    );
  },
  function (req, res) {
    res.render('item-lists', {account: req.user, items: req.items, message: req.flash('error') });
  }
);*/

/**
 * GET to add the item to the list
 */

/*app.get('/item-lists/:id/add/:item_id', u.checkTeacher,
  function (req, res, next) {
    dbapi.getData('*', 'item_lists','list_id = ' + req.params.id + ' AND item_id = ' + req.params.item_id,
      function (err, data) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else if (data.length > 0) {
          req.flash('error', 'The pair has been existed.')
          res.redirect(303, '/item-lists/' + req.params.id);
        } else {
          next();
        }
      }
    );
  },
  function (req, res, next) {
    dbapi.putData('INSERT INTO item_lists (list_id, item_id) VALUES (' + req.params.id + ', ' + req.params.item_id + ')',
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
    res.redirect(303, '/item-lists/' + req.params.id);
  }
);*/

/**
 * GET to delete the item to the list
 */

/*app.get('/item-lists/:id/delete/:item_id', u.checkTeacher,
  function (req, res, next) {
    dbapi.getData('*', 'item_lists','list_id = ' + req.params.id + ' AND item_id = ' + req.params.item_id,
      function (err, data) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else if (data.length === 0) {
          req.flash('error', 'The pair is not existed.')
          res.redirect(303, '/item-lists/' + req.params.id);
        } else {
          next();
        }
      }
    );
  },
  function (req, res, next) {
    dbapi.putData('DELETE FROM item_lists WHERE list_id = ' + req.params.id + ' AND item_id = ' + req.params.item_id,
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
    res.redirect(303, '/item-lists/' + req.params.id);
  }
);*/

app.get('/courses/math',
  function (req, res) {
    res.render('courses-math2', {account: req.user});
  }
);

app.get('/courses/maker',
  function (req, res) {
    res.render("courses-maker", {account: req.user});
  }
);


/**
 * GET the page for the courses of physics
 */

app.get('/courses/phy',
  function (req, res) {
    res.render('courses-phy2', {account: req.user});
  }
);

/*app.get('/courses/phy',
  function (req, res, next) {
    helper.listItemsByListId(5,
      function (err, data) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else {
          req.phy_2015_winter_items = data;
          next();
        }
      }
    );
  },
  function (req, res, next) {
    helper.listItemsByListId(7,
      function (err, data) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else {
          req.phy_2015_spring_items = data;
          next();
        }
      }
    );
  },
  function (req, res) {
    res.render('courses-phy', {account: req.user,
      phy_2015_winter_items: req.phy_2015_winter_items,
      phy_2015_spring_items: req.phy_2015_spring_items
    });
  }
);*/

/**
 * GET the page for the courses of chemistry
 */

app.get('/courses/chem',
  function (req, res) {
    res.render('courses-chem2', {account: req.user});
  }
);

/*app.get('/courses/chem',
  function (req, res, next) {
    helper.listItemsByListId(6,
      function (err, data) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else {
          req.chem_2015_winter_items = data;
          next();
        }
      }
    );
  },
  function (req, res, next) {
    helper.listItemsByListId(8,
      function (err, data) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else {
          req.chem_2015_spring_items = data;
          next();
        }
      }
    );
  },
  function (req, res) {
    console.log(req.chem_2015_spring_items);
    res.render('courses-chem', {account: req.user,
      chem_2015_winter_items: req.chem_2015_winter_items,
      chem_2015_spring_items: req.chem_2015_spring_items
    });
  }
);*/

/**
 * GET the page for apply
 */

app.get('/apply',
  function (req, res) {
    res.render('apply2', {account: req.user});
  }
);
/*app.get('/apply',
  function (req, res, next) {
    helper.listItemsByListId(1,
      function (err, data) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else {
          req.courses_items = data;
          next();
        }
      }
    );
  },
  function (req, res, next) {
    helper.listItemsByListId(2,
      function (err, data) {
        if (err) {
          req.errorHandle.dataBase(req, res);
        } else {
          req.activities_items = data;
          next();
        }
      }
    );
  },
  function (req, res, next) {
    res.render('apply', {account: req.user, courses_items: req.courses_items, activities_items: req.activities_items });
  }
);*/

/*app.get('/videos-list', 
  function (req, res) {
    res.render('videos-list', {account: req.user});
  }
);

app.get('/test-video',
  function (req, res) {
    res.render('test-video', {account: req.user});
  }
);*/

app.get('/test',
  function (req, res) {
    console.log(0);
    var state = P.begin() ();
    console.log(state);
    state = state.then(function () {
      console.log(1);
      return 1;
    });
    state = state.then(function (i) {
      i++;
      console.log(i);
      return [i];
    });
    state = P.expand(state, function (i, callback) {
      i++;
      console.log(i);
      callback(null,i);
    });
    state = state.then(function (i) {
      i++;
      console.log(i);
      return [];
    });
    state = P.expand(state, function (callback) {
      console.log(5);
      callback(null,5);
    });
    state.done();
  }
  /*function (req, res) {
    var salt = bcrypt.genSaltSync(6);
    console.log(salt);
    var hash = bcrypt.hashSync('bacon', salt);
    console.log(hash);
    var result = bcrypt.compareSync('bacon', hash);
    console.log(result);
    result = bcrypt.compareSync('water', hash);
    console.log(result);
    console.log(bcrypt.hashSync('123456', salt));
    console.log(bcrypt.hashSync('12345678', salt));
    res.redirect(303, '/');
  }*/
);

app.get('/403', function(req, res) {
  req.errorHandle.forbidden(req, res);
});

app.get('/404', function (req, res) {
  req.errorHandle.notFound(req, res);
});

app.get('/500', function (req, res) {
  req.errorHandle.other(req, res);
});

app.use(function (req, res, next) {
  //res.redirect(303, '/404');
  req.errorHandle.notFound(req, res);
});

app.use(function (err, req, res, next) {
  if (err.message === 'notFound') {
    //res.redirect(303, '/404');
    req.errorHandle.notFound(req, res);
  } else {
    console.error(err.stack);
    req.errorHandle.other(req, res);
  }
});

module.exports = app;

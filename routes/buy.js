var dbapi = require ('./../libs/dbapi');
var helper = require('./../libs/helperapi');
var u = require('./../libs/utility');

function checkItemExisted(req, res, next) {
  helper.findItemById(req.body.id,
    function (err, data) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else if (!data) {
        res.redirect(303, '/account');
      } else {
        req.item = data;
        next();
      }
    }
  );
};

function checkUniqueBought(req, res, next) {
  helper.findUserItemBought(req.user, req.item,
    function (err, data) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else if (data) {
        req.flash('error','您已经购买此课程/活动');
        res.redirect(303, '/items/'+ req.body.id);
      } else {
        next();
      }
    }
  );
};

function checkUniqueInCart(req, res, next) {
  helper.findUserItemInCart(req.user, req.item,
    function (err, data) {
      if (err) {
        req.errorHandle.dataBase(req, res);
      } else if (data) {
        req.flash('error','此课程/活动已经在您的购物车里');
        res.redirect(303, '/items/'+ req.body.id);
      } else {
        next();
      }
    }
  );
};

function checkAvailableAmount(req, res, next) {
  if (req.item.available_amount < 1) {
    req.flash('error','The class is full.');
    res.redirect(303, '/items/'+ req.body.id);
  } else {
    next();
  }
};


module.exports = function(app) {

  /**
   * GET cart's page
   */
  
  app.get('/carts', u.checkAuth,
    function (req, res, next) {
      helper.listItemsInCartByUser(req.user,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            req.itemsInCart = data;
            next();
          }
        }
      );
    },
    function (req, res) {
      res.render('cart', {itemsInCart: req.itemsInCart, account: req.user, message: req.flash('error') });
    }
  );


  /**
   * POST an item to add it into cart
   */
  
  app.post('/cart', u.checkAuth, checkItemExisted, checkUniqueBought, checkUniqueInCart,
    function (req, res) {
      dbapi.pInsert('orders_in_cart', ['user_id', 'item_id'], [req.user.id, req.item.id],
      /*dbapi.putData('INSERT INTO orders_in_cart ( user_id, item_id ) VALUES ( "' 
        + req.user.id + '", "' 
        + req.item.id + '" )',*/
        function (err) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            res.redirect(303, '/add-to-cart-success/' + req.item.id);
          }
        }
      );
    }
  );

  /**
   * GET a message for adding an item into cart successfully
   */

  app.get('/add-to-cart-success/:id', u.checkAuth,
    function (req, res) {
      res.render('addToCartSuccess', {id: req.params.id, account: req.user} );
    }
  );

  /**
   * DELETE an item from cart
   */

  app.delete('/cart/:id', u.checkAuth,
    function (req, res, next) {
      helper.findItemById(req.params.id,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (!data) {
            req.flash('error','此课程/活动不存在');
            res.redirect(303, '/carts');         
          } else {
            req.item = data;
            next();
          }
        }
      );
    },
    function (req, res, next) {
      /*dbapi.getData('*','orders_in_cart','orders_in_cart.item_id = "' + req.params.id 
        + '" AND orders_in_cart.user_id = "' + req.user.id + '"',*/
      helper.findUserItemInCart(req.user, req.item,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else if (!data) {
            req.flash('error','此课程/活动不在您的购物车里');
            res.redirect(303, '/carts');
          } else {
            next();
          }
        }
      );
    },
    function (req, res) {
      dbapi.pRemove('orders_in_cart', 'item_id = ? AND user_id = ?', [req.params.id, req.user.id],
      //dbapi.putData('DELETE FROM orders_in_cart WHERE item_id = "' + req.params.id + '" AND user_id = "' + req.user.id + '"',
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            res.redirect(303, '/carts');
          }
        }
      );
    }
  );

  /**
   * POST an item to buy directly
   */

  app.post('/buy',u.checkAuth, checkItemExisted, checkUniqueBought, checkUniqueInCart, checkAvailableAmount,
    function (req, res, next) {
      dbapi.pInsert('orders', ['user_id', 'item_id'], [req.user.id, req.item.id],
      //dbapi.putData('INSERT INTO orders ( user_id, item_id ) VALUES ( "' + req.user.id + '", "' + req.item.id + '" )',
        function (err) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            next();
          }
        }
      );
    },
    function (req, res, next) {
      dbapi.pUpdate('items', ['available_amount'], 'id = ?', [req.item.available_amount - 1, req.item.id],
      //dbapi.putData('UPDATE items SET available_amount = "' + (req.item.available_amount - 1) + '" WHERE id = "' + req.item.id + '"',
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
      res.redirect('/check-out-success');
    }
  );

  /**
   * POST to check out
   */

  app.post('/check-out', u.checkAuth,
    function (req, res, next) {
      helper.listItemsInCartByUser(req.user,
        function (err, data) {
          if (err) {
            req.errorHandle.dataBase(req, res);
          } else {
            req.itemsInCart = data;
            if (req.itemsInCart.length < 1 )
            {
              req.flash('error','您的购物车为空');
              res.redirect(303, '/carts');
            } else {
              next();
            }
          }
        }
      );
    },
    function (req, res, next) {
      var failure_flag = false;
      var len = req.itemsInCart.length;
      var i;
      for (i = 0; i < len; i++) {
        if (req.itemsInCart[i].available_amount < 1) {
          req.itemsInCart[i].failure = '此课程/活动人数已满';
          failure_flag = true;
        }
      }
      if (failure_flag) {
        res.render('cart', {itemsInCart: req.itemsInCart, account: req.user});
      } else {
        next();
      }
    },
    function (req, res, next) {
      var err_flag = false;
      var finish = 0;
      var len = req.itemsInCart.length;
      function check_insert(item) {
        dbapi.pInsert('orders', ['user_id', 'item_id'], [req.user.id, item.id],
        //dbapi.putData('INSERT INTO orders ( user_id, item_id ) VALUES ( "' + req.user.id + '", "' + item.id + '" )',
          function (err) {
            if (err) {
              if (!err_flag) {
                req.errorHandle.dataBase(req, res);
              }
              err_flag = true;
            } else {
              finish++;
              if (finish >= len) {
                next();
              }
            }
          }
        );
      }
      for (var i = 0; i < len; i++) {
        check_insert(req.itemsInCart[i]);
      }
    },
    function (req, res, next) {
      var err_flag = false;
      var finish = 0;
      var len = req.itemsInCart.length;
      function check_update(item) {
        dbapi.pUpdate('items', ['available_amount'], 'id = ?', [item.available_amount - 1, item.id],
        //dbapi.putData('UPDATE items SET available_amount = "' + (item.available_amount - 1) + '" WHERE id = "' + item.id + '"',
          function (err) {
            if (err) {
              if (!err_flag) {
                req.errorHandle.dataBase(req, res);
              }
              err_flag = true;
            } else {
              finish++;
              if (finish >= len) {
                next();
              }
            }
          }
        );
      }
      for (var i = 0; i < len; i++) {
        check_update(req.itemsInCart[i]);
      }
    },
    function (req, res ,next) {
      dbapi.pRemove('orders_in_cart', 'user_id = ?', [req.user.id],
      //dbapi.putData('DELETE FROM orders_in_cart WHERE user_id = "' + req.user.id + '"',
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
      res.redirect('/check-out-success');
    }
  );

  /**
   * GET a message for checking out successfully
  */

  app.get('/check-out-success', u.checkAuth,
    function (req, res) {
      res.render('checkOutSuccess', {account: req.user});
    }
  );
}
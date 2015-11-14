var bcrypt = require('bcrypt');

function chooseValue(first, second) {
  if (!first) {
    return first;
  } else {
    return second;
  }
}

function u2s(str) {
  if (typeof str === 'undefined'){
    return '';
  } else {
    return str;
  }
}

function queryCallback(errorHandle, req, res) {
  return function (err, data) {
    if (err) {
      errorHandle(req, res);
      return null;
    } else {
      return data;
    }
  }
}

function checkPassword(user, password) {
  if (((password === '') || (user.password !== password)) && (!bcrypt.compareSync(password, user.bcrypt))) {
    return false;
  } else {
    return true;
  }
}

function createRandomPassword() {
  var passLength = 6;
  var text = "";
  var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
  for( var i=0; i < passLength; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

function bcryptPassword(password) {
  var result = bcrypt.hashSync(password, 6);
  return result;
}

/**
 * If the user has not log in, it will redirect to the page to log in
 */
function checkAuth(req, res, next) {
  if (req.isAuthenticated()) { 
    next();
  } else {
    res.redirect(303, '/login');
  }
}

/**
 * If the user is not a teacher, it will redirect to the forbidden page
 */

function checkTeacher(req, res, next) {
  if (req.isAuthenticated() && (req.user.groupname === 'teacher')) {
    next();
  } else {
    req.errorHandle.forbidden(req, res);  
  }
}

module.exports = {
  chooseValue: chooseValue,
  u2s: u2s,
  qC: queryCallback,
  checkPassword: checkPassword,
  bcryptPassword: bcryptPassword,
  checkAuth: checkAuth,
  checkTeacher: checkTeacher
};
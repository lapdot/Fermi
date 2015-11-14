/*var denodeify = require('bluebird').promisify;*/

var denodeify = require('q').denodeify;

function begin() {
  return denodeify(function (callback) {
    callback(null);
  });
}

function expand(state, fn) {
  return state.spread(denodeify(fn));
}

module.exports = {
  begin: begin,
  expand: expand
}
var nohm = require('nohm').Nohm;

function loadModelError(msg, code){
  this.name = 'loadModelError';
  if (typeof(msg) === 'string') {
    this.message = msg;
  } else {
    this.data = msg;
    this.message = 'custom';
  }
  this.code = code || 500;
  Error.call(this, msg);
}

loadModelError.prototype.__proto__ = Error.prototype;

module.exports = function loadModel(model_name, param_name, do_string_search) {
  param_name = param_name || 'id';
  return function (req, res, next){
    var id = req.param(param_name);
    var model = nohm.factory(model_name);
    if ( ! req.loaded) {
      req.loaded = {};
    }
    var _load = function (id) {
      model.load(id, function (err) {
        if (err) {
          next(new loadModelError('not_found', 404));
        } else {
          req.loaded[model_name] = model;
          next();
        }
      });
    };
    
    if (id && !do_string_search) {
      _load(id);
    } else if (id && do_string_search) {
      model.find({name:id}, function (err, ids) {
        if (err || ids.length === 0) {
          next(new loadModelError('not_found', 404));
        } else if (ids.length > 1) {
          next(new loadModelError('multiple_matches', 400));
        } else {
          _load(ids[0]);
        }
      });
    } else {
      next(new loadModelError('needs_id_param', 400));
    }
  }
};
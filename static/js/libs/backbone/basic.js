  
Backbone.Events.once = function (event, fn) {
  var self = this;
  var wrap = function () {
    Backbone.Events.unbind.call(self, event, wrap);
    fn.apply(this, Array.prototype.slice.call(arguments, 0));
  };
  
  Backbone.Events.bind.call(this, event, wrap);
};

_r(function (app) {
  _.extend(app, Backbone.Events);
});
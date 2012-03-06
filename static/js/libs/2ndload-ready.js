(function () {
  var needed_done = {};
  var go_when_needed_done = false;
  function checkNeededDone () {
    return _.all(needed_done, function (value) {
      return !!value;
    });
  };
  window._r = function (fn, unshift) {
    if(fn === true && checkNeededDone()) {
      $(function () {
        $.each(_r.fns, function (id, fnn) {
          fnn(window.app);
        });
        _r.done = true;
      });
      return true;
    } else if (fn === true) {
      go_when_needed_done = true;
      return true;
    }
    
    if (typeof(fn) === 'string') {
      if (unshift === true) {
        needed_done[fn] = true;
        if (go_when_needed_done && checkNeededDone()) {
          _r(true);
        }
      } else {
        needed_done[fn] = false;
      }
      return true;
    }
    
    if (typeof(_r.done) !== 'undefined')
      return fn(window.app);
    
    if (typeof(_r.fns) === 'undefined') {
      _r.fns = [fn];
    } else if (unshift) {
      _r.fns.unshift(fn);
    } else {
      _r.fns.push(fn);
    }
  }
})();

if (typeof(console) === 'undefined') {
  var noop = function () {};
  window.console = {
    log: noop,
    dir: noop
  };
}
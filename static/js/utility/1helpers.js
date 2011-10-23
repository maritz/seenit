(function () {
  var needed_done = {};
  function checkNeededDone () {
    return _.all(needed_done, function (value) {
      return !!value;
    });
  };
  window._r = function (fn, unshift) {
    if(fn === true) {
      $(function () {
        $.each(_r.fns, function (id, fnn) {
          fnn();
        });
        _r.done = true;
      });
      return true;
    }
    
    if (typeof(fn) === 'string') {
      if (unshift === true) {
        needed_done[fn] = true;
        checkNeededDone();
      } else {
        needed_done[fn] = false;
      }
      return true;
    }
    
    if (typeof(_r.done) !== 'undefined')
      return fn();
    
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

// this fixes the case where backbone does a GET request with Content-Type: application/json with no body// Map from CRUD to HTTP for our default `Backbone.sync` implementation.

Backbone.sync = function(method, model, success, error) {
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read'  : 'GET'
  };
  var type = methodMap[method];
  
  // Helper function to get a URL from a Model or Collection as a property
  // or as a function.
  var getUrl = function(object) {
    if (!(object && object.url)) throw new Error("A 'url' property or function must be specified");
    return _.isFunction(object.url) ? object.url() : object.url;
  };

  // Default JSON-request options.
  var params = {
    url:          getUrl(model),
    type:         type,
    dataType:     'json',
    processData:  false,
    success:      success,
    error:        error
  };
  
  // Ensure that we have the appropriate request data.
  if (!params.data && model && (method == 'create' || method == 'update')) {
    params.contentType = 'application/json';
    params.data = JSON.stringify(model.toJSON());
  }

  // For older servers, emulate JSON by encoding the request into an HTML-form.
  if (Backbone.emulateJSON) {
    params.contentType = 'application/x-www-form-urlencoded';
    params.processData = true;
    params.data        = modelJSON ? {model : modelJSON} : {};
  }

  // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
  // And an `X-HTTP-Method-Override` header.
  if (Backbone.emulateHTTP) {
    if (type === 'PUT' || type === 'DELETE') {
      if (Backbone.emulateJSON) params.data._method = type;
      params.type = 'POST';
      params.beforeSend = function(xhr) {
        xhr.setRequestHeader("X-HTTP-Method-Override", type);
      };
    }
  }

  // Make the request.
  $.ajax(params);
};
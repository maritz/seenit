(function () {
  Backbone.Events.once = function (event, fn) {
    var self = this;
    var wrap = function () {
      Backbone.Events.unbind.call(self, event, wrap);
      fn.apply(this, Array.prototype.slice.call(arguments, 0));
    };
    
    Backbone.Events.bind.call(this, event, wrap);
  };
  
  // Helper function to get a URL from a Model or Collection as a property
  // or as a function.
  var getUrl = function(object) {
    if (!(object && object.url)) return null;
    return _.isFunction(object.url) ? object.url() : object.url;
  };
  
  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read'  : 'GET'
  };
  // Overwriting this to make sure the csrf token is included.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];
  
    // Default JSON-request options.
    var params = _.extend({
      type:         type,
      dataType:     'json'
    }, options);
  
    // Ensure that we have a URL.
    if (!params.url) {
      params.url = getUrl(model) || urlError();
    }
  
    // Ensure that we have the appropriate request data.
    if (!params.data && model && (method == 'create' || method == 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }
  
    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data        = params.data ? {model : params.data} : {};
    }
  
    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
      if (type === 'PUT' || type === 'DELETE') {
        if (Backbone.emulateJSON) params.data._method = type;
        params.type = 'POST';
        params.beforeSend = function(xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
        };
      }
    }
  
    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
      params.processData = false;
    }
    
    if (options.noCsrf !== true && method !== 'read') {
      app.getCsrf(function (token) {
        params.url += '?_csrf='+encodeURIComponent(token);
        // Make the request.
        return $.ajax(params);
      });
    } else {
      // Make the request.
      return $.ajax(params);
    }
  };
  
  _r(function (app) {
    _.extend(app, Backbone.Events);
  });
})()  
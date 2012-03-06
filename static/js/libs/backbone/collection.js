_r(function (app) {
  app.base.collection = Backbone.Collection.extend({
    
    /**
     * Overwriting Backbone.Collection.parse() to use the proper root in the response json.
     */
    parse: function (response) {
      return response.data ? response.data : [];
    },
    
    /**
     * Proxy fetch to accept one argument as a callback for success and options.
     */
    fetch: function (options) {
      if (typeof(options) === 'function') {
        options = {
          success: options,
          error: options
        };
      }
      return Backbone.Collection.prototype.fetch.call(this, options);
    }
  });
});
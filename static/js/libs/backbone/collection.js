_r(function (app) {
  
  _.extend(Backbone.Collection.prototype, Backbone.Events);
  
  app.base.collection = Backbone.Collection.extend({
    
    pages: {},
    
    /**
     * Overwriting Backbone.Collection.parse() to use the proper root in the response json and allow pagination metadata to be parsed.
     */
    parse: function (response) {
      if (response.data) {
        return response.data;
      } else {
        console.log('Collection parse did not get proper response:', response);
        return [];
      }
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
  
  /**
   * A collection that tries to automatically paginate the records and 
   */
  app.base.paginatedCollection = app.base.collection.extend({  
    
    pagination_by_field: false,
      
    initialize: function () {
      this.paginated = true;
      this.total = 0;
      this.per_page = 0;
      this.all_loaded = false;
      this.pages_loaded = [];
    },
    
    /**
     * Proxy fetch only use  options.
     */
    fetch: function (options) {
      if (this.pages_loaded.length > 0) {
        options.add = true;
      }
      return app.base.collection.prototype.fetch.call(this, options);
    },
    
    /**
     * Overwriting Backbone.Collection.parse() to use the proper root in the response json and allow pagination metadata to be parsed.
     */
    parse: function (response) {
      if (response.data) {
        if (response.data.collection) {
          this.per_page = response.data.per_page;
          this.total = response.data.total;
          
          if (response.data.collection.length === this.total) {
            this.all_loaded = true;
          }
          return response.data.collection;
        } else {
          return response.data;
        }
      } else {
        console.log('Collection parse did not get proper response:', response);
        return [];
      }
    },
    
    /**
     * Returns a copied part of this collection (page) based on a zero-based offset.
     * Whether a record is part of this page is determined either by index (from insertion - very unreliable) or
     * by calling a function on each that checks if the value of this.pagination_by_field is in the page parameters.
     */
    getLoadedPage: function (offset) {
      var self = this;
      var max = offset+this.per_page;
      var collection = new app.base.collection();
      collection.paginated = true;
      if (self.pagination_by_field) {
        collection.reset(this.filter(function (episode) {
          var num = episode.get(self.pagination_by_field);
          return num > offset && num <= max;
        }));
      } else {
        collection.reset(this.models.slice(offset, max));
      }
      return collection;
    },
    
    /**
     * Get the offset for a page
     */
    getPageOffset: function (page) {
      if (this.per_page*page > this.total) {
        page = Math.ceil(this.total / this.per_page);
      }
      return Math.floor(this.per_page * (page-1));
    },
    
    /**
     *  Get a specific page either from the loaded data or fetch it from the server.
     */
    getPage: function (page, callback) {
      var self = this;
      var offset = this.getPageOffset(page);
      
      if (this.all_loaded || this.pages_loaded.indexOf(page) !== -1) {
        return callback(this.getLoadedPage(offset), page);
      }
      
      if (this.loading_page) {
        var args = _.toArray(arguments);
        this.once('page_loaded', function () {
          self.getPage.apply(self, args);
        });
        return false;
      }
      this.loading_page = page;
      
      var url = getUrl(this);
      url += url.indexOf('?') === -1 ? '?' : '&';
      url += 'offset='+offset;
      this.fetch({
        add: true,
        url: url,
        success: function () {
          self.pages_loaded.push(page);
          callback(self.getLoadedPage(self.getPageOffset(page)), page);
          self.loading_page = false;
          self.trigger('page_loaded', page);
        }
      })
    }
  });
  
  
  // this is directly copied from backbone.js
  // Helper function to get a URL from a Model or Collection as a property
  // or as a function.
  var getUrl = function(object) {
    if (!(object && object.url)) return null;
    return _.isFunction(object.url) ? object.url() : object.url;
  };
});
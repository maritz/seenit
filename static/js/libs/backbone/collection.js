_r(function (app) {
  
  _.extend(Backbone.Collection.prototype, Backbone.Events);
  
  app.base.collection = Backbone.Collection.extend({
    
    paginated: false,
    total: 0,
    per_page: 0,
    all_loaded: false,
    pagination_by_field: 'id',
    pages_loaded: [],
    
    /**
     * Overwriting Backbone.Collection.parse() to use the proper root in the response json and allow pagination metadata to be parsed.
     */
    parse: function (response) {
      if (response.data) {
        if (response.data.collection) {
          this.per_page = response.data.per_page;
          this.total = response.data.total;
          
          if (this.total > this.per_page && !this.paginated) {
            this.pages_loaded.push(1);
            this.paginated = true;
          }
          
          if (this.length === this.total) {
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
     * Proxy fetch to accept one argument as a callback for success and options.
     */
    fetch: function (options) {
      if (typeof(options) === 'function') {
        options = {
          success: options,
          error: options
        };
      }
      if (this.paginated) {
        options.add = true;
      }
      return Backbone.Collection.prototype.fetch.call(this, options);
    },
    
    _getLoadedPage: function (offset) {
      var self = this;
      var max = offset+this.per_page;
      return this.filter(function (episode) {
        var num = episode.get(self.pagination_by_field);
        return num > offset && num <= max;
      });
    },
    
    getPage: function (page, callback) {
      var self = this;
      var offset;
      
      if (this.per_page*page > this.total) {
        page = Math.ceil(this.total / this.per_page);
      }
      offset = Math.floor(this.per_page * (page-1));
      
      if (this.pages_loaded.indexOf(page) !== -1) {
        return callback(this._getLoadedPage(offset), page);
      }
      
      if (this.loading_page) {
        var args = _.toArray(arguments);
        this.once('page_loaded', function () {
          self.getPage.apply(self, args);
        });
        return false;
      }
      this.loading_page = true;
      
      var url = getUrl(this);
      url += url.indexOf('?') === -1 ? '?' : '&';
      url += 'offset='+offset;
      this.fetch({
        add: true,
        url: url,
        success: function () {
          self.pages_loaded.push(page);
          callback(self._getLoadedPage(offset), page);
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
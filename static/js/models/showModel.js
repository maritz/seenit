_r(function (app) {
  
  app.models.Show = app.base.model.extend({
    urlRoot: '/REST/Show/',
    nohmName: 'Show',
    
    _followRequest: function (bool) {
      var self = this;
      var action = bool ? 'follow' : 'unfollow';
      app.getCsrf(function (csrf) {
        $.ajax(self.urlRoot+action+'/'+self.id, {
          type: 'PUT',
          dataType: 'json',
          data: {
            _csrf: csrf
          }
        }).success(function () {
          self.set({
            following: bool
          });
        });
      });
    },
    
    setFollow: function () {
      this._followRequest(true);
    },
    
    unsetFollow: function () {
      this._followRequest(false);
    },
    
    update: function (options) {
      var self = this;
      app.getCsrf(function (csrf) {
        $.ajax(self.urlRoot+'update/'+self.id, {
          type: 'GET',
          dataType: 'json',
          data: {
            _csrf: csrf
          }
        }).success(function () {
          if (typeof options.success === 'function') {
            options.success();
          }
        });
      });
    }
  });
  
  app.models.ShowSearch = app.base.model.extend({
    urlRoot: '/REST/Show/search/',
    url: function () {
      return this.urlRoot+this.get('name');
    },
    
    nohmName: 'Show',
    
    setOwn: function () {
      this.urlRoot = '/REST/Show/search/';
    },
    
    setTVDB: function () {
      this.urlRoot = '/REST/Show/searchTVDB/';
    },
    
    save: function (attrs, options) {
      var self = this;
      var collection = new app.collections.ShowSearch();
      collection.fetch({
        url: this.url(),
        success: function () {
          self.trigger('success', self, collection);
          if (typeof(options.success) === 'function') {
            options.success(self);
          }
        },
        error: function (model, resp, options) {
          resp.handled = true;
          try {
            var json = $.parseJSON(resp.responseText);
            self.trigger('error', model, {
              general: json.data.error.msg
            });
            if (typeof(options.error) === 'function') {
              options.error(self, resp);
            }
          } catch(e) {
            self.trigger('error', model, {
              general: resp.status+': '+resp.statusText
            });
          }
        }
      });
    }
    
  });
  
});
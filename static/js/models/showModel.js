_r(function (app) {
  
  app.models.Show = app.base.model.extend({
    urlRoot: '/REST/Show/',
    nohmName: 'Show'
  });
  
  app.models.ShowSearch = app.base.model.extend({
    urlRoot: '/REST/Show/checkname?name=',
    url: function () {
      return this.urlRoot+this.get('name');
    },
    
    nohmName: 'Show',
    
    save: function (attrs, options) {
      var self = this;
      var collection = new app.collections.ShowSearch();
      collection.fetch({
        url: this.url(),
        success: function () {
          self.trigger('success', self, collection);
        },
        error: function (model, resp, options) {
          resp.handled = true;
          try {
            var json = $.parseJSON(resp.responseText);
            self.trigger('error', model, {
              general: json.data.error.msg
            });
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
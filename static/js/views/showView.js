_r(function (app) {
  app.views.show = {};
  
  var isLoggedIn = function () {
    return app.user_self.get('name');
  }
  
  /**
   * #/show/index
   */
  app.views.show.index = app.base.listView.extend({
    
    collection: app.collections.Show,
    auto_render: true,
    reload_on_login: true,
    checkAllowed: isLoggedIn
    
  });
  
  /**
   * #/show/search
   */
  app.views.show.search = app.base.formView.extend({
    
    auto_render: true,
    model: app.models.ShowSearch,
    checkAllowed: isLoggedIn,
    reload_on_login: true,
    
    init: function () {
      var self = this;
      self.$el.delegate('ul.show_search_results li', 'click', function () {
        var id = $(this).data('id');
        app.go('show/import/'+id);
      });
      this.model.bind('success', function (model, collection) {
        self.addLocals({collection: collection});
        app.template(self.module, 'search_result_line', self.locals, function (html) {
          self.$el.find('ul').html(html);
        });
      });
    },
    
    error: function (arg1, arg2) {
      console.log('error', arg1, arg2);
    }
    
  });
  
});
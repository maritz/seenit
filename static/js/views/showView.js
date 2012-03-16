_r(function (app) {
  app.views.show = {};
  
  var isLoggedIn = function () {
    return app.user_self.get('name');
  }
  
  /**
   * #show/index
   */
  app.views.show.index = app.base.listView.extend({
    
    collection: app.collections.Show,
    auto_render: true,
    reload_on_login: true
    
  });
  
  /**
   * #show/details
   */
  app.views.show.details = app.base.pageView.extend({
    
    auto_render: true,
    model: app.models.Show,
    required_params: 1,
    
    events: {
      'click a.season_opener': 'toggleSeason',
      'click a.episode_opener': 'toggleEpisode'
    },
    
    load: function (callback) {
      var model = this.model;
      $.getJSON('/REST/Show/view/'+this.params[0], function (data) {
        model.set(data.data);
        callback(null, model);
      }).error(function () {
        callback('not_found');
      });
    },
    
    toggleSeason: function (e) {
      var self = this;
      var $target = $(e.target);
      var episode_list = $target.siblings('ul.episode_list');
      var num = $target.data('num');
      
      if (episode_list.children().length > 0) {
        episode_list.toggle();
      } else {
        $.getJSON('/REST/Episode/byShow/'+self.model.get('id'), {
          season: num
        }, function (resp) {
          var episodes = resp.data;
          episodes.sort(function (a, b) {
            if (a.number > b.number) {
              return 1;
            } else {
              return -1;
            }
          });
          var locals = _.extend({episodes: episodes}, self.locals);
          app.template(self.module, 'episode_list', locals, function (html) {
            episode_list.html(html);
          });
        });
      }
    },
    
    toggleEpisode: function (e) {
      var $target = $(e.target);
      var $ul = $target.nextAll('dl');
      $ul.toggleClass('hidden');
    }
    
  });
  
  /**
   * #show/search
   */
  app.views.show.search = app.base.formView.extend({
    
    auto_render: true,
    model: app.models.ShowSearch,
    checkAllowed: isLoggedIn,
    reload_on_login: true,
    
    events: {
      'click ul.show_search li.result': 'goToImport'
    },
    
    init: function () {
      var self = this;
      this.model.bind('success', function (model, collection) {
        self.addLocals({collection: collection});
        app.template(self.module, 'search_result_line', self.locals, function (html) {
          self.$el.find('ul').html(html);
        });
      });
    },
    
    goToImport: function (e) {
      var id = $(e.target).data('id');
      app.go('show/import/'+id);
    },
    
    error: function (arg1, arg2) {
      console.log('error', arg1, arg2);
    }
    
  });
  
  /**
   * #show/import/:id
   */
  app.views.show["import"] = app.base.pageView.extend({
     
    auto_render: true,
    checkAllowed: isLoggedIn,
    reload_on_login: true,
    
    init: function() {
      var self = this;
      $.getJSON('/REST/Show/import/' + this.params[0], function(resp) {
        app.go('show/details/'+resp.data);
      }).error(function () {
        app.template(self.module, 'import_failed', {}, function (html) {
          self.$el.html(html);
        });
      });
    }
    
  });
  
});
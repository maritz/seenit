_r(function (app) {
  app.views.show = {};
  
  var isLoggedIn = function () {
    return app.user_self.get('name');
  }
  
  /**
   * #show/index
   */
  app.views.show.index = app.base.paginatedListView.extend({
    
    collection: app.collections.Show,
    auto_render: true
    
  });
  
  /**
   * #show/details
   */
  app.views.show.details = app.base.pageView.extend({
    
    auto_render: true,
    model: app.models.Show,
    required_params: 1,
    
    events: {
      'show a[data-toggle="tab"]': 'loadSeason',
      'click .update': 'update',
      'click .following a.set_follow': 'setFollow',
      'click .following a.unset_follow': 'unsetFollow',
      'click .following a.explain': 'openExplain'
    },
    
    init: function () {
      var self = this;
      
      this.seasons = {};
      
      this.season_selected = this.params[1] || null;
      this.bind('rendered', function () {
        if (this.season_selected) {
          var $season_opener = self.$el.find('a.season_opener[data-num="'+this.season_selected+'"]');
          if ($season_opener) {
            $season_opener.click();
          }
        }
      });
      this.model.bind('change:following', function () {
        self.redrawFollowButton();
      });
    },
    
    load: function (callback) {
      var model = this.model;
      $.getJSON('/REST/Show/view/'+this.params[0], function (data) {
        
        data.data.seasons = _.sortBy(data.data.seasons, function (season) { return parseInt(season, 10); });
        model.set(data.data);
        
        callback(null, model);
      }).error(function () {
        callback('not_found');
      });
    },
    
    loadSeason: function (e) {
      e.preventDefault();
      var self = this;
      var $target = $(e.target);
      var num = this.season_selected = $target.data('num');
      var $episode_list = $('#season_contents div.tab-pane[data-num="'+num+'"]');
      
      var new_hash = '#show/details/'+this.model.get('id')+'/'+num;
      if ( ! window.location.hash.match(new RegExp('^'+new_hash, 'i'))) {
        app.navigate(new_hash);
      }
      
      if ( ! this.seasons.hasOwnProperty(num)) {
        this.seasons[num] = new app.views.episode_list_view(
          'episode',
          'list',
          $episode_list,
          [self.model.get('id'), num, self.model.get('name'), self]);
      } else {
        this.seasons[num].render();
      }
    },
    
    update: function (e) {
      e.preventDefault();
      var self = this;
      var $update = this.$el.find('a.update');
      $update.addClass('animate');
      this.model.update({
        success: function () {
          self.seasons = {};
          self.render();
        }
      });
    },
    
    redrawFollowButton: function () {
      var $button = this.$el.find('li.following');
      var locals = _.extend({}, this.locals, {
        show: this.model
      });
      app.template(this.module, 'follow_button', locals, function (html) {
        $button.html(html);
      });
    },
    
    setFollow: function (e) {
      e.preventDefault();
      this.model.setFollow();
    },
    
    unsetFollow: function (e) {
      e.preventDefault();
      this.model.unsetFollow();
    },
    
    openExplain: function (e) {
      e.preventDefault();
    }
    
  });
  
  
  /**
   * #show/search
   */
  app.views.show.search = app.base.formView.extend({
    
    auto_render: true,
    model: app.models.ShowSearch,
    
    events: {
      'click #cant_find_show_content button': 'searchImport'
    },
    
    init: function () {
      var self = this;
      
      this.once('rendered', function () {
        this.$search_name = this.$el.find('input[name="name"]');
        if (this.params[0]) {
          this.$search_name.val(this.params[0]);
          this.$el.find('form').submit();
        }
      });
      
      this.model.bind('success', function (model, collection) {
        self.showResults(collection);
        app.navigate('#show/search/'+model.get('name'));
      });
    },
    
    showResults: function (collection) {
      var self = this;
      
      if (collection.length === 0) {
        this.$el.find('.tvdb_import_controls button').click();
      } else {
        this.$el.find('#cant_find_show').removeClass('hidden');
        this.addLocals({collection: collection});
        app.template(this.module, 'search_result', this.locals, function (html) {
          self.$el.find('ul').html(html);
        });
      }
    },
    
    searchImport: function (e) {
      e.preventDefault();
      app.go('#show/search_tvdb/'+this.model.get('name'));
    },
    
    error: function (arg1, arg2) {
      console.log('error', arg1, arg2);
    }
    
  });
  
  
  /**
   * #show/search_tvdb
   */
  app.views.show.search_tvdb = app.base.formView.extend({
    
    auto_render: true,
    model: app.models.ShowSearch,
    
    events: {
      'click ul.show_search li.import': 'doImport'
    },
    
    init: function () {
      var self = this;
      
      this.model.setTVDB();
      this.search_results = new app.base.collection();
      
      this.once('rendered', function () {
        this.$search_name = this.$el.find('input[name="name"]');
        if (this.params[0]) {
          this.$search_name.val(this.params[0]);
          this.$el.find('form').submit();
        }
      });
      
      this.model.bind('success', function (model, collection) {
        self.showResults(collection);
        app.navigate('#show/search_tvdb/'+model.get('name'));
      });
    },
    
    showResults: function (collection) {
      var self = this;
      
      this.search_results = collection;
      this.$el.find('#cant_find_show').removeClass('hidden');
      this.addLocals({collection: collection});
      app.template(this.module, 'search_result', this.locals, function (html) {
        self.$el.find('ul').html(html);
      });
    },
    
    doImport: function (e) {
      e.preventDefault();
      var id = $(e.target).closest('li.import').data('id');
      var self = this;
      var model = this.search_results.get(id);
        
      if (model) {
        app.overlay({
          view: 'confirm_import',
          locals: {
            show: model
          },
          confirm: function () {
            app.template(self.module, 'import', {name: self.$search_name.val()}, function (html) {
              self.$el.html(html);
              $.getJSON('/REST/Show/import/' + id, function(resp) {
                app.go('show/details/'+resp.data);
              }).error(function () {
                app.template(self.module, 'import_failed', {}, function (html) {
                  self.$el.html(html);
                });
              });
            });
          }
        });
      }
    }
    
  });
  
  
  /**
   * #show/today
   */
  app.views.show.today = app.base.paginatedListView.extend({
    
    collection: app.collections.EpisodesToday,
    auto_render: true,
    
    successRender: function () {
      // HACK
      // we want the view to re-use the episode templates but want this view to be part of show (for the subnavigation)
      // this is the easiest way and also means the template for this is actually in tmpl-episode.html, not tmpl-show.html
      this.module = 'episode';
      app.base.paginatedListView.prototype.successRender.apply(this, Array.prototype.slice.apply(arguments));
    }
    
  });
  
  
  /**
   * #show/nextUp
   */
  app.views.show.next_up = app.base.paginatedListView.extend({
    
    collection: app.collections.EpisodesNextUp,
    auto_render: true,
    
    events: {
      'click .episode_seen_button a.set_seen': 'toggleEpisodeSeen'
    },
    
    init: function () {
      this.collection.bind('reset', this.render);
    },
    
    successRender: function () {
      // HACK
      // we want the view to re-use the episode templates but want this view to be part of show (for the subnavigation)
      // this is the easiest way and also means the template for this is actually in tmpl-episode.html, not tmpl-show.html
      this.module = 'episode';
      app.base.paginatedListView.prototype.successRender.apply(this, Array.prototype.slice.apply(arguments));
    },
    
    toggleEpisodeSeen: function (e) {
      var self = this;
      e.preventDefault();
      var $container = $(e.target).closest('li.episode_detail');
      var id = $container.data('id');
      var episode = this.collection.get(id);
      
      $container.fadeOut(function () {
        $container.remove();
      });
      episode.toggleSeen(function () {
        Backbone.Collection.prototype.fetch.call(self.collection); // paginated fetch is .add only, which doesn't work in this case.
      });
    }
    
  });
  
  
  /**
   * #show/following
   */
  app.views.show.following = app.base.paginatedListView.extend({
    
    collection: app.collections.ShowFollowing,
    auto_render: true
    
  });
  
});
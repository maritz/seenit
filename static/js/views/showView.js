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
      'click .following a.set_follow': 'setFollow',
      'click .following a.unset_follow': 'unsetFollow',
      'click .following a.explain': 'openExplain'
    },
    
    init: function () {
      var self = this;
      
      this.seasons = {};
      
      if (this.params[1]) {
        this.once('rendered', function () {
          var $season_opener = self.$el.find('a.season_opener[data-num="'+self.params[1]+'"]');
          if ($season_opener) {
            $season_opener.click();
          }
        });
      }
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
      var num = $target.data('num');
      var $episode_list = $('#season_contents div.tab-pane[data-num="'+num+'"]');
      
      var new_hash = '#show/details/'+this.model.get('name')+'/'+num;
      if ( ! window.location.hash.match(new RegExp('^'+new_hash, 'i'))) {
        app.navigate(new_hash);
      }
      
      if ( ! this.seasons.hasOwnProperty(num)) {
        this.seasons[num] = new episode_list_view(
          'show', 
          'episode_list', 
          $episode_list, 
          [self.model.get('id'), num]);
      } else {
        this.seasons[num].render();
      }
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
   * List of episodes in a season
   */
  var episode_list_view = app.base.paginatedListView.extend({
    
    collection: app.collections.Season,
    auto_render: true,
    
    events: {
      'click a.episode_opener': 'toggleEpisode',
      'click .episode_seen_button a.set_seen, .episode_seen_button a.set_not_seen': 'toggleEpisodeSeen',
      'click .season_seen_button a.set_seen, .season_seen_button a.set_not_seen': 'toggleSeasonSeen',
      'click .season_seen_button a.get_links': 'toggleSeasonSeen'
    },
    
    init: function() {
      var self = this;
      this.collection.id = this.params[0];
      this.collection.season = this.params[1];
      
      this.collection.bind('change:seen', function (episode) {
        self.redrawEpisodeSeenButton(episode);
        self.redrawSeasonSeenButtons();
      });
    },
    
    toggleEpisode: function (e) {
      e.preventDefault();
      var $target = $(e.target);
      var $toggle_content = $target.nextAll('.episode_details');
      var text = $toggle_content.hasClass('hidden') ? 'less' : 'more';
      $target.text(this._t(text));
      $toggle_content.toggleClass('hidden');
    },
    
    toggleEpisodeSeen: function (e) {
      e.preventDefault();
      var $target = $(e.target);
      var id = $target.closest('li.episode_detail').data('id');
      var episode = this.collection.get(id);
      
      episode.toggleSeen();
    },
    
    redrawEpisodeSeenButton: function (episode) {
      var $el = this.$el.find('ul.episode_list > li[data-id="'+episode.id+'"] div.episode_seen_container');
      var locals = _.extend({}, this.locals, {
        episode: episode
      });
      app.template('show', 'episode_seen_button', locals, function (html) {
        $el.html(html);
      });
    },
    
    redrawSeasonSeenButtons: function () {
      var $seen_container = this.$el.find('div.season_seen_container');
      app.template('show', 'season_seen_button', this.locals, function (html) {
        $seen_container.html(html);
      });
    },
    
    toggleSeasonSeen: function (e) {
      e.preventDefault();      
      this.collection.toggleSeen();
    }
    
  });
  
  
  /**
   * #show/search
   */
  app.views.show.search = app.base.formView.extend({
    
    auto_render: true,
    model: app.models.ShowSearch,
    checkAllowed: isLoggedIn,
    
    events: {
      'click #cant_find_show_content button': 'searchImport',
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
    checkAllowed: isLoggedIn,
    
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
  
});
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
    auto_render: true
    
  });
  
  /**
   * #show/details
   */
  app.views.show.details = app.base.pageView.extend({
    
    auto_render: true,
    model: app.models.Show,
    required_params: 1,
    seasons: {},
    
    events: {
      'show a[data-toggle="tab"]': 'loadSeason'
    },
    
    init: function () {
      var self = this;
      if (this.params[1]) {
        this.once('rendered', function () {
          var $season_opener = self.$el.find('a.season_opener[data-num="'+self.params[1]+'"]');
          if ($season_opener) {
            $season_opener.click();
          }
        });
      }
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
      app.navigate('#show/details/'+this.model.get('name')+'/'+num);
      
      if ($episode_list.children(':not(.loading)').length === 0) {
        this.seasons[num] = new episode_list_view(
          'show', 
          'episode_list', 
          $episode_list, 
          [self.model.get('id'), num]);
      }
    }
    
  });
  
  var episode_list_view = app.base.listView.extend({
    
    collection: app.collections.Season,
    auto_render: true,
    
    events: {
      'click a.episode_opener': 'toggleEpisode',
      'click .episode_seen_button a.set_seen, .episode_seen_button a.set_not_seen': 'toggleEpisodeSeen',
      'click .season_seen_button a.set_seen, .season_seen_button a.set_not_seen': 'toggleSeasonSeen'
    },
    
    init: function() {
      var self = this;
      this.collection.url += 'byShow/'+this.params[0]+'?season='+this.params[1];
      
      this.collection.bind('change:seen', function (episode) {
        var $episode = self.$el.find('div.episode_seen_container')
          .eq(episode.collection.indexOf(episode));
        self.redrawEpisodeSeenButton($episode, episode);
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
    
    redrawEpisodeSeenButton: function ($el, episode) {
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
      'click ul.show_search li.result': 'doImport'
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
      self.addLocals({collection: collection});
      app.template(self.module, 'search_result_line', self.locals, function (html) {
        self.$el.find('ul').html(html);
      });
    },
    
    doImport: function (e) {
      var id = $(e.target).closest('li.result').data('id');
      var self = this;
      app.template(self.module, 'import', {name: this.$search_name.val()}, function (html) {
        self.$el.html(html);
        $.getJSON('/REST/Show/import/' + id, function(resp) {
          app.go('show/details/'+resp.data);
        }).error(function () {
          app.template(self.module, 'import_failed', {}, function (html) {
            self.$el.html(html);
          });
        });
      });
    },
    
    error: function (arg1, arg2) {
      console.log('error', arg1, arg2);
    }
    
  });
  
});
_r(function (app) {
  app.views.episode = {};
  
  /**
   * List of episodes in a season
   */
  app.views.episode_list_view = app.base.paginatedListView.extend({
    
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
      app.template('episode', 'episode_seen_button', locals, function (html) {
        $el.html(html);
      });
    },
    
    redrawSeasonSeenButtons: function () {
      var $seen_container = this.$el.find('div.season_seen_container');
      app.template('episode', 'season_seen_button', this.locals, function (html) {
        $seen_container.html(html);
      });
    },
    
    toggleSeasonSeen: function (e) {
      e.preventDefault();      
      this.collection.toggleSeen();
    }
    
  });
  
});
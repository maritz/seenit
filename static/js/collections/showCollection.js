_r(function (app) {

  app.collections.Show = app.base.collection.extend({
    model: app.models.Show,
    url: '/REST/Show/'
  });
  
  app.collections.ShowSearch = app.base.collection.extend({
    model: app.models.ShowSearch,
    url: '/REST/Show/checkname?asd'
  });
  
});
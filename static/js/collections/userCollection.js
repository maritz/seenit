_r(function (app) {

  app.collections.User = app.base.collection.extend({
    model: app.models.User,
    url: '/REST/User/'
  });
  
});
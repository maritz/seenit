(function (undefined) {
  var dataStore = window.sessionStorage;
  window.storage = {};
  window.storage.store = function (key, value) {
    try {
      localStorage[key] = escape(JSON.stringify(value));
    } catch(e) {
      console.log('failed to store data in the localStorage');
      console.dir(e);
      if (e.code == 22) { // local storage is full. this is only valid for chrome. ff throws 1014 and other brothers do other disappointing stuff.
        dataStore.clear();
      }
    }
  };
  
  window.storage.get = function (key, rethrow) {
    try {
      return JSON.parse(unescape(localStorage[key]));
    } catch(e) {
      console.log('failed parsing data from localStorage');
      console.dir(e);
      console.dir(key);
      localStorage.removeItem(key);
      if (rethrow) {
        throw e;
      }
      return null;
    }
  };
})();
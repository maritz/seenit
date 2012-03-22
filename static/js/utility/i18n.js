_r("i18n");

(function () {
  var store = window.storage;
  var i18n_options = {
    interpolationPrefix: '{',
    interpolationSuffix: '}',
    reusePrefix: "_(",
    setDollarT: false
  },
  lang = false;
  

  if (Modernizr.localstorage) {
    lang = store.get('lang'); // TODO: add youtube style question "do you want your local language?"
    if (!lang) {
      lang = 'en_US';
      store.store('lang', lang);
    }
  }
  
  var localDict = false
  , loadJSperanto = function (dict) {
    i18n_options.dictionary = dict;
    $.jsperanto.init(function(){
      _r("i18n", true);
    }, i18n_options);
  };
  
  jQuery.t = function(name, submodule, module) {
    module = module || 'generic';
    submodule = submodule || 'general';
    var values = [];
    if (_.isArray(name)) {
      values = name.slice(1);
      name = name[0];
    }
    var search_string = module+'.'+submodule+'.'+name;
    //console.log('looking for', search_string);
    var t = $.jsperanto.translate(search_string);
    if (t !== search_string) {
      if (values.length > 0) {
        return vsprintf(t, values);
      } else {
        return t;
      }
    } else {
      if (submodule !== 'general') {
        return arguments.callee(name, 'general', module);
      } else if (module !== 'generic') {
        return arguments.callee(name, 'general', 'generic');
      } else {
        console.log('i18n didn\'t find '+name);
        return name+'(not translated)';
      }
    }
  };
  
  // we try to get the dictionary from localStorage, if that fails we manually load it, store it and then initialize the translation
  try {
    localDict = store.get('dict');
    if (localDict.hash !== i18n_hashes[lang]) // compare the local dictionary version hash with the one the server provided in the layout.jade
      throw '';
    loadJSperanto(localDict.dict);
  } catch(e) { // invalid json or local translations have expired or localstorage not available
    $.getJSON('/REST/i18n/dict/'+lang, function (data) {
      if (Modernizr.localstorage) {
        store.store('dict', data);
      }
      loadJSperanto(data.dict);
    });
  }
  
  window.i18n = {
    lang: function (newLang) {
      store.store('lang', newLang);
      store.store('dict', null);
      window.location.reload();
    }
  };
})();
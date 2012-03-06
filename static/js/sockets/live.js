var livejs = io.connect('/Livejs');
console.log('connecting to sockets');
livejs.on('connect', function () {
  console.log('connected to livejs');
  livejs.on('checkResources', function (file_info) {
    console.log('reloading resource', file_info.file_name);
    var file_type = 'text/javascript';
    switch (file_info.ext) {
      case '.css':
        file_type = 'text/css';
        break;
    }
    Live.refreshResource(file_info.file_name, file_type);
  });
});
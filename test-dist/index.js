'use strict';

var _dist = require('../dist');

var _dist2 = _interopRequireDefault(_dist);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var p2p = new _dist2.default();

p2p.on('metadata', function (metadata) {
  console.log(metadata);
  var files = metadata.info.files || [];
  files.forEach(function (file) {
    console.log(file.path.toString('utf8'));
  });
});

p2p.listen(6881, '0.0.0.0');
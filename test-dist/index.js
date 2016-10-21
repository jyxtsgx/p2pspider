'use strict';

var _dist = require('../dist');

var _dist2 = _interopRequireDefault(_dist);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var p2p = new _dist2.default();

p2p.ignore(function (infohash, rinfo, callback) {
  // false => always to download the metadata even though the metadata is exists.
  var theInfohashIsExistsInDatabase = false;
  callback(theInfohashIsExistsInDatabase);
});

p2p.on('metadata', function (metadata) {
  console.log(metadata);
  var files = metadata.info.files || [];
  files.forEach(function (file) {
    console.log(file.path.toString('utf8'));
  });
});

p2p.listen(6881, '0.0.0.0');
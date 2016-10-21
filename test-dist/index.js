'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bencode = require('bencode');

var _bencode2 = _interopRequireDefault(_bencode);

var _dist = require('../dist');

var _dist2 = _interopRequireDefault(_dist);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var p2p = new _dist2.default();

p2p.on('metadata', function (metadata) {
  console.log(metadata);
  _fs2.default.write('/tmp/' + metadata.infohash + '.torrent', _bencode2.default.encode(metadata.info), function (err) {
    if (err) {
      console.log(err);
    }
  });
});

p2p.listen(6881, '0.0.0.0');
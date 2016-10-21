'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('./utils');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PeerQueue = function () {
  function PeerQueue(maxSize, perLimit) {
    _classCallCheck(this, PeerQueue);

    this.maxSize = maxSize || 200;
    this.perLimit = perLimit || 10;
    this.peers = {};
    this.reqs = [];
    _utils.logger.debug('init PeerQueue');
  }

  _createClass(PeerQueue, [{
    key: '_shift',
    value: function _shift() {
      if (this.length() > 0) {
        var req = this.reqs.shift();
        this.peers[req.infohash.toString('hex')] = [];
        return req;
      }
    }
  }, {
    key: 'push',
    value: function push(peer) {
      var infohashHex = peer.infohash.toString('hex');
      var peers = this.peers[infohashHex];

      if (peers && peers.length < this.perLimit) {
        peers.push(peer);
      } else if (this.length() < this.maxSize) {
        this.reqs.push(peer);
      }
    }
  }, {
    key: 'shift',
    value: function shift(infohash, successful) {
      if (infohash) {
        var infohashHex = infohash.toString('hex');
        if (successful === true) {
          delete this.peers[infohashHex];
        } else {
          var peers = this.peers[infohashHex];
          if (peers) {
            if (peers.length === 0) {
              delete this.peers[infohashHex];
            } else {
              return peers.shift();
            }
          }
        }
      }
      return this._shift();
    }
  }, {
    key: 'length',
    value: function length() {
      return this.reqs.length;
    }
  }]);

  return PeerQueue;
}();

exports.default = PeerQueue;
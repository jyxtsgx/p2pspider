'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _bencode = require('bencode');

var _bencode2 = _interopRequireDefault(_bencode);

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

var _KTable = require('./KTable');

var _KTable2 = _interopRequireDefault(_KTable);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BOOTSTRAP_NODES = [['router.bittorrent.com', 6881], ['dht.transmissionbt.com', 6881]];

var TID_LENGTH = 4;
var NODES_MAX_SIZE = 200;
var TOKEN_LENGTH = 2;

var DHTSpider = function () {
  function DHTSpider(btclient, address, port, nodesMaxSize) {
    _classCallCheck(this, DHTSpider);

    this.btclient = btclient;
    this.address = address;
    this.port = port;
    this.udp = _dgram2.default.createSocket('udp4');
    this.ktable = new _KTable2.default(nodesMaxSize || NODES_MAX_SIZE);
  }

  _createClass(DHTSpider, [{
    key: 'sendKRPC',
    value: function sendKRPC(msg, rinfo) {
      try {
        var buf = _bencode2.default.encode(msg);
        this.udp.send(buf, 0, buf.length, rinfo.port, rinfo.address);
      } catch (err) {
        console.log(err);
      }
    }
  }, {
    key: 'onFindNodeResponse',
    value: function onFindNodeResponse(_nodes) {
      var _this = this;

      var nodes = utils.decodeNodes(_nodes);
      nodes.forEach(function (node) {
        if (node.address !== _this.address && node.nid !== _this.ktable.nid && node.port < 65536 && node.port > 0) {
          _this.ktable.push(node);
        }
      });
    }
  }, {
    key: 'sendFindNodeRequest',
    value: function sendFindNodeRequest(rinfo, nid) {
      var _nid = nid !== undefined ? utils.genNeighborID(nid, this.ktable.nid) : this.ktable.nid;
      var msg = {
        t: utils.randomID().slice(0, TID_LENGTH),
        y: 'q',
        q: 'find_node',
        a: {
          id: _nid,
          target: utils.randomID()
        }
      };
      this.sendKRPC(msg, rinfo);
    }
  }, {
    key: 'joinDHTNetwork',
    value: function joinDHTNetwork() {
      var _this2 = this;

      BOOTSTRAP_NODES.forEach(function (node) {
        _this2.sendFindNodeRequest({ address: node[0], port: node[1] });
      });
    }
  }, {
    key: 'makeNeighbours',
    value: function makeNeighbours() {
      var _this3 = this;

      this.ktable.nodes.forEach(function (node) {
        _this3.sendFindNodeRequest({
          address: node.address,
          port: node.port
        }, node.nid);
      });
      this.ktable.nodes = [];
    }
  }, {
    key: 'onGetPeersRequest',
    value: function onGetPeersRequest(msg, rinfo) {
      try {
        var infohash = msg.a.info_hash;
        var tid = msg.t;
        var nid = msg.a.id;
        var token = infohash.slice(0, TOKEN_LENGTH);
        if (tid === undefined || infohash.length !== 20 || nid.length !== 20) {
          throw new Error();
        }
        this.sendKRPC({
          t: tid,
          y: 'r',
          r: {
            id: utils.genNeighborID(infohash, this.ktable.nid),
            nodes: '',
            token: token
          }
        }, rinfo);
      } catch (err) {
        console.log(err);
      }
    }
  }, {
    key: 'onAnnouncePeerRequest',
    value: function onAnnouncePeerRequest(msg, rinfo) {
      try {
        var infohash = msg.a.info_hash;
        var token = msg.a.token;
        var nid = msg.a.id;
        var tid = msg.t;
        var port = void 0;

        if (tid === undefined) {
          throw new Error();
        }

        if (infohash.slice(0, TOKEN_LENGTH).toString() !== token.toString()) {
          return;
        }

        if (msg.a.implied_port !== undefined && msg.a.implied_port !== 0) {
          port = rinfo.port;
        } else {
          port = msg.a.port || 0;
        }

        if (port >= 65536 || port <= 0) {
          return;
        }

        this.sendKRPC({
          t: tid,
          y: 'r',
          r: {
            id: utils.genNeighborID(nid, this.ktable.nid)
          }
        }, rinfo);

        this.btclient.add({ address: rinfo.address, port: port }, infohash);
      } catch (err) {
        console.log(err);
      }
    }
  }, {
    key: 'onMessage',
    value: function onMessage(_msg, rinfo) {
      try {
        var msg = _bencode2.default.decode(_msg);
        if (msg.y === 'r' && msg.r.nodes) {
          this.onFindNodeResponse(msg.r.nodes);
        } else if (msg.y === 'q' && msg.q === 'get_peers') {
          this.onGetPeersRequest(msg, rinfo);
        } else if (msg.y === 'q' && msg.q === 'announce_peer') {
          this.onAnnouncePeerRequest(msg, rinfo);
        }
      } catch (err) {
        console.log(err);
      }
    }
  }, {
    key: 'start',
    value: function start() {
      var _this4 = this;

      this.udp.bind(this.port, this.address);

      this.udp.on('listening', function () {
        console.log('UDP Server listening on %s:%s', _this4.address, _this4.port);
      });

      this.udp.on('message', function (msg, rinfo) {
        _this4.onMessage(msg, rinfo);
      });

      this.udp.on('error', function () {
        // do nothing
      });

      setInterval(function () {
        if (_this4.btclient.isIdle()) {
          _this4.joinDHTNetwork();
          _this4.makeNeighbours();
        }
      }, 1000);
    }
  }]);

  return DHTSpider;
}();

exports.default = DHTSpider;
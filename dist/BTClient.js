'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _PeerQueue = require('./PeerQueue');

var _PeerQueue2 = _interopRequireDefault(_PeerQueue);

var _Wire = require('./Wire');

var _Wire2 = _interopRequireDefault(_Wire);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BTClient = function (_EventEmitter) {
  _inherits(BTClient, _EventEmitter);

  function BTClient(timeout, maxConnections) {
    _classCallCheck(this, BTClient);

    var _this = _possibleConstructorReturn(this, (BTClient.__proto__ || Object.getPrototypeOf(BTClient)).call(this));

    _this.timeout = timeout;
    _this.maxConnections = maxConnections;
    _this.activeConnections = 0;
    _this.peers = new _PeerQueue2.default(_this.maxConnections);
    _this.on('download', _this._download);
    _utils.logger.debug('init BTClient');
    return _this;
  }

  _createClass(BTClient, [{
    key: 'ignore',
    value: function ignore(infohash, rinfo, callback) {
      // false => always to download the metadata even though the metadata is exists.
      var theInfohashIsExistsInDatabase = false;
      callback(theInfohashIsExistsInDatabase);
    }
  }, {
    key: '_next',
    value: function _next(infohash, successful) {
      var _this2 = this;

      var req = this.peers.shift(infohash, successful);
      if (req) {
        this.ignore(req.infohash.toString('hex'), req.rinfo, function (drop) {
          if (!drop) {
            _this2.emit('download', req.rinfo, req.infohash);
          }
        });
      }
    }
  }, {
    key: '_download',
    value: function _download(rinfo, infohash) {
      var _this3 = this;

      this.activeConnections += 1;

      var successful = false;
      var socket = new _net2.default.Socket();

      socket.setTimeout(this.timeout || 5000);
      socket.connect(rinfo.port, rinfo.address, function () {
        var wire = new _Wire2.default(infohash);
        socket.pipe(wire).pipe(socket);

        wire.on('metadata', function (metadata, infoHash) {
          successful = true;
          _this3.emit('complete', metadata, infoHash, rinfo);
          socket.destroy();
        });

        wire.on('fail', function () {
          socket.destroy();
        });

        wire.sendHandshake();
      });

      socket.on('error', function () {
        socket.destroy();
      });

      socket.on('timeout', function () {
        socket.destroy();
      });

      socket.once('close', function () {
        _this3.activeConnections -= 1;
        _this3._next(infohash, successful);
      });
    }
  }, {
    key: 'add',
    value: function add(rinfo, infohash) {
      this.peers.push({ infohash: infohash, rinfo: rinfo });
      if (this.activeConnections < this.maxConnections && this.peers.length() > 0) {
        this._next();
      }
    }
  }, {
    key: 'isIdle',
    value: function isIdle() {
      return this.peers.length() === 0;
    }
  }]);

  return BTClient;
}(_events.EventEmitter);

exports.default = BTClient;
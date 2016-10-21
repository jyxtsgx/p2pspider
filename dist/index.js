'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _DHTSpider = require('./DHTSpider');

var _DHTSpider2 = _interopRequireDefault(_DHTSpider);

var _BTClient = require('./BTClient');

var _BTClient2 = _interopRequireDefault(_BTClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var P2PSpider = function (_EventEmitter) {
  _inherits(P2PSpider, _EventEmitter);

  function P2PSpider() {
    var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 5000;
    var maxConnections = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 400;
    var address = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '0.0.0.0';
    var port = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 6881;
    var nodesMaxSize = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 200;

    _classCallCheck(this, P2PSpider);

    var _this = _possibleConstructorReturn(this, (P2PSpider.__proto__ || Object.getPrototypeOf(P2PSpider)).call(this));

    _this.btclient = new _BTClient2.default(timeout, maxConnections);
    _this.spider = new _DHTSpider2.default(_this.btclient, address, port, nodesMaxSize);
    return _this;
  }

  _createClass(P2PSpider, [{
    key: 'listen',
    value: function listen() {
      var _this2 = this;

      this.btclient.on('complete', function (metadata, infohash, rinfo) {
        var _metadata = metadata;
        _metadata.address = rinfo.address;
        _metadata.port = rinfo.port;
        _metadata.infohash = infohash.toString('hex');
        _metadata.magnet = 'magnet:?xt=urn:btih:' + _metadata.infohash;
        _this2.emit('metadata', _metadata);
      });
      this.spider.start();
    }
  }]);

  return P2PSpider;
}(_events.EventEmitter);

exports.default = P2PSpider;
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _stream = require('stream');

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _bitfield = require('bitfield');

var _bitfield2 = _interopRequireDefault(_bitfield);

var _bencode = require('bencode');

var _bencode2 = _interopRequireDefault(_bencode);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BT_RESERVED = new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x01]);
var BT_PROTOCOL = new Buffer('BitTorrent protocol');
var PIECE_LENGTH = Math.pow(2, 14);
var MAX_METADATA_SIZE = 10000000;
var BITFIELD_GROW = 1000;
var EXT_HANDSHAKE_ID = 0;
var BT_MSG_ID = 20;

var Wire = function (_Duplex) {
  _inherits(Wire, _Duplex);

  function Wire(infohash) {
    _classCallCheck(this, Wire);

    var _this = _possibleConstructorReturn(this, (Wire.__proto__ || Object.getPrototypeOf(Wire)).call(this));

    _this._bitfield = new _bitfield2.default(0, { grow: BITFIELD_GROW });
    _this._infohash = infohash;

    _this._buffer = [];
    _this._bufferSize = 0;

    _this._next = null;
    _this._nextSize = 0;

    _this._metadata = null;
    _this._metadataSize = null;
    _this._numPieces = 0;
    _this._ut_metadata = null;

    _this._onHandshake();

    _utils.logger.debug('init Wire');
    return _this;
  }

  _createClass(Wire, [{
    key: '_onMessageLength',
    value: function _onMessageLength(buffer) {
      if (buffer.length >= 4) {
        var length = buffer.readUInt32BE(0);
        if (length > 0) {
          this._register(length, this._onMessage);
        }
      }
    }
  }, {
    key: '_onMessage',
    value: function _onMessage(buffer) {
      this._register(4, this._onMessageLength);
      if (buffer[0] === BT_MSG_ID) {
        this._onExtended(buffer.readUInt8(1), buffer.slice(2));
      }
    }
  }, {
    key: '_onExtended',
    value: function _onExtended(ext, buf) {
      if (ext === 0) {
        try {
          this._onExtHandshake(_bencode2.default.decode(buf));
        } catch (err) {
          this._fail();
        }
      } else {
        this._onPiece(buf);
      }
    }
  }, {
    key: '_register',
    value: function _register(size, next) {
      this._nextSize = size;
      this._next = next;
    }
  }, {
    key: 'end',
    value: function end() {
      _get(Wire.prototype.__proto__ || Object.getPrototypeOf(Wire.prototype), 'end', this).call(this);
    }
  }, {
    key: '_onHandshake',
    value: function _onHandshake() {
      var _this2 = this;

      this._register(1, function (buffer) {
        if (buffer.length === 0) {
          _this2.end();
          return _this2._fail();
        }
        var pstrlen = buffer.readUInt8(0);
        _this2._register(pstrlen + 48, function (handshake) {
          var protocol = handshake.slice(0, pstrlen);
          if (protocol.toString() !== BT_PROTOCOL.toString()) {
            _this2.end();
            _this2._fail();
            return;
          }
          var _handshake = handshake.slice(pstrlen);
          if (_handshake[5] & 0x10) {
            _this2._register(4, _this2._onMessageLength);
            _this2._sendExtHandshake();
          } else {
            _this2._fail();
          }
        });
      });
    }
  }, {
    key: '_onExtHandshake',
    value: function _onExtHandshake(extHandshake) {
      if (!extHandshake.metadata_size || !extHandshake.m.ut_metadata || extHandshake.metadata_size > MAX_METADATA_SIZE) {
        this._fail();
        return;
      }

      this._metadataSize = extHandshake.metadata_size;
      this._numPieces = Math.ceil(this._metadataSize / PIECE_LENGTH);
      this._ut_metadata = extHandshake.m.ut_metadata;

      this._requestPieces();
    }
  }, {
    key: '_requestPieces',
    value: function _requestPieces() {
      this._metadata = new Buffer(this._metadataSize);
      for (var piece = 0; piece < this._numPieces; piece += 1) {
        this._requestPiece(piece);
      }
    }
  }, {
    key: '_requestPiece',
    value: function _requestPiece(piece) {
      var msg = Buffer.concat([new Buffer([BT_MSG_ID]), new Buffer([this._ut_metadata]), _bencode2.default.encode({ msg_type: 0, piece: piece })]);
      this._sendMessage(msg);
    }
  }, {
    key: '_sendPacket',
    value: function _sendPacket(packet) {
      this.push(packet);
    }
  }, {
    key: '_sendMessage',
    value: function _sendMessage(msg) {
      var buf = new Buffer(4);
      buf.writeUInt32BE(msg.length, 0);
      this._sendPacket(Buffer.concat([buf, msg]));
    }
  }, {
    key: 'sendHandshake',
    value: function sendHandshake() {
      var peerID = (0, _utils.randomID)();
      var packet = Buffer.concat([new Buffer([BT_PROTOCOL.length]), BT_PROTOCOL, BT_RESERVED, this._infohash, peerID]);
      this._sendPacket(packet);
    }
  }, {
    key: '_sendExtHandshake',
    value: function _sendExtHandshake() {
      var msg = Buffer.concat([new Buffer([BT_MSG_ID]), new Buffer([EXT_HANDSHAKE_ID]), _bencode2.default.encode({ m: { ut_metadata: 1 } })]);
      this._sendMessage(msg);
    }
  }, {
    key: '_onPiece',
    value: function _onPiece(piece) {
      var dict = void 0;
      var trailer = void 0;
      try {
        var str = piece.toString();
        var trailerIndex = str.indexOf('ee') + 2;
        dict = _bencode2.default.decode(str.substring(0, trailerIndex));
        trailer = piece.slice(trailerIndex);
      } catch (err) {
        this._fail();
        return;
      }
      if (dict.msg_type !== 1) {
        this._fail();
        return;
      }
      if (trailer.length > PIECE_LENGTH) {
        this._fail();
        return;
      }
      trailer.copy(this._metadata, dict.piece * PIECE_LENGTH);
      this._bitfield.set(dict.piece);
      this._checkDone();
    }
  }, {
    key: '_checkDone',
    value: function _checkDone() {
      var done = true;
      for (var piece = 0; piece < this._numPieces; piece += 1) {
        if (!this._bitfield.get(piece)) {
          done = false;
          break;
        }
      }
      if (!done) {
        return;
      }
      this._onDone(this._metadata);
    }
  }, {
    key: '_onDone',
    value: function _onDone(_metadata) {
      var metadata = _metadata;
      try {
        var info = _bencode2.default.decode(metadata).info;
        if (info) {
          metadata = _bencode2.default.encode(info);
        }
      } catch (err) {
        console.log(err);
        this._fail();
        return;
      }
      var infohash = _crypto2.default.createHash('sha1').update(metadata).digest('hex');
      if (this._infohash.toString('hex') !== infohash) {
        this._fail();
        return false;
      }
      this.emit('metadata', { info: _bencode2.default.decode(metadata) }, this._infohash);
    }
  }, {
    key: '_fail',
    value: function _fail() {
      this.emit('fail');
    }
  }, {
    key: '_write',
    value: function _write(buf, encoding, next) {
      this._bufferSize += buf.length;
      this._buffer.push(buf);
      while (this._bufferSize >= this._nextSize) {
        var buffer = Buffer.concat(this._buffer);
        this._bufferSize -= this._nextSize;
        this._buffer = this._bufferSize ? [buffer.slice(this._nextSize)] : [];
        this._next(buffer.slice(0, this._nextSize));
      }
      next(null);
    }
  }]);

  return Wire;
}(_stream.Duplex);

exports.default = Wire;
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.logger = exports.genNeighborID = exports.decodeNodes = exports.randomID = undefined;

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _bunyan = require('bunyan');

var _bunyan2 = _interopRequireDefault(_bunyan);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = _bunyan2.default.createLogger({ name: 'p2pspider', level: 'debug' });

function randomID() {
  var id = _crypto2.default.createHash('sha1').update(_crypto2.default.randomBytes(20)).digest();
  logger.debug('random id', { id: id });
  return id;
}

function decodeNodes(data) {
  var nodes = [];
  for (var i = 0; i + 26 <= data.length; i += 26) {
    nodes.push({
      nid: data.slice(i, i + 20),
      address: data[i + 20] + '.' + data[i + 21] + '.' + data[i + 22] + '.' + data[i + 23],
      port: data.readUInt16BE(i + 24)
    });
  }
  return nodes;
}

function genNeighborID(target, nid) {
  return Buffer.concat([target.slice(0, 10), nid.slice(10)]);
}

exports.randomID = randomID;
exports.decodeNodes = decodeNodes;
exports.genNeighborID = genNeighborID;
exports.logger = logger;
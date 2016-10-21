'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var crypto = require('crypto');

function randomID() {
  return crypto.createHash('sha1').update(crypto.randomBytes(20)).digest();
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
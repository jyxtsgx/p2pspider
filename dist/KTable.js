'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('./utils.js');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var KTable = function () {
  function KTable(maxsize) {
    _classCallCheck(this, KTable);

    this.maxsize = maxsize;
    this.nid = (0, _utils.randomID)();
    this.nodes = [];
    _utils.logger.debug('init KTable');
  }

  _createClass(KTable, [{
    key: 'push',
    value: function push(node) {
      if (this.nodes.length >= this.maxsize) {
        return;
      }
      this.nodes.push(node);
    }
  }]);

  return KTable;
}();

exports.default = KTable;
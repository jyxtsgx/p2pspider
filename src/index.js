import { EventEmitter } from 'events';

import DHTSpider from './DHTSpider';
import BTClient from './BTClient';

export default class P2PSpider extends EventEmitter {
  constructor(timeout = 5000, maxConnections = 400, address = '0.0.0.0', port = 6881, nodesMaxSize = 200) {
    super();
    this._ignore = undefined;
    this.btclient = new BTClient(timeout, this._ignore, maxConnections);
    this.spider = new DHTSpider(this.btclient, address, port, nodesMaxSize);
  }

  ignore(ignore) {
    this._ignore = ignore;
  }

  listen() {
    this.btclient.on('complete', (metadata, infohash, rinfo) => {
      const _metadata = metadata;
      _metadata.address = rinfo.address;
      _metadata.port = rinfo.port;
      _metadata.infohash = infohash.toString('hex');
      _metadata.magnet = `magnet:?xt=urn:btih:${_metadata.infohash}`;
      this.emit('metadata', _metadata);
    });
    this.spider.start();
  }
}

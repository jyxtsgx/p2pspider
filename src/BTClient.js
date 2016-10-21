import { EventEmitter } from 'events';
import net from 'net';
import PeerQueue from './PeerQueue';
import Wire from './Wire';

export default class BTClient extends EventEmitter {
  constructor(timeout, maxConnections) {
    super();
    this.timeout = timeout;
    this.maxConnections = maxConnections;
    this.activeConnections = 0;
    this.peers = new PeerQueue(this.maxConnections);
    this.on('download', this._download);
  }

  ignore(infohash, rinfo, callback) {
    // false => always to download the metadata even though the metadata is exists.
    const theInfohashIsExistsInDatabase = false;
    callback(theInfohashIsExistsInDatabase);
  }

  _next(infohash, successful) {
    const req = this.peers.shift(infohash, successful);
    if (req) {
      this.ignore(req.infohash.toString('hex'), req.rinfo, (drop) => {
        if (!drop) {
          this.emit('download', req.rinfo, req.infohash);
        }
      });
    }
  }

  _download(rinfo, infohash) {
    this.activeConnections += 1;

    let successful = false;
    const socket = new net.Socket();

    socket.setTimeout(this.timeout || 5000);
    socket.connect(rinfo.port, rinfo.address, () => {
      const wire = new Wire(infohash);
      socket.pipe(wire).pipe(socket);

      wire.on('metadata', (metadata, infoHash) => {
        successful = true;
        this.emit('complete', metadata, infoHash, rinfo);
        socket.destroy();
      });

      wire.on('fail', () => {
        socket.destroy();
      });

      wire.sendHandshake();
    });

    socket.on('error', () => {
      socket.destroy();
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.once('close', () => {
      this.activeConnections -= 1;
      this._next(infohash, successful);
    });
  }

  add(rinfo, infohash) {
    this.peers.push({ infohash, rinfo });
    if (this.activeConnections < this.maxConnections && this.peers.length() > 0) {
      this._next();
    }
  }

  isIdle() {
    return this.peers.length() === 0;
  }
}

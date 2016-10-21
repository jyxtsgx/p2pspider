import dgram from 'dgram';
import bencode from 'bencode';
import * as utils from './utils';
import KTable from './KTable';

const BOOTSTRAP_NODES = [
  ['router.bittorrent.com', 6881],
  ['dht.transmissionbt.com', 6881]
];

const [TID_LENGTH, NODES_MAX_SIZE, TOKEN_LENGTH] = [4, 200, 2];

export default class DHTSpider {
  constructor(btclient, address, port, nodesMaxSize) {
    this.btclient = btclient;
    this.address = address;
    this.port = port;
    this.udp = dgram.createSocket('udp4');
    this.ktable = new KTable(nodesMaxSize || NODES_MAX_SIZE);
  }

  sendKRPC(msg, rinfo) {
    try {
      const buf = bencode.encode(msg);
      this.udp.send(buf, 0, buf.length, rinfo.port, rinfo.address);
    } catch (err) {
      console.log(err);
    }
  }

  onFindNodeResponse(_nodes) {
    const nodes = utils.decodeNodes(_nodes);
    nodes.forEach((node) => {
      if (node.address !== this.address && node.nid !== this.ktable.nid
        && node.port < 65536 && node.port > 0) {
        this.ktable.push(node);
      }
    });
  }

  sendFindNodeRequest(rinfo, nid) {
    const _nid = nid !== undefined ? utils.genNeighborID(nid, this.ktable.nid) : this.ktable.nid;
    const msg = {
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

  joinDHTNetwork() {
    BOOTSTRAP_NODES.forEach((node) => {
      this.sendFindNodeRequest({ address: node[0], port: node[1] });
    });
  }

  makeNeighbours() {
    this.ktable.nodes.forEach((node) => {
      this.sendFindNodeRequest({
        address: node.address,
        port: node.port
      }, node.nid);
    });
    this.ktable.nodes = [];
  }

  onGetPeersRequest(msg, rinfo) {
    try {
      const infohash = msg.a.info_hash;
      const tid = msg.t;
      const nid = msg.a.id;
      const token = infohash.slice(0, TOKEN_LENGTH);
      if (tid === undefined || infohash.length !== 20 || nid.length !== 20) {
        throw new Error();
      }
      this.sendKRPC({
        t: tid,
        y: 'r',
        r: {
          id: utils.genNeighborID(infohash, this.ktable.nid),
          nodes: '',
          token
        }
      }, rinfo);
    } catch (err) {
      console.log(err);
    }
  }


  onAnnouncePeerRequest(msg, rinfo) {
    try {
      const infohash = msg.a.info_hash;
      const token = msg.a.token;
      const nid = msg.a.id;
      const tid = msg.t;
      let port;

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

      this.btclient.add({ address: rinfo.address, port }, infohash);
    } catch (err) {
      console.log(err);
    }
  }

  onMessage(_msg, rinfo) {
    try {
      const msg = bencode.decode(_msg);
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

  start() {
    this.udp.bind(this.port, this.address);

    this.udp.on('listening', () => {
      console.log('UDP Server listening on %s:%s', this.address, this.port);
    });

    this.udp.on('message', (msg, rinfo) => {
      this.onMessage(msg, rinfo);
    });

    this.udp.on('error', () => {
      // do nothing
    });

    setInterval(() => {
      if (this.btclient.isIdle()) {
        this.joinDHTNetwork();
        this.makeNeighbours();
      }
    }, 1000);
  }
}

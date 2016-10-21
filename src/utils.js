import crypto from 'crypto';
import bunyan from 'bunyan';

const logger = bunyan.createLogger({ name: 'p2pspider', level: 'debug' });

function randomID() {
  const id = crypto.createHash('sha1').update(crypto.randomBytes(20)).digest();
  logger.debug('random id', { id });
  return id;
}

function decodeNodes(data) {
  const nodes = [];
  for (let i = 0; i + 26 <= data.length; i += 26) {
    nodes.push({
      nid: data.slice(i, i + 20),
      address: `${data[i + 20]}.${data[i + 21]}.${data[i + 22]}.${data[i + 23]}`,
      port: data.readUInt16BE(i + 24)
    });
  }
  return nodes;
}

function genNeighborID(target, nid) {
  return Buffer.concat([target.slice(0, 10), nid.slice(10)]);
}

export { randomID, decodeNodes, genNeighborID, logger };

import { randomID, logger } from './utils.js';

export default class KTable {
  constructor(maxsize) {
    this.maxsize = maxsize;
    this.nid = randomID();
    this.nodes = [];
    logger.debug('init KTable');
  }

  push(node) {
    if (this.nodes.length >= this.maxsize) {
      return;
    }
    this.nodes.push(node);
  }
}

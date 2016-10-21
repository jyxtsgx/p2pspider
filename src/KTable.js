import { randomID } from './utils.js';

export default class KTable {
  constructor(maxsize) {
    this.maxsize = maxsize;
    this.nid = randomID();
    this.nodes = [];
  }

  push(node) {
    if (this.nodes.length >= this.maxsize) {
      return;
    }
    this.nodes.push(node);
  }
}

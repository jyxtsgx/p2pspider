import { Duplex } from 'stream';
import crypto from 'crypto';
import BitField from 'bitfield';
import bencode from 'bencode';
import { randomID } from './utils';

const BT_RESERVED = new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x01]);
const BT_PROTOCOL = new Buffer('BitTorrent protocol');
const PIECE_LENGTH = Math.pow(2, 14);
const MAX_METADATA_SIZE = 10000000;
const BITFIELD_GROW = 1000;
const EXT_HANDSHAKE_ID = 0;
const BT_MSG_ID = 20;

export default class Wire extends Duplex {
  constructor(infohash) {
    super();
    this._bitfield = new BitField(0, { grow: BITFIELD_GROW });
    this._infohash = infohash;

    this._buffer = [];
    this._bufferSize = 0;

    this._next = null;
    this._nextSize = 0;

    this._metadata = null;
    this._metadataSize = null;
    this._numPieces = 0;
    this._ut_metadata = null;

    this._onHandshake();
  }

  _onMessageLength(buffer) {
    if (buffer.length >= 4) {
      const length = buffer.readUInt32BE(0);
      if (length > 0) {
        this._register(length, this._onMessage);
      }
    }
  }

  _onMessage(buffer) {
    this._register(4, this._onMessageLength);
    if (buffer[0] === BT_MSG_ID) {
      this._onExtended(buffer.readUInt8(1), buffer.slice(2));
    }
  }

  _onExtended(ext, buf) {
    if (ext === 0) {
      try {
        this._onExtHandshake(bencode.decode(buf));
      } catch (err) {
        this._fail();
      }
    } else {
      this._onPiece(buf);
    }
  }

  _register(size, next) {
    this._nextSize = size;
    this._next = next;
  }

  end() {
    super.end();
  }

  _onHandshake() {
    this._register(1, (buffer) => {
      if (buffer.length === 0) {
        this.end();
        return this._fail();
      }
      const pstrlen = buffer.readUInt8(0);
      this._register(pstrlen + 48, (handshake) => {
        const protocol = handshake.slice(0, pstrlen);
        if (protocol.toString() !== BT_PROTOCOL.toString()) {
          this.end();
          this._fail();
          return;
        }
        const _handshake = handshake.slice(pstrlen);
        if (_handshake[5] & 0x10) {
          this._register(4, this._onMessageLength);
          this._sendExtHandshake();
        } else {
          this._fail();
        }
      });
    });
  }

  _onExtHandshake(extHandshake) {
    if (!extHandshake.metadata_size || !extHandshake.m.ut_metadata
      || extHandshake.metadata_size > MAX_METADATA_SIZE) {
      this._fail();
      return;
    }

    this._metadataSize = extHandshake.metadata_size;
    this._numPieces = Math.ceil(this._metadataSize / PIECE_LENGTH);
    this._ut_metadata = extHandshake.m.ut_metadata;

    this._requestPieces();
  }

  _requestPieces() {
    this._metadata = new Buffer(this._metadataSize);
    for (let piece = 0; piece < this._numPieces; piece += 1) {
      this._requestPiece(piece);
    }
  }

  _requestPiece(piece) {
    const msg = Buffer.concat([
      new Buffer([BT_MSG_ID]),
      new Buffer([this._ut_metadata]),
      bencode.encode({ msg_type: 0, piece })
    ]);
    this._sendMessage(msg);
  }

  _sendPacket(packet) {
    this.push(packet);
  }

  _sendMessage(msg) {
    const buf = new Buffer(4);
    buf.writeUInt32BE(msg.length, 0);
    this._sendPacket(Buffer.concat([buf, msg]));
  }

  sendHandshake() {
    const peerID = randomID();
    const packet = Buffer.concat([
      new Buffer([BT_PROTOCOL.length]),
      BT_PROTOCOL, BT_RESERVED, this._infohash, peerID
    ]);
    this._sendPacket(packet);
  }

  _sendExtHandshake() {
    const msg = Buffer.concat([
      new Buffer([BT_MSG_ID]),
      new Buffer([EXT_HANDSHAKE_ID]),
      bencode.encode({ m: { ut_metadata: 1 } })
    ]);
    this._sendMessage(msg);
  }

  _onPiece(piece) {
    let dict;
    let trailer;
    try {
      const str = piece.toString();
      const trailerIndex = str.indexOf('ee') + 2;
      dict = bencode.decode(str.substring(0, trailerIndex));
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

  _checkDone() {
    let done = true;
    for (let piece = 0; piece < this._numPieces; piece += 1) {
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

  _onDone(_metadata) {
    let metadata = _metadata;
    try {
      const info = bencode.decode(metadata).info;
      if (info) {
        metadata = bencode.encode(info);
      }
    } catch (err) {
      console.log(err);
      this._fail();
      return;
    }
    const infohash = crypto.createHash('sha1').update(metadata).digest('hex');
    if (this._infohash.toString('hex') !== infohash) {
      this._fail();
      return false;
    }
    this.emit('metadata', { info: bencode.decode(metadata) }, this._infohash);
  }

  _fail() {
    this.emit('fail');
  }

  _write(buf, encoding, next) {
    this._bufferSize += buf.length;
    this._buffer.push(buf);
    while (this._bufferSize >= this._nextSize) {
      const buffer = Buffer.concat(this._buffer);
      this._bufferSize -= this._nextSize;
      this._buffer = this._bufferSize
        ? [buffer.slice(this._nextSize)]
        : [];
      this._next(buffer.slice(0, this._nextSize));
    }
    next(null);
  }
}

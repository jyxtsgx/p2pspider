import fs from 'fs';
import bencode from 'bencode';
import P2PSpider from '../dist';

const p2p = new P2PSpider();

p2p.on('metadata', (metadata) => {
  console.log(metadata);
  fs.writeFile(`/tmp/${metadata.infohash}.torrent`, bencode.encode(metadata), (err) => {
    if (err) {
      console.log(err);
    }
  });
});

p2p.listen(6881, '0.0.0.0');

import P2PSpider from '../dist';

const p2p = new P2PSpider();

p2p.on('metadata', (metadata) => {
  console.log(metadata);
});

p2p.listen(6881, '0.0.0.0');

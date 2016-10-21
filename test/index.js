import P2PSpider from '../dist';

const p2p = new P2PSpider();

p2p.ignore((infohash, rinfo, callback) => {
  // false => always to download the metadata even though the metadata is exists.
  const theInfohashIsExistsInDatabase = false;
  callback(theInfohashIsExistsInDatabase);
});

p2p.on('metadata', (metadata) => {
  console.log(metadata);
  const files = metadata.info.files || [];
  files.forEach((file) => {
    console.log(file.path.toString('utf8'));
  });
});

p2p.listen(6881, '0.0.0.0');

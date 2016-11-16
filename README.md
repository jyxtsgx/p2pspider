## 介绍

本项目是在[原p2pspider](https://github.com/dontcontactme/p2pspider)的基础上修改而来，整理一下原项目的代码，添加了babel，eslint，gulp等工具来支持es6代码。

demo程序：[bt问问](https://btwenwen.com/)

新项目源码放在src，babel转译后的文件放在dist目录，源码统一改成es6 class格式，

## 本地测试

```
git clone https://github.com/callmelanmao/p2pspider
```

原来的测试文件也进行了修改，因为node.js不支持es6 module和es6 class，所以必须先运行gulp，然后执行`node test-dist/index.js`运行测试代码

```js
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
```

## 依赖测试

把这个项目添加到`package.json`的依赖中，`"p2pspider": "https://github.com/callmelanmao/p2pspider"`，由于和原项目命名冲突，所以不能发布到npm仓库。

```js
import P2PSpider from 'p2pspider';

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
```

## 协议

[bep_0005](http://www.bittorrent.org/beps/bep_0005.html), [bep_0003](http://www.bittorrent.org/beps/bep_0003.html), [bep_0010](http://www.bittorrent.org/beps/bep_0010.html), [bep_0009](http://www.bittorrent.org/beps/bep_0009.html)

## 提醒

不要拿这个爬虫爬取的数据分享到互联网, 因为很多敏感资源; 色情资源; 侵权资源. 否则后果自负喔!

## 许可证
MIT

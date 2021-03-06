'use strict';

const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const crypto = require('crypto');
const multiparty = require('connect-multiparty')();

const config = require('../../biz/config');

module.exports = (router, server) => {
  // alioss
  router.get('/upload-token/alioss', (req, res) => {
    const ossConf = config.uploadConf.uploaders.alioss;
    const accessKeyId = ossConf.accessKeyID;
    const secretAccessKey = ossConf.accessKeySecret;
    const path = ossConf.rootPath.substr(1);// oss 不允许 '/' 开头作为key
    const hash = uuid.v4();
    const policy = `${'{"expiration":"2120-01-01T12:00:00.000Z",' +
    '"conditions":[{"bucket":"'}${ossConf.bucket}" },` +
    `["starts-with","$key","${path}/${hash}-"]]}`;

    const policyBase64 = new Buffer(policy).toString('base64');
    const signature = crypto.createHmac('sha1', secretAccessKey).update(policyBase64).digest().toString('base64');

    return res.json({
      path,
      uuid: hash,
      policy: policyBase64,
      OSSAccessKeyId: accessKeyId,
      signature,
    });
  });

  // qiniu
  router.get('/upload-token/qiniu', (req, res) => {
    const qiniuConf = config.uploadConf.uploaders.qiniu;
    const accessKeyId = qiniuConf.accessKeyID;
    const secretAccessKey = qiniuConf.accessKeySecret;
    const path = qiniuConf.rootPath.substr(1);// qiniu 不需要 '/' 开头作为key
    const policy = `{"scope": "${qiniuConf.bucket}",` +
    `"deadline":${Math.floor(new Date('2120-01-01T12:00:00.000Z').valueOf() / 1000)}}`;

    const policyBase64 = new Buffer(policy).toString('base64');
    const signature = crypto.createHmac('sha1', secretAccessKey).update(policyBase64).digest().toString('base64');

    const token = `${accessKeyId}:${signature}:${policyBase64}`;

    return res.json({
      path,
      uuid: uuid.v4(),
      token,
    });
  });

  // server
  const upload = (req, res, next) => {
    const file = req.files.file;
    if (!file) {
      return next(new Error('上传的文件为空'));
    }

    try {
      // get filename
      const filename = file.originalFilename || path.basename(file.path);
      const key = `/upload/${uuid.v4()}-${filename}`;

      // copy file to a public directory
      let targetPath = path.resolve(__dirname, '../../client');
      targetPath += `/${key}`;
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      fs.rename(
        file.path,
        targetPath,
        (err) => {
          if (err) {
            fs.unlink(file.path);
            return next(err);
          }

          req.uploadedFile = key;
          return res.json({url: key});
        }
      );
    } catch (e) {
      fs.unlink(file.path);
      throw e;
    }
  };
  router.post('/upload', multiparty, upload);
};

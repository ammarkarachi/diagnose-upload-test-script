import * as crypto from 'crypto';
import * as uuid from 'uuid';
import * as fs from 'fs-extra';
import fetch from 'node-fetch';
import * as path from 'path';

const encryptBuffer = async (text: Buffer, passKey: string): Promise<string> => {
    const masterKey =  Buffer.from(passKey, 'utf-8');
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(64);
    const key = crypto.pbkdf2Sync(masterKey, salt, 2145, 32, 'sha512');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA24uh4/+WYoQYLtqgAP+/
Q1NxJbVIfzIpQ/Y0fOn9T3V7pjsw6elKarq96qfJqmpDJ+dYSkffjnv9m0t4UKtZ
tB38y7KXOMiesg3zaJT5Qxm6r/4xkp7fpggsRzodkYSXjzo1lQlXQVj8wK1erNhU
KJcMrf6XnFMm5oqR7TH15ByUN4zI8ERFUCDa5yzeUi+gZ7JorHE4JNlvRTPxRvnc
EOhg9YCOpcCdrMOCdJzrrjH8Lypd5WiEmPhyN8CHi5pO8NHxzjGovINYhO13Dsh3
GarDU9BBdgDgidIPg2Y9a4XYRLy1gWEvKWVxKdtB6+Tns0kFpkClAeMxHE3Q1EgD
3QIDAQAB
-----END PUBLIC KEY-----`;

(async() => {
    let zipPath = ''
    let partialData = {
      projectIdentifier: '9ba87c10193ce572aec4d31f59f664ea',
      projectEnvIdentifier: '56b5981ed6cf5caad90fb2f8aed150e2',
      sessionUuid: uuid.v4(),
      installationUuid: uuid.v4(),
      amplifyCliVersion: '8.1.0',
      nodeVersion: '14.19.0',
    }
    if(process.argv.length < 3) {
      console.log(`path to file required ex: npm run upload /report.zip`);
      return;
      
    } else {
      zipPath = path.normalize(process.argv[2])
      if(!fs.existsSync(zipPath))
        throw new Error(`${zipPath} does not exist`);
    }

    if (process.argv.length > 4) {
      const commandLineData = JSON.parse(process.argv[3]);
      partialData = {
        ...commandLineData,
        ...partialData,
      }
    }

    const stream = fs.readFileSync(zipPath)
    const key = uuid.v4();
    const enc = await encryptBuffer(stream, key);
    const enckey2 = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
        
    }, Buffer.from(key)).toString('base64');

    const payload = {
        ...partialData,
        encryptedFile: enc,
        key: enckey2,
      };
      const report = 'https://yc65ayd1ge.execute-api.us-east-1.amazonaws.com/beta/report';

      const data = JSON.stringify(payload);
      const result = await fetch(report, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': data.length.toString(),
        },
        body: data,
      })
      console.info(JSON.stringify(result.status))
      console.log(JSON.stringify( await result.text()));
      // }).then(r => {
      //   console.log(r.status);
      //   console.log(JSON.stringify(r))
        
      //   // no op
      // }).catch(e => console.log(JSON.stringify(e)));
    
})();
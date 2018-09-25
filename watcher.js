const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const cache = {};

function send(params) {
  const username = params.apiAccountName;
  const password = params.apiAccountPassword;
  const filePath = params.filePath;
  const options = {
    hostname: params.apiServerName,
    port: params.apiServerPort,
    path: params.apiResourcePath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: Buffer.from(`${username}:${password}`).toString('base64'),
    },
  };
  const body = {
    Name: params.libName,
    Package: params.libPackage,
    Script: params.libContent,
  };
  let hash;

  switch (params.event) {
    case 'create':
    case 'update':
      hash = crypto.createHash('md5').update(params.libContent).digest('hex');

      if (cache[filePath] !== hash) {
        cache[filePath] = hash;
      }
      break;
    case 'delete':

      break;
    default:
      break;
  }

  /*
  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
      console.log('No more data in response.');
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
  */
}

function getConfig() {
  const configPath = path.join(__dirname, '.sm.json');
  let result = {
    srcPath: path.join(__dirname, 'src'),
    apiServerName: 'localhost',
    apiServerPort: 13080,
    apiResourcePath: 'SM/9/rest/ScriptLibrary',
    apiAccountName: 'falcon',
    apiAccountPassword: '',
    libPackage: 'Custom',
    validExtensions: ['.js'],
  };

  try {
    fs.statSync(configPath);
    result = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      fs.writeFileSync(configPath, JSON.stringify(result, null, 2));
    }
  }

  return result;
}

function main() {
  const config = getConfig();
  const srcPath = config.srcPath;
  const validExtensions = config.validExtensions;

  fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
    const filePath = path.join(srcPath, filename);
    const pathParts = path.parse(filePath);
    const params = Object.assign({}, config, { libName: pathParts.name, libContent: '', filePath });

    if (validExtensions.includes(pathParts.ext)) {
      fs.stat(filePath, (statErr, stats) => {
        if (statErr && statErr.code === 'ENOENT') {
          params.event = 'delete';
          send(params);
        }
        if (stats && stats.isFile()) {
          if (eventType === 'rename') {
            params.event = 'create';
            send(params);
          } else {
            params.event = 'update';
            fs.readFile(filePath, (readErr, data) => {
              if (readErr) { throw readErr; }
              params.content = data.toString('utf8');
              send(params);
            });
          }
        }
      });
    }
  });
}

main();

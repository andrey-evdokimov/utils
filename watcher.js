const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const cache = {};

function sendRequest(options, body) {
  const req = http.request(options, (res) => {
    let data = '';

    res.setEncoding('utf8');
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (data) {
        try {
          const json = JSON.parse(data);
          console.log(json);
        } catch (e) {
          console.error(`problem with parse response body: ${e.message}`);
        }
      }
    });
  });

  req.on('error', (e) => { console.error(`problem with request: ${e.message}`); });

  req.write(JSON.stringify(body));
  req.end();
}

function send(params) {
  const filePath = params.filePath;
  const options = {
    hostname: params.apiServerName,
    port: params.apiServerPort,
    path: params.apiResourcePath,
    method: 'POST',
    auth: `${params.apiUsername}:${params.apiPassword}`,
    headers: { 'Content-Type': 'application/json' },
  };
  const body = {
    ScriptLibrary: {
      Name: params.libName,
      Package: params.libPackage,
      Script: params.libContent,
    },
  };
  let hash;

  switch (params.event) {
    case 'create':
      break;
    case 'update':
      hash = crypto.createHash('md5').update(params.libContent).digest('hex');

      if (cache[filePath] !== hash) {
        options.path = `${options.path}/${params.libName}`;
        cache[filePath] = hash;
      }
      break;
    case 'delete':

      break;
    default:
      break;
  }
}

function getConfig() {
  const configPath = path.join(__dirname, '.sm.json');
  let result = {
    srcPath: path.join(__dirname, 'src'),
    apiServerName: 'localhost',
    apiServerPort: 13080,
    apiResourcePath: '/SM/9/rest/ScriptLibrary',
    apiUsername: 'falcon',
    apiPassword: '',
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
              params.libContent = data.toString('utf8');
              send(params);
            });
          }
        }
      });
    }
  });
}

// main();

function test() {
  const options = {
    hostname: 'localhost',
    port: 13080,
    path: '/SM/9/rest/ScriptLibrary',
    auth: 'falcon:',
    method: 'POST',
  };
  const body = {
    ScriptLibrary: {
      Name: 'evdokimoff',
      Package: 'User',
      Script: '',
    },
  };
  const req = http.request(options, (res) => {
    let data = '';

    res.setEncoding('utf8');
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('data=' + data);
      if (data) {
        try {
          const json = JSON.parse(data);
          console.log(json);
        } catch (e) {
          console.error(`problem with parse response body: ${e.message}`);
        }
      }
    });
  });

  req.on('error', (e) => { console.error(`problem with request: ${e.message}`); });

  req.write(JSON.stringify(body));
  req.end();
}

/// test();

main();

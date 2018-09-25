const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const cache = {};

function send(params) {
  const filePath = params.filePath;
  const options = {
    hostname: params.apiServerName,
    port: params.apiServerPort,
    path: params.apiResourcePath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': Buffer.from(`${params.apiAccountName}:${params.apiAccountPassword}`).toString('base64')
    }
  };
  const body = {
    Name: params.libName,
    Package: params.libPackage,
    Script: params.libContent
  };

  switch (params.event) {
    case 'create':
    case 'update':
      const hash = crypto.createHash('md5').update(params.libContent).digest('hex');

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
    validExtensions: ['.js']
  };

  try {
    fs.statSync(configPath);
    result = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
  } catch(err) {
    if (err && err.code === 'ENOENT') { fs.writeFileSync(configPath, JSON.stringify(result, null, 2)); }
  }

  return result;
}

function main() {
  const config = getConfig();
  const srcPath = config.srcPath;

  fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
    const filePath = path.join(srcPath, filename);
    const parts = path.parse(filePath);
    const params = Object.assign({}, config, { libName: parts.name, libContent: '', filePath: filePath });
    
    if (validExtensions.includes(parts.ext)) {
      fs.stat(filePath, (err, stats) => {
        if (err && err.code === 'ENOENT') {
          params.event = 'delete';
          send(params);
        }
        if (stats && stats.isFile()) {
          if (eventType === 'rename') {
            params.event = 'create';
            send(params);
          } else {
            params.event = 'update';
            fs.readFile(filePath, (err, data) => {
              if (err) { throw err; }
              params.content = data.toString('utf8');
              send(params);
            });
          }
        }
      });
    }
  });
}

console.log(path.join(__dirname, 'src'));
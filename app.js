const http = require('http');

const { getRequest } = require('./lib/request');
const sendLineNotify = require('./lib/sendLineNotify');
const getFirstId = require('./lib/getFirstId');
const getToken = require('./lib/getToken');
const {get591Type,getTypeId,getTypeUrl,getIdListAndElementList} = require('./lib/typeService');
const {
  houseListURLs, port, requestFrquency, lineTokens, checkServiceStatus,
  subwayStationFilter, communityFilter,
} = require('./lib/getEnv');

let serviceStatus = true;
let countFail = 0;
houseListURLs.forEach(async (houseListURL) => {
  let originId = await getFirstId(houseListURL);
  const urlType = get591Type(houseListURL)
  const stopIntervalId = setInterval(async () => {
    const region = new URL(houseListURL).searchParams.get('region');
    const headerInfo = await getToken();
    const csrfToken = headerInfo[0];
    let cookie = headerInfo[1];
    if (region) {
      cookie = `urlJumpIp=${region}; ${cookie}`;
    }

    if (checkServiceStatus.enable) {
      serviceStatus = isServiceAvailable(checkServiceStatus.url);
      if (serviceStatus === false) {
        clearInterval(stopIntervalId);
      }
    }

    try {
      const resp = await getRequest({
        url: houseListURL,
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          Cookie: cookie,
        },
        json: true,
      });
      if (resp.statusCode !== 200) {
        // eslint-disable-next-line no-throw-literal
        throw `Token 可能過期了，目前 StatusCode: ${resp.statusCode}`;
      }
      let {elementList, idList} = getIdListAndElementList(urlType,resp.body.data);
      if (idList.includes(originId) === false) {
        [originId] = idList;
      }
      for (const element of elementList) {
        var id = getTypeId(urlType,element)
        
        if (id === originId) break;
        lineTokens.forEach(async (token) => {
          await sendLineNotify(
            getTypeUrl(urlType,id),
            token,
          );
        });
      }
      originId = getTypeId(urlType,elementList[0]);
    } catch (error) {
      if (countFail > 10) {
        lineTokens.forEach(async (token) => {
          await sendLineNotify(
            `\n好像出事了! 但是我嘗試重新拿 Token 第 ${countFail} 次了所以暫時先把程式關閉，有空可以檢查一下。\n `,
            token,
          );
        });
        clearInterval(stopIntervalId);
      }
      console.error(`Fetch the 591 rent fail: ${error}`);
      countFail += 1;
    }
  }, requestFrquency);
});

const server = http.createServer((req, res) => {
  if (!serviceStatus) {
    console.error('Service stopping.');
    res.writeHead(500, { 'Content-Type': 'text/html' });
    return res.end('Service have some problem QQ plz check the log.');
  }
  if (req.url === '/ping') {
    console.log('我還活著!');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('pong');
    return res.end();
  }
  res.writeHead(400, { 'Content-Type': 'text/html' });
  return res.end('Invalid Request!');
});

server.listen(port);

console.log(
  `Node.js web server at port ${port} is running..`,
);

function isSubwayStationNearby(destination, distance) {
  if (destination === '' || distance === '') return false;

  destination = destination.slice(1);
  distance = parseInt(distance.slice(0, -2), 10);
  if (!subwayStationFilter.station.includes(destination)) return false;
  if (distance > subwayStationFilter.distance) return false;
  return true;
}

function isFilterByCommunity(community) {
  const result = communityFilter.filter.map(
    ({ keyword, condition }) => {
      if (condition === 'include') return community.includes(keyword);
      if (condition === 'exclude') return !community.includes(keyword);
      return false;
    },
  );
  return result.every(Boolean);
}

async function isServiceAvailable(url) {
  const servicePing = await getRequest(url);
  if (servicePing.statusCode !== 200) {
    console.error('Ping fail plz check it.');
    return false;
  }
  return true;
}

const http = require('http');

const { getRequest } = require('./lib/request');
const sendLineNotify = require('./lib/sendLineNotify');
const getFirstPostId = require('./lib/getFirstPostId');
const getToken = require('./lib/getToken');
const {
  houseListURL, herokuURL, port, requestFrquency, lineTokens, subwayStationFilter,
} = require('./lib/getEnv');

let serviceStatus = true;
let stopIntervalId;
let countFail = 0;
(async () => {
  let originPostId = await getFirstPostId();
  stopIntervalId = setInterval(async () => {
    const headerInfo = await getToken();
    const csrfToken = headerInfo[0];
    const cookie = headerInfo[1];

    serviceStatus = checkHerokuServiceStatus();
    if (serviceStatus === false) {
      clearInterval(stopIntervalId);
    }

    try {
      const resp = await getRequest({
        url: houseListURL,
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          Cookie: `urlJumpIp=3; ${cookie}`,
        },
        json: true,
      });
      if (resp.statusCode !== 200) {
        // eslint-disable-next-line no-throw-literal
        throw `Token 可能過期了，目前 StatusCode: ${resp.statusCode}`;
      }
      const { data } = resp.body.data;
      for (const rentDetail of data) {
        const { post_id: postID } = rentDetail;
        const {
          type: surroundingType = '',
          desc: destination = '',
          distance = '',
        } = rentDetail.surrounding;

        if (postID === originPostId) break;
        if (subwayStationFilter.enable
          && surroundingType === 'subway_station'
          && isSubwayStationNearby(destination, distance) === false
        ) continue;

        lineTokens.forEach(async (token) => {
          await sendLineNotify(
            `\nhttps://rent.591.com.tw/rent-detail-${postID}.html`,
            token,
          );
        });
      }
      originPostId = data[0].post_id;
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
})();

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

async function checkHerokuServiceStatus() {
  const servicePing = await getRequest(`${herokuURL}/ping`);
  if (servicePing.statusCode !== 200) {
    console.error('Ping fail plz check it.');
    return false;
  }
  return true;
}

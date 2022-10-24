require('dotenv').config();
const http = require('http');

const { getRequest } = require('./lib/request');
const sendLineNotify = require('./lib/sendLineNotify');
const getFirstPostId = require('./lib/getFirstPostId');
const getToken = require('./lib/getToken');

const isSubwayStationFilterEnabled = process.env.ENABLE_SUBWAY_STATION_FILTER === 'true';
const subwayStation = JSON.parse(process.env.SUBWAY_STATION_FILTER);
const lineTokens = JSON.parse(process.env.LINE_NOTIFY_TOKEN);

let serviceStatus = true;
let stopIntervalId;
let countFail = 0;
(async () => {
  let originPostId = await getFirstPostId();
  stopIntervalId = setInterval(async () => {
    const headerInfo = await getToken();
    const houseListURL = `https://rent.591.com.tw/home/search/rsList?${
      process.env.TARGET_URL.split('?')[1]
    }`;
    const csrfToken = headerInfo[0];
    const cookie = headerInfo[1];
    const servicePing = await getRequest(`${process.env.HEROKU_URL}/ping`);
    if (servicePing.statusCode !== 200) {
      console.error('Ping fail plz check it.');
      serviceStatus = false;
      clearInterval(stopIntervalId);
    } else {
      serviceStatus = true;
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
      const { data } = resp.body.data;
      for (const rentDetail of data) {
        const postID = rentDetail.post_id;
        const {
          type: surroundingType = '',
          desc: destination = '',
          distance = '',
        } = rentDetail.surrounding;

        if (postID === originPostId) break;
        if (isSubwayStationFilterEnabled
          && surroundingType === 'subway_station'
          && subwayStationFilter(destination, distance) === false
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
        await sendLineNotify(
          `\n好像出事了! 但是我嘗試重新拿 Token 第 ${countFail} 次了所以暫時先把程式關閉，有空可以檢查一下。\n `,
          process.env.LINE_NOTIFY_TOKEN,
        );
        clearInterval(stopIntervalId);
      }
      console.error(`Fetch the 591 rent fail: ${error}`);
      countFail += 1;
    }
  }, process.env.REQUEST_FREQUENCY);
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

server.listen(process.env.PORT || 5000);

console.log(
  `Node.js web server at port ${process.env.PORT || 5000} is running..`,
);

function subwayStationFilter(destination, distance) {
  if (destination === '' || distance === '') return false;

  destination = destination.slice(1);
  distance = parseInt(distance.slice(0, -2), 10);
  if (!subwayStation.includes(destination)) return false;
  if (distance > process.env.SUBWAY_STATION_DISTANCE) return false;
  return true;
}

const http = require('http');

const { getRequest } = require('./lib/request');
const sendLineNotify = require('./lib/sendLineNotify');
const getFirstPostId = require('./lib/getFirstPostId');
const getToken = require('./lib/getToken');
const {
  houseListURLs, port, requestFrquency, lineTokens, checkServiceStatus,
  subwayStationFilter, communityFilter,
} = require('./lib/getEnv');

let serviceStatus = true;
let countFail = 0;
houseListURLs.forEach(async (houseListURL) => {
  let originPostId = await getFirstPostId(houseListURL);
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
      const { data } = resp.body.data;
      const postIDList = data.map((rentDetail) => rentDetail.post_id);
      if (postIDList.includes(originPostId) === false) {
        [originPostId] = postIDList;
      }

      for (const rentDetail of data) {
        const { post_id: postID, community } = rentDetail;
        const {
          type: surroundingType = '',
          desc: destination = '',
          distance = '',
        } = rentDetail.surrounding;

        if (postID === originPostId) break;
        if (communityFilter.enable && !isFilterByCommunity(community)) continue;
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

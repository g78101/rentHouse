require('dotenv').config();

const targetURLs = JSON.parse(process.env.TARGET_URLS);
const houseListURLs = targetURLs.map((targetURL) => `https://rent.591.com.tw/home/search/rsList?${targetURL.split('?')[1]}`);
const isCheckServiceStatusEnabled = process.env.ENABLE_CHECK_SERVICE_STATUS === 'true';
const checkServiceStatusUrl = process.env.CHECK_SERVICE_STATUS_URL;
const port = process.env.PORT || 5000;
const requestFrquency = parseInt(process.env.REQUEST_FREQUENCY, 10) || 10000;
const lineTokens = JSON.parse(process.env.LINE_NOTIFY_TOKENS);
const isSubwayStationFilterEnabled = process.env.ENABLE_SUBWAY_STATION_FILTER === 'true';
const subwayStation = JSON.parse(process.env.SUBWAY_STATION_FILTER || '[]');
const subwayStationDistance = parseInt(process.env.SUBWAY_STATION_FILTER_DISTANCE, 10) || 1000;
const isCommunityFilterEnabled = process.env.ENABLE_COMMUNITY_FILTER === 'true';
const communityFilter = JSON.parse(process.env.COMMUNITY_FILTER || []);

module.exports = {
  houseListURLs,
  port,
  requestFrquency,
  lineTokens,
  checkServiceStatus: {
    enable: isCheckServiceStatusEnabled,
    url: checkServiceStatusUrl,
  },
  subwayStationFilter: {
    enable: isSubwayStationFilterEnabled,
    station: subwayStation,
    distance: subwayStationDistance,
  },
  communityFilter: {
    enable: isCommunityFilterEnabled,
    filter: communityFilter,
  },
};

require('dotenv').config();

const targetURL = process.env.TARGET_URL;
const houseListURL = `https://rent.591.com.tw/home/search/rsList?${targetURL.split('?')[1]}`;
const herokuURL = process.env.HEROKU_URL;
const port = process.env.PORT || 5000;
const requestFrquency = process.env.REQUEST_FREQUENCY;
const lineTokens = JSON.parse(process.env.LINE_NOTIFY_TOKENS);
const isSubwayStationFilterEnabled = process.env.ENABLE_SUBWAY_STATION_FILTER === 'true';
const subwayStation = JSON.parse(process.env.SUBWAY_STATION_FILTER);
const subwayStationDistance = parseInt(process.env.SUBWAY_STATION_FILTER_DISTANCE, 10) || 1000;

module.exports = {
  houseListURL,
  herokuURL,
  port,
  requestFrquency,
  lineTokens,
  subwayStationFilter: {
    enable: isSubwayStationFilterEnabled,
    station: subwayStation,
    distance: subwayStationDistance,
  },
};

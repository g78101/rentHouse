const { getRequest } = require('./request');
const getToken = require('./getToken');
require('dotenv').config();

module.exports = async (targetURL) => {
  const region = new URL(targetURL).searchParams.get('region');
  const headerInfo = await getToken();
  const csrfToken = headerInfo[0];
  let cookie = headerInfo[1];
  if (region) {
    cookie = `urlJumpIp=${region}; ${cookie}`;
  }
  const resp = await getRequest({
    url: targetURL,
    headers: {
      'X-CSRF-TOKEN': csrfToken,
      Cookie: cookie,
    },
    json: true,
  });
  if (resp.statusCode !== 200) throw `Token 可能過期了，目前 StatusCode: ${resp.statusCode}`;
  return resp.body.data.data[0].post_id;
};

const statuses = require('statuses');
const { send } = require('micro');
const { processHashtags } = require('../lib/cfp');
const { sortObjectsList } = require('../lib/utils');
const { CFP_SECRET } = require('../env');

module.exports = async (req, res) => {
  if (!req.query || !req.query.secret || req.query.secret !== CFP_SECRET) {
    return send(
      res,
      statuses.unauthorized,
      JSON.stringify({
        error: 'Unauthorized',
      }),
    );
  }

  try {
    const results = await processHashtags();
    res.end(JSON.stringify({
      hashtags: results.sort(sortObjectsList('count', false)),
    }));
  } catch (error) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({
        error: `Error on Hashtags process: ${error.message}`,
        detail: {
          message: error.message,
          stack: error.stack.split('\n'),
        },
      }),
    );
  }
};

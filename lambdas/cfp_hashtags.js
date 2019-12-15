const statuses = require('statuses');
const { send } = require('micro');
const { getHashtagsCount } = require('../lib/cfp');

module.exports = async (req, res) => {
  try {
    let useLimit = 30;
    const maxLimit = 50;
    if (req.query && req.query.limit) {
      const qLimit = Number(req.query.limit);
      if (!Number.isNaN(qLimit) && qLimit < maxLimit) {
        useLimit = qLimit;
      }
    }

    const hashtags = await getHashtagsCount(useLimit);
    res.end(JSON.stringify({ hashtags }));
  } catch (error) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({
        error: `Error getting the counters: ${error.message}`,
        detail: {
          message: error.message,
          stack: error.stack.split('\n'),
        },
      }),
    );
  }
};

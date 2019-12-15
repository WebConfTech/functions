const statuses = require('statuses');
const { send } = require('micro');
const { processHashtags } = require('../lib/cfp');
const { sortObjectsList } = require('../lib/utils');

module.exports = async (req, res) => {
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

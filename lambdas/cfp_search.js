const statuses = require('statuses');
const { send } = require('micro');
const { searchTweets } = require('../lib/twitter');
const {
  OPTIONS,
  getOptions,
  updateLastResultId,
} = require('../lib/cfp');

module.exports = async (req, res) => {
  try {
    const useOptions = await getOptions();
    const searchOptions = {
      query: useOptions[OPTIONS.SEARCH_VALUE].value,
    };

    let lastResultIdDoc = null;
    if (useOptions[OPTIONS.LAST_RESULT_ID]) {
      searchOptions.sinceId = Number(useOptions[OPTIONS.LAST_RESULT_ID].value);
      lastResultIdDoc = useOptions[OPTIONS.LAST_RESULT_ID].doc;
    }
    
    const tweets = await searchTweets(searchOptions);
    if (tweets.length) {
      const [{ id_str: lastResultId }] = tweets;
      await updateLastResultId(lastResultId, lastResultIdDoc);
    }

    res.end(JSON.stringify({ tweets: tweets.length }));
  } catch (error) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error on Twitter search: ${error.message}` })
    );
  }
};
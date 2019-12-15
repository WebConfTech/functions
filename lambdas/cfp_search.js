const statuses = require('statuses');
const { send } = require('micro');
const { searchTweets } = require('../lib/twitter');
const {
  OPTIONS,
  getOptions,
  updateLastResultId,
  formatTweets,
  filterBlacklistedTweets,
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
    
    let tweets = await searchTweets(searchOptions);

    if (tweets.length) {
      const [{ id_str: lastResultId }] = tweets;
      await updateLastResultId(lastResultId, lastResultIdDoc);
    }

    tweets = formatTweets(tweets);
    tweets = await filterBlacklistedTweets(tweets);

    res.end(JSON.stringify({ tweets }));
  } catch (error) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({ error: `Error on Twitter search: ${error.message}` })
    );
  }
};
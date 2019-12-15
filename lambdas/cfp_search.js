const statuses = require('statuses');
const { send } = require('micro');
const { searchTweets } = require('../lib/twitter');
const {
  OPTIONS,
  getOptions,
  updateLastResultId,
  formatTweets,
  filterBlacklistedTweets,
  normalizeTweetsHashtags,
  saveTweets,
} = require('../lib/cfp');

module.exports = async (req, res) => {
  try {
    const options = await getOptions();
    const searchOptions = {
      query: options[OPTIONS.SEARCH_VALUE].value,
    };

    let lastResultIdDoc = null;
    if (options[OPTIONS.LAST_RESULT_ID]) {
      searchOptions.sinceId = Number(options[OPTIONS.LAST_RESULT_ID].value);
      lastResultIdDoc = options[OPTIONS.LAST_RESULT_ID].doc;
    }
    
    let tweets = await searchTweets(searchOptions);

    if (tweets.length) {
      const [{ id_str: lastResultId }] = tweets;
      await updateLastResultId(lastResultId, lastResultIdDoc);
    }

    tweets = await formatTweets(tweets, options);
    tweets = tweets.filter((info) => !!info.hashtags.length);
    tweets = await filterBlacklistedTweets(tweets);
    tweets = await normalizeTweetsHashtags(tweets);
    tweets = await saveTweets(tweets);

    res.end(JSON.stringify({
      tweets: tweets.map(({ tweet, hashtags }) => ({ tweet, hashtags })),
    }));
  } catch (error) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({
        error: `Error on Twitter search: ${error.message}`,
        detail: {
          message: error.message,
          stack: error.stack,
        },
      })
    );
  }
};
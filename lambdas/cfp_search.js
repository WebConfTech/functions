const statuses = require('statuses');
const { send } = require('micro');
const { searchTweets } = require('../lib/twitter');
const {
  OPTIONS,
  getOptions,
  updateLastResultId,
  formatTweets,
  filterBlacklistedTweets,
  saveTweets,
  saveTweetsHashtags,
} = require('../lib/cfp');
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
    const options = await getOptions();
    const searchOptions = {
      query: options[OPTIONS.SEARCH_VALUE].value,
    };

    if (options[OPTIONS.LAST_RESULT_ID]) {
      searchOptions.sinceId = Number(options[OPTIONS.LAST_RESULT_ID].value);
    }

    let tweets = await searchTweets(searchOptions);

    if (tweets.length) {
      const [{ id_str: lastResultId }] = tweets;
      await updateLastResultId(lastResultId);
    }

    tweets = await formatTweets(tweets, options);
    tweets = tweets.filter((info) => info.hashtags.length > 0);
    tweets = await filterBlacklistedTweets(tweets);
    tweets = await saveTweets(tweets);

    let response;
    if (tweets.length) {
      await saveTweetsHashtags(tweets);
      response = JSON.stringify({
        tweets: tweets.map(({ tweet, hashtags }) => ({ tweet, hashtags })),
      });
    } else {
      response = JSON.stringify({
        message: 'No new tweets were found',
      });
    }

    res.end(response);
  } catch (error) {
    return send(
      res,
      statuses['bad request'],
      JSON.stringify({
        error: `Error on Twitter search: ${error.message}`,
        detail: {
          message: error.message,
          stack: error.stack.split('\n'),
        },
      }),
    );
  }
};

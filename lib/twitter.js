const querystring = require('querystring');
const Twit = require('twit');
const { sleep } = require('./utils');
const envVars = require('../env');

const getClient = () => new Twit({
  consumer_key: envVars.TWITTER_CONSUMER_KEY,
  consumer_secret: envVars.TWITTER_CONSUMER_SECRET,
  access_token: envVars.TWITTER_ACCESS_TOKEN,
  access_token_secret: envVars.TWITTER_ACCESS_TOKEN_SECRET,
});

const search = async (
  client,
  options,
  iteration,
  maxIterations,
) => {
  const thisIteration = iteration + 1;
  const response = await client.get('search/tweets', options);
  if (!response.data || !response.data.statuses) {
    return [];
  }

  const tweets = response.data.statuses;
  if (
    thisIteration < maxIterations
    && tweets.length === Number(options.count)
    && response.data.search_metadata
    && response.data.search_metadata.next_results
  ) {
    await sleep();
    const { next_results: url } = response.data.search_metadata;
    const nextTweets = await search(
      client,
      querystring.parse(url.replace(/^[\?&]/, '')),
      thisIteration,
      maxIterations,
    );

    tweets.push(...nextTweets);
  }

  return tweets;
};

const searchTweets = async ({
  client = null,
  query = '',
  count = 100,
  sinceId = undefined,
  resultType = 'recent',
  maxPages = 3,
  extras = {},
}) => {
  const useClient = client || getClient();
  if (!query) {
    throw new Error('You can\'t make a search without `query`');
  }

  const options = {
    q: query,
    count,
    result_type: resultType,
    since_id: sinceId,
    ...extras,
  };

  let tweets = await search(useClient, options, 0, maxPages);
  if (sinceId) {
    tweets = tweets.filter(({ id }) => id !== sinceId);
  }

  return tweets;
};

module.exports = {
  getClient,
  searchTweets,
};

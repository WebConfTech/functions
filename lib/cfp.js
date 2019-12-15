const { getDB } = require('./firebase');

const COLLECTIONS = {
  OPTIONS: 'options',
  BLACKLIST: 'blacklist',
  ALIASES: 'aliases',
};

const OPTIONS = {
  SEARCH_VALUE: 'search',
  SEARCH_HASHTAGS: 'searchHashtags',
  LAST_RESULT_ID: 'lastResultId',
};

const extractHashtags = (text) => {
  const regex = /(?:^|\s)(?:#([\w\d-_]+))/g;
  const hashtags = [];
  let match = regex.exec(text);
  while (match) {
    const [, hashtag] = match;
    /**
     * @todo remove toLowerCase()? the idea is avoid creating aliases for things like
     *       ux and UX.
     */
    hashtags.push(hashtag.trim().toLowerCase());
    match = regex.exec(text);
  }

  return hashtags;
}

let cachedOptions = null;
const getOptions = async (db = null) => {
  if (cachedOptions) {
    return cachedOptions;
  }

  const useDB = db || getDB();
  const docs = await useDB.collection(COLLECTIONS.OPTIONS).get();
  cachedOptions = {};
  docs.forEach((doc) => {
    const data = doc.data();
    cachedOptions[data.name] = {
      value: data.value,
      doc,
    };
  });

  cachedOptions[OPTIONS.SEARCH_HASHTAGS] = {
    value: extractHashtags(cachedOptions[OPTIONS.SEARCH_VALUE].value),
    doc: null,
  };

  return cachedOptions;
};

const updateLastResultId = async (id, doc = null, db = null) => {
  let newDoc;
  if (doc) {
    await doc.update({ value: id });
    newDoc = doc;
  } else {
    const useDB = db || getDB();
    newDoc = await useDB.collection(COLLECTIONS.OPTIONS).add({
      name: OPTIONS.LAST_RESULT_ID,
      value: id,
    });
  }

  if (cachedOptions) {
    cachedOptions[OPTIONS.LAST_RESULT_ID] = {
      value: id,
      doc: newDoc,
    };
  }
};

const extractTweetHashtags = async (tweet, options = null) => {
  if (tweet.entities && tweet.entities.hashtags) {
    let useOptions;
    if (options) {
      useOptions = options;
    } else {
      useOptions = await getOptions();
    }

    console.log('-> ', useOptions[OPTIONS.SEARCH_HASHTAGS].value);
    return tweet.entities.hashtags
    /**
     * @todo remove toLowerCase()? the idea is avoid creating aliases for things like
     *       ux and UX.
     */
    .map(({ text }) => text.toLowerCase())
    .filter((hashtag) => {
      console.log('---->', hashtag);
      return !useOptions[OPTIONS.SEARCH_HASHTAGS].value.includes(hashtag);
    })
    .reduce((acc, hashtag) => acc.includes(hashtag) ? acc : [...acc, hashtag], []);
  }

  return [];
}

const formatTweet = async (tweet, options = null) => ({
  tweet: {
    id: tweet.id_str,
    username: tweet.user.screen_name,
    tweet: tweet.text,
    url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
  },
  hashtags: await extractTweetHashtags(tweet, options),
});

const formatTweets = async (tweets, options = null) => Promise.all(tweets.map(async (tweet) => {
  const newTweet = await formatTweet(tweet, options);
  return newTweet;
}));

let cachedBlacklist = null;
const getBlacklist = async (db = null) => {
  if (cachedBlacklist) {
    return cachedBlacklist;
  }

  const useDB = db || getDB();
  const docs = await useDB.collection(COLLECTIONS.BLACKLIST).get();
  cachedBlacklist = {
    hashtags: [],
    usernames: [],
  };
  docs.forEach((doc) => {
    const data = doc.data();
    if (data.hashtag) {
      cachedBlacklist.hashtags.push(data.hashtag);
    }
    if (data.username) {
      cachedBlacklist.usernames.push(data.username);
    }
  });

  return cachedBlacklist;
};

const filterBlacklistedTweets = async (formattedTweets, db = null) => {
  const blacklist = await getBlacklist(db);
  return formattedTweets.filter((info) => {
    if (blacklist.usernames.includes(info.tweet.username)) {
      return false;
    }

    if (info.hashtags.some((hashtag) => blacklist.hashtags.includes(hashtag))) {
      return false;
    }

    return true;
  });
};

let cachedAliases = null;
const getAliases = async (db = null) => {
  if (cachedAliases) {
    return cachedAliases;
  }

  const useDB = db || getDB();
  const docs = await useDB.collection(COLLECTIONS.ALIASES).get();
  cachedAliases = {};
  docs.forEach((doc) => {
    const data = doc.data();
    cachedAliases[data.from] = data.hashtag;
  });

  return cachedAliases;
};

const normalizeTweetsHashtags = async (formattedTweet, db = null) => {
  const aliases = await getAliases(db);
  return formattedTweet.map((info) => Object.assign({}, info, {
    hashtags: (
      info.hashtags
      .map((hashtag) => aliases[hashtag] || hashtag)
      .reduce((acc, hashtag) => acc.includes(hashtag) ? acc : [...acc, hashtag], [])
    )
  }));
};

module.exports = {
  COLLECTIONS,
  OPTIONS,
  getOptions,
  updateLastResultId,
  formatTweet,
  formatTweets,
  filterBlacklistedTweets,
  normalizeTweetsHashtags,
};
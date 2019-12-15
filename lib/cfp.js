const { getDB } = require('./firebase');

const COLLECTIONS = {
  OPTIONS: 'options',
  BLACKLIST: 'blacklist',
};

const OPTIONS = {
  SEARCH_VALUE: 'search',
  LAST_RESULT_ID: 'lastResultId',
};


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
}

const formatTweet = (tweet) => ({
  tweet: {
    id: tweet.id_str,
    username: tweet.user.screen_name,
    tweet: tweet.text,
    url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
  },
  hashtags: (
    tweet.entities && tweet.entities.hashtags ?
      /**
       * @todo remove toLowerCase()? the idea is avoid creating aliases for things like
       *       ux and UX.
       */
      tweet.entities.hashtags.map(({ text }) => text.toLowerCase()) :
      []
  ),
});

const formatTweets = (tweets) => tweets.map((tweet) => formatTweet(tweet));

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
      console.log('IGNORED BY HASH', info);
      return false;
    }

    return true;
  });
}

module.exports = {
  COLLECTIONS,
  OPTIONS,
  getOptions,
  updateLastResultId,
  formatTweet,
  formatTweets,
  filterBlacklistedTweets,
};
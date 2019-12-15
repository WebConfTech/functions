const { getDB } = require('./firebase');

const COLLECTIONS = {
  OPTIONS: 'options',
  BLACKLIST: 'blacklist',
  ALIASES: 'aliases',
  TWEETS: 'tweets',
  HASHTAGS: 'hashtags',
  ENTRIES: 'entries',
  COUNTERS: 'counters',
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
};

const getOptions = async (db = null) => {
  const useDB = db || getDB();
  const result = await useDB.collection(COLLECTIONS.OPTIONS).get();
  const options = result.docs.reduce(
    (acc, doc) => {
      const data = doc.data();
      return {
        ...acc,
        ...{
          [data.name]: {
            value: data.value,
            doc,
          },
        },
      };
    },
    {},
  );

  options[OPTIONS.SEARCH_HASHTAGS] = {
    value: extractHashtags(options[OPTIONS.SEARCH_VALUE].value),
    doc: null,
  };

  return options;
};

const updateLastResultId = async (id, db = null) => {
  const useDB = db || getDB();
  const collection = useDB.collection(COLLECTIONS.OPTIONS);
  const savedOption = await collection.where('name', '==', OPTIONS.LAST_RESULT_ID).get();
  if (savedOption.empty) {
    await collection.add({
      name: OPTIONS.LAST_RESULT_ID,
      value: id,
    });
  } else {
    const [doc] = savedOption.docs;
    await collection.doc(doc.id).update({ value: id });
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

    return tweet.entities.hashtags
      /**
       * @todo remove toLowerCase()? the idea is avoid creating aliases for things like
       *       ux and UX.
       */
      .map(({ text }) => text.toLowerCase())
      .filter((hashtag) => !useOptions[OPTIONS.SEARCH_HASHTAGS].value.includes(hashtag))
      .reduce((acc, hashtag) => (acc.includes(hashtag) ? acc : [...acc, hashtag]), []);
  }

  return [];
};

const formatTweet = async (tweet, options = null) => ({
  tweet: {
    tweetId: tweet.id_str,
    username: tweet.user.screen_name,
    tweet: tweet.text,
    url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
    time: new Date(),
  },
  hashtags: await extractTweetHashtags(tweet, options),
  doc: null,
  isNew: true,
});

const formatTweets = async (tweets, options = null) => Promise.all(tweets.map(async (tweet) => {
  const newTweet = await formatTweet(tweet, options);
  return newTweet;
}));

const getBlacklist = async (db = null) => {
  const useDB = db || getDB();
  const results = await useDB.collection(COLLECTIONS.BLACKLIST).get();
  return results.docs.reduce(
    (acc, doc) => {
      const nextAcc = { ...acc };
      const data = doc.data();
      if (data.hashtag) {
        nextAcc.hashtags.push(data.hashtag);
      }
      if (data.username) {
        nextAcc.usernames.push(data.username);
      }

      return nextAcc;
    },
    {
      hashtags: [],
      usernames: [],
    },
  );
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

const getAliases = async (db = null) => {
  const useDB = db || getDB();
  const result = await useDB.collection(COLLECTIONS.ALIASES).get();
  return result.docs.reduce(
    (acc, doc) => {
      const data = doc.data();
      return {
        ...acc,
        ...{
          [data.from]: data.hashtag,
        },
      };
    },
    {},
  );
};

const normalizeTweetsHashtags = async (formattedTweet, db = null) => {
  const aliases = await getAliases(db);
  return formattedTweet.map((info) => ({
    ...info,
    ...{
      hashtags: (
        info.hashtags
          .map((hashtag) => aliases[hashtag] || hashtag)
          .reduce((acc, hashtag) => (acc.includes(hashtag) ? acc : [...acc, hashtag]), [])
      ),
    },
  }));
};

const saveTweet = async (formattedTweet, db = null) => {
  const useDB = db || getDB();
  const collection = useDB.collection(COLLECTIONS.TWEETS);
  let doc;
  let isNew = false;
  const savedTweet = await collection.where('tweetId', '==', formattedTweet.tweet.tweetId).get();
  if (savedTweet.empty) {
    doc = await collection.add(formattedTweet.tweet);
    isNew = true;
  } else {
    [doc] = savedTweet.docs;
  }

  return {
    ...formattedTweet,
    ...{
      doc,
      isNew,
    },
  };
};

const saveTweets = async (formattedTweets, db = null) => {
  const newTweets = await Promise.all(formattedTweets.map(async (tweet) => {
    const newTweet = await saveTweet(tweet, db);
    return newTweet;
  }));

  return newTweets.filter((info) => info.isNew);
};

const saveHashtag = async (hashtag, tweetDocId, db = null) => {
  const useDB = db || getDB();
  const collection = useDB.collection(COLLECTIONS.HASHTAGS);
  const savedHashtag = await collection.where('hashtag', '==', hashtag).get();
  if (savedHashtag.empty) {
    await collection.add({
      hashtag,
      tweetId: tweetDocId,
      count: 1,
    });
  } else {
    const [doc] = savedHashtag.docs;
    await collection.doc(doc.id).update({
      count: doc.data().count + 1,
    });
  }
};

const saveTweetHashtags = async (formattedTweet, db = null) => {
  if (!formattedTweet.doc) {
    throw new Error('You first need to save the tweet');
  }

  const { hashtags, doc: { id: tweetDocId } } = formattedTweet;
  await Promise.all(hashtags.map(async (hashtag) => {
    await saveHashtag(hashtag, tweetDocId, db);
  }));
};

const saveTweetsHashtags = async (formattedTweets, db = null) => {
  await Promise.all(formattedTweets.map(async (tweet) => {
    await saveTweetHashtags(tweet, db);
  }));
};

const saveHashtagCount = async (hashtag, count, db = null) => {
  const useDB = db || getDB();
  const collection = useDB.collection(COLLECTIONS.COUNTERS);
  const savedCounter = await collection.where('hashtag', '==', hashtag).get();
  if (savedCounter.empty) {
    await collection.add({
      hashtag,
      count,
    });
  } else {
    const [doc] = savedCounter.docs;
    await collection.doc(doc.id).update({ count });
  }

  return {
    hashtag,
    count,
  };
};

const processHashtags = async (db = null) => {
  const useDB = db || getDB();
  const hashtagsResult = await useDB.collection(COLLECTIONS.HASHTAGS).get();
  const hashtags = hashtagsResult.docs.reduce(
    (acc, doc) => {
      const data = doc.data();
      return {
        ...acc,
        [data.hashtag]: data.count,
      };
    },
    {},
  );
  const entriesResult = await useDB.collection(COLLECTIONS.ENTRIES).get();
  const calculated = entriesResult.docs.reduce(
    (acc, doc) => {
      const data = doc.data();
      const nextAcc = { ...acc };
      if (nextAcc[data.hashtag]) {
        nextAcc[data.hashtag] += data.value;
      } else {
        nextAcc[data.hashtag] = data.value;
      }

      return nextAcc;
    },
    hashtags,
  );

  const results = await Promise.all(Object.keys(calculated).map(async (key) => {
    const newCount = await saveHashtagCount(key, calculated[key], db);
    return newCount;
  }));

  return results;
};

const getHashtagsCount = async (limit, db = null) => {
  const useDB = db || getDB();
  const result = await useDB.collection(COLLECTIONS.COUNTERS)
    .orderBy('count', 'desc')
    .get();

  return result.docs.reduce(
    (acc, doc) => {
      const data = doc.data();
      return [...acc, {
        hashtag: data.hashtag,
        count: data.count,
      }];
    },
    [],
  );
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
  saveTweets,
  saveTweetsHashtags,
  processHashtags,
  getHashtagsCount,
};

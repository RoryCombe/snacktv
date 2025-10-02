import { log } from './utils';

const mapVideos = (json: STV.Subreddit) => {
  return json.data.children.reduce((acc, child, index) => {
    if (child.data.media) {
      acc.push({ id: index + 1, media: child.data.media.oembed, length: child.data.link_flair_text });
    }
    return acc;
  }, [] as Array<STV.Video>);
};

const fetchVideos = async (category: STV.Category, timeframe: STV.Timeframe = 'all') => {
  const urlSearchParams = new URLSearchParams({ limit: '100', t: timeframe });
  const res = await fetch(`https://www.reddit.com/r/mealtimevideos/${category}/.json?${urlSearchParams}`);
  const json = (await res.json()) as STV.Subreddit;
  const mapped = mapVideos(json);
  localStorage.setItem(`${category}-${timeframe}`, JSON.stringify(mapped));
  return mapped;
};

export const getVideos = async (category: STV.Category, timeframe: STV.Timeframe = 'all', length?: STV.Length) => {
  const cached = localStorage.getItem(`${category}-${timeframe}`);
  let videos = [];

  if (cached) {
    log('Getting videos from cache');
    videos = JSON.parse(cached) as Array<STV.Video>;
  } else {
    log('Getting videos from API');
    videos = await fetchVideos(category, timeframe);
  }

  if (length) {
    videos = videos.filter((video) => video.length.startsWith(length));
  }

  return videos;
};

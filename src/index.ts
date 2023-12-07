import { chunk } from './utils';
import './components/video-row';
import './components/time-select';

let currentCategory: STV.Category = 'hot';
const cache = new Map<string, { videos: Array<STV.Video>; flair: Set<string> }>();

const generateCacheKey = (category: STV.Category, timeframe?: STV.Timeframe) =>
  `${category}${category === 'top' ? `-${timeframe}` : ''}`;

const generateFlair = (videos: Array<STV.Video>) => {
  const flair = new Set<string>();
  videos.forEach((v) => {
    if (v.data.link_flair_text) {
      flair.add(v.data.link_flair_text);
    }
  });
  return flair;
};

const flairFilter = (selectedFlair: string) => (video: STV.Video) => {
  if (selectedFlair) {
    return video.data.link_flair_text === selectedFlair;
  }
  return true;
};

const fetchVideos = async (category: STV.Category, timeframe: STV.Timeframe = 'all') => {
  const urlSearchParams = new URLSearchParams({ limit: '100', t: timeframe });
  const res = await fetch(`https://www.reddit.com/r/mealtimevideos/${category}/.json?${urlSearchParams}`);
  const json = (await res.json()) as STV.Subreddit;
  return json.data.children.filter((child) => !!child.data.media).map((child, snackTvId) => ({ ...child, snackTvId }));
};

const preWarmCache = async () => {
  return Promise.all(
    (
      [
        ['top', 'hour'],
        ['top', 'day'],
        ['top', 'week'],
        ['top', 'month'],
        ['top', 'year'],
        ['top', 'all'],
        // ['hot'],
        ['new'],
        ['rising'],
        ['controversial'],
      ] as Array<[category: STV.Category, timeframe?: STV.Timeframe]>
    ).map(async ([category, timeframe]) => {
      const videos = await fetchVideos(category, timeframe);
      const flair = generateFlair(videos);
      cache.set(generateCacheKey(category, timeframe), { videos, flair });
    })
  );
};

const loadVideosAndFlair = async ({
  category,
  timeframe,
}: {
  category: STV.Category;
  timeframe?: STV.Timeframe;
}): Promise<{ videos: Array<STV.Video>; flair: Set<string> }> => {
  const cacheKey = generateCacheKey(category, timeframe);
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Setting videos from cache for category', cacheKey);
    return cached;
  } else {
    console.log('Fetching videos for category', category, timeframe);
    const videos = await fetchVideos(category, timeframe);
    const flair = generateFlair(videos);
    cache.set(cacheKey, { videos, flair });
    return { videos, flair };
  }
};

const render = ({
  videos,
  category,
  timeframe,
}: {
  videos: Array<STV.Video>;
  category: STV.Category;
  timeframe?: STV.Timeframe;
}) => {
  document.querySelector('#video-grid')!.innerHTML = '';

  // render video rows
  chunk(videos, 4).map((vids) => {
    const videoRow = document.createElement('stv-video-row');
    document.querySelector('#video-grid')!.append(videoRow);
    (videoRow as any).videos = vids;
  });

  listen();
  setActiveLinks({ category, timeframe });
};

const listen = () => {
  document.querySelectorAll('.category-link').forEach((l) => {
    l.addEventListener('click', (e) => categoryLinkClicked(e));
  });

  document.querySelectorAll('.timeframe-link').forEach((l) => {
    l.addEventListener('click', (e) => timeframeLinkClicked(e));
  });

  document.querySelector('#flair')?.addEventListener('change', (e) => {
    const selectedFlair = (e.target as HTMLSelectElement).selectedOptions[0].innerText;
    initialise({ selectedFlair });
    // this.selectedFlair = selection.includes('Please choose') ? '' : selection;
    // this.render();
  });
};

const setActiveLinks = ({ category, timeframe }: { category: STV.Category; timeframe?: STV.Timeframe }) => {
  document.querySelectorAll<HTMLAnchorElement>('.category-link').forEach((l) => {
    if (l.dataset.category === category) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });

  if (category === 'top') {
    document.querySelectorAll<HTMLAnchorElement>('.timeframe-link').forEach((l) => {
      if (category === 'top' && l.dataset.timeframe === timeframe) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });
  }
};

const categoryLinkClicked = (event: Event) => {
  const category = ((event.target as HTMLAnchorElement).dataset.category ?? '') as STV.Category;
  currentCategory = category;
  if (category !== 'top') {
    initialise({ category });
  }
};

const timeframeLinkClicked = (event: Event) => {
  initialise({
    category: 'top',
    timeframe: ((event.target as HTMLAnchorElement).dataset.timeframe ?? '') as STV.Timeframe,
  });
  document.querySelector('#top-dropdown')!.removeAttribute('open');
};

const initialise = async ({
  category = currentCategory,
  timeframe,
  selectedFlair,
  prewarm,
}: {
  category?: STV.Category;
  timeframe?: STV.Timeframe;
  selectedFlair?: string;
  prewarm?: boolean;
}) => {
  const data = await loadVideosAndFlair({ category, timeframe });
  const videos = selectedFlair ? data.videos.filter(flairFilter(selectedFlair)) : data.videos;
  console.log('Initialised');
  console.log('Cache', cache);

  document.querySelector<TimeSelect>('stv-time-select')?.setFlair(data.flair);

  if ((document as any).startViewTransition) {
    (document as any).startViewTransition(() => {
      render({ videos, category, timeframe });
    });
  } else {
    render({ videos, category, timeframe });
  }

  if (prewarm) {
    console.log('Pre-warming cache');
    await preWarmCache();
    console.log('Warmed');
    console.log('Cache', cache);
  }
};

initialise({ prewarm: true });

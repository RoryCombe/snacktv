const htmlDecode = (input: string) => {
  var doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.documentElement.textContent || '';
};

const chunk = (input: Array<any>, size: number) => {
  return input.reduce((arr, item, idx) => {
    return idx % size === 0 ? [...arr, [item]] : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
  }, []);
};

const map = (arr: Array<any>, fn: (value: any, index: number, array: Array<any>) => unknown) => arr.map(fn).join('');

const flairOrder = ['5-7 Minutes', '7-10 Minutes', '10-15 Minutes', '15-30 Minutes', '30 Minutes Plus', '20%'];

class SnackTV extends HTMLElement {
  cache = new Map<string, { videos: Array<STV.Video>; flair: Set<string> }>();

  videos: Array<STV.Video> = [];
  flair: Set<string> = new Set();
  selectedFlair: string = '';
  watchElemId: string = '';
  watchElem: string = '';

  constructor() {
    super();
    this.initialise();
    this.preWarmCache();
  }

  get category() {
    const params = new URLSearchParams(location.search);
    return (params.get('category') ?? this.getAttribute('category') ?? 'top') as STV.Category;
  }

  set category(value: STV.Category) {
    this.setAttribute('category', value);
  }

  get timeframe() {
    const params = new URLSearchParams(location.search);
    return (params.get('timeframe') ?? this.getAttribute('timeframe') ?? 'all') as STV.Timeframe;
  }

  set timeframe(value: STV.Timeframe) {
    this.setAttribute('timeframe', value);
  }

  get cacheKey() {
    return this.generateCacheKey(this.category, this.timeframe);
  }

  generateCacheKey(category: STV.Category, timeframe?: STV.Timeframe) {
    return `${category}${category === 'top' ? `-${timeframe}` : ''}`;
  }

  generateFlair(videos: Array<STV.Video>) {
    const flair = new Set<string>();
    videos.forEach((v) => {
      if (v.data.link_flair_text) {
        flair.add(v.data.link_flair_text);
      }
    });
    return flair;
  }

  listen() {
    this.querySelectorAll('.video, .title-link').forEach((v) => {
      v.addEventListener('click', (e) => this.videoLinkClicked(e));
    });

    this.querySelectorAll('.category-link').forEach((l) => {
      l.addEventListener('click', (e) => this.categoryLinkClicked(e));
    });

    this.querySelectorAll('.timeframe-link').forEach((l) => {
      l.addEventListener('click', (e) => this.timeframeLinkClicked(e));
    });

    this.querySelector('#flair')?.addEventListener('change', (e) => {
      const selection = (e.target as HTMLSelectElement).selectedOptions[0].innerText;
      this.selectedFlair = selection.includes('Please choose') ? '' : selection;
      this.render();
    });
  }

  setActiveLinks() {
    this.querySelectorAll<HTMLAnchorElement>('.category-link').forEach((l) => {
      if (l.dataset.category === this.category) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });
    this.querySelectorAll<HTMLAnchorElement>('.timeframe-link').forEach((l) => {
      if (this.category === 'top' && l.dataset.timeframe === this.timeframe) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });
  }

  categoryLinkClicked(event: Event) {
    this.category = ((event.target as HTMLAnchorElement).dataset.category ?? '') as STV.Category;
    if (this.category !== 'top') {
      this.timeframe = '';
      this.initialise();
    }
  }

  timeframeLinkClicked(event: Event) {
    this.category = 'top';
    this.timeframe = ((event.target as HTMLAnchorElement).dataset.timeframe ?? '') as STV.Timeframe;
    this.initialise();
  }

  videoLinkClicked(event: Event) {
    const { videoIndex = '' } = (event.target as HTMLDivElement).dataset;
    const { data } = this.videos[+videoIndex];
    const content = data.media_embed.content
      ? htmlDecode(data.media_embed.content)
      : `<video src="${data.url}"></video>`;

    if (this.watchElemId) {
      this.querySelector(this.watchElemId)!.innerHTML = this.watchElem;
    }

    const elemId = `#video_${videoIndex}`;
    const elem = this.querySelector(elemId);

    this.watchElemId = elemId;
    this.watchElem = elem?.innerHTML ?? '';

    elem!.innerHTML = content;
  }

  async fetchVideos(category: STV.Category, timeframe: STV.Timeframe = 'all') {
    const urlSearchParams = new URLSearchParams({ limit: '100', t: timeframe });
    const res = await fetch(`https://www.reddit.com/r/mealtimevideos/${category}/.json?${urlSearchParams}`);
    const json = (await res.json()) as STV.Subreddit;
    return json.data.children
      .filter((child) => !!child.data.media)
      .map((child, snackTvId) => ({ ...child, snackTvId }));
  }

  async initialise() {
    const cached = this.cache.get(this.cacheKey);
    if (cached) {
      console.log('Setting videos from cache for category', this.cacheKey);
      this.videos = cached.videos;
      this.flair = cached.flair;
    } else {
      console.log('Fetching videos for category', this.category, this.timeframe);
      this.videos = await this.fetchVideos(this.category, this.timeframe);
      this.flair = this.generateFlair(this.videos);
      this.cache.set(this.cacheKey, { videos: this.videos, flair: this.flair });
    }
    this.render();
  }

  async preWarmCache() {
    (
      [
        ['top', 'hour'],
        ['top', 'day'],
        ['top', 'week'],
        ['top', 'month'],
        ['top', 'year'],
        ['hot'],
        ['new'],
        ['rising'],
      ] as Array<[category: STV.Category, timeframe?: STV.Timeframe]>
    ).forEach(async ([category, timeframe]) => {
      const videos = await this.fetchVideos(category, timeframe);
      const flair = this.generateFlair(videos);
      this.cache.set(this.generateCacheKey(category, timeframe), { videos, flair });
    });
  }

  flairFilter(video: STV.Video) {
    if (this.selectedFlair) {
      return video.data.link_flair_text === this.selectedFlair;
    }
    return true;
  }

  renderVideo(video: STV.Video) {
    if (video === null) return `<div></div>`;
    const {
      snackTvId,
      data: { title, link_flair_text, secure_media },
    } = video;
    return `
      <div>
        <div 
          id="video_${snackTvId}"
          class="video"
          data-video-index="${snackTvId}"
          style="background-image: url(${secure_media?.oembed?.thumbnail_url ?? 'play.png'})"
        ></div>
        <div>
          <a class="title-link" data-video-index="${snackTvId}" title="${title}">${title}</a>
          <kbd>${link_flair_text}</kbd>
        </div>
      </div>
    `;
  }

  renderVideoRow(videos: Array<STV.Video>) {
    const vids = videos.length === 4 ? videos : videos.concat(Array(4 - videos.length).fill(null));
    return `<div class="grid">${map(vids, this.renderVideo)}</div>`;
  }

  renderView() {
    const videoChunks = chunk(this.videos.filter(this.flairFilter.bind(this)), 4);
    this.innerHTML = `
      <nav>
        <ul>
          <li>
            <h1 class="brand">📺<span> Snack TV</span></h1>
          </li>
          <li>
            <details role="list" dir="rtl">
              <summary aria-haspopup="listbox" role="link" class="category-link" data-category="top">Top</summary>
              <ul role="listbox">
                <li><a href="#" class="timeframe-link" data-timeframe="hour">Hour</a></li>
                <li><a href="#" class="timeframe-link" data-timeframe="day">Day</a></li>
                <li><a href="#" class="timeframe-link" data-timeframe="week">Week</a></li>
                <li><a href="#" class="timeframe-link" data-timeframe="month">Month</a></li>
                <li><a href="#" class="timeframe-link" data-timeframe="year">Year</a></li>
                <li><a href="#" class="timeframe-link" data-timeframe="all">All</a></li>
              </ul>
            </details>
          </li>
          <li><a href="#" class="category-link" data-category="hot">Hot</a></li>
          <li><a href="#" class="category-link" data-category="new">New</a></li>
          <li><a href="#" class="category-link" data-category="rising">Rising</a></li>
        </ul>
        <ul>
          <li>
            <select id="flair">
              <option value=""${!this.selectedFlair ? ' selected' : ''}>Time</option>
              ${Array.from(this.flair)
                .sort((a, b) => flairOrder.indexOf(a) - flairOrder.indexOf(b))
                .map((f) => `<option value="${f}"${this.selectedFlair === f ? ' selected' : ''}>${f}</option>`)
                .join('')}
            </select>
          </li>
        </ul>
      </nav>
      ${map(videoChunks, this.renderVideoRow.bind(this))}
    `;
    this.listen();
    this.setActiveLinks();
  }

  render() {
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() => {
        this.renderView();
      });
    } else {
      this.renderView();
    }
  }
}

customElements.define('snack-tv', SnackTV);

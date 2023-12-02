const htmlDecode = (input) => {
  var doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.documentElement.textContent || '';
};

const chunk = (input, size) => {
  return input.reduce((arr, item, idx) => {
    return idx % size === 0 ? [...arr, [item]] : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
  }, []);
};

const map = (arr, fn) => arr.map(fn).join('');

class SnackTV extends HTMLElement {
  cache = new Map();

  constructor(props) {
    super(props);
    this.initialise();
    this.preWarmCache();
  }

  get category() {
    const params = new URLSearchParams(location.search);
    return params.get('category') ?? this.getAttribute('category') ?? 'top';
  }

  set category(value) {
    this.setAttribute('category', value);
  }

  get timeframe() {
    const params = new URLSearchParams(location.search);
    return params.get('timeframe') ?? this.getAttribute('timeframe') ?? 'all';
  }

  set timeframe(value) {
    this.setAttribute('timeframe', value);
  }

  get cacheKey() {
    return this.generateCacheKey(this.category, this.timeframe);
  }

  generateCacheKey(category, timeframe) {
    return `${category}${category === 'top' ? `-${timeframe}` : ''}`;
  }

  generateFlair(videos) {
    const flair = new Set();
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
  }

  setActiveLinks() {
    this.querySelectorAll('.category-link').forEach((l) => {
      if (l.dataset.category === this.category) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });
    this.querySelectorAll('.timeframe-link').forEach((l) => {
      if (this.category === 'top' && l.dataset.timeframe === this.timeframe) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });
  }

  categoryLinkClicked(event) {
    this.category = event.target.dataset.category;
    if (this.category !== 'top') {
      this.timeframe = '';
      this.initialise();
    }
  }

  timeframeLinkClicked(event) {
    this.category = 'top';
    this.timeframe = event.target.dataset.timeframe;
    this.initialise();
  }

  videoLinkClicked(event) {
    const { videoIndex } = event.target.dataset;
    const { data } = this.videos[videoIndex];
    const content = data.media_embed.content
      ? htmlDecode(data.media_embed.content)
      : `<video src="${data.url}"></video>`;

    if (this.watchElemId) {
      this.querySelector(this.watchElemId).innerHTML = this.watchElem;
    }

    const elemId = `#video_${videoIndex}`;
    const elem = this.querySelector(elemId);

    this.watchElemId = elemId;
    this.watchElem = elem.innerHTML;

    elem.innerHTML = content;
  }

  async fetchVideos(category, timeframe = '') {
    const urlSearchParams = new URLSearchParams({ limit: 100, t: timeframe });
    const res = await fetch(`https://www.reddit.com/r/mealtimevideos/${category}/.json?${urlSearchParams}`);
    const json = await res.json();
    return json.data.children.map((child, snackTvId) => ({ ...child, snackTvId }));
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
    console.log('Cache', this.cache);

    document.startViewTransition(() => {
      this.render();
      this.listen();
      this.setActiveLinks();
    });
  }

  async preWarmCache() {
    [
      ['top', 'hour'],
      ['top', 'day'],
      ['top', 'week'],
      ['top', 'month'],
      ['top', 'year'],
      ['hot'],
      ['new'],
      ['rising'],
    ].forEach(async ([category, timeframe]) => {
      const videos = await this.fetchVideos(category, timeframe);
      const flair = this.generateFlair(videos);
      this.cache.set(this.generateCacheKey(category, timeframe), { videos, flair });
    });
  }

  renderVideo(video) {
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
        <!-- ${JSON.stringify(video, null, 2)} -->
      </div>
    `;
  }

  renderVideoRow(videos) {
    const vids = videos.length === 4 ? videos : videos.concat(Array(4 - videos.length).fill(null));
    return `<div class="grid">${map(vids, this.renderVideo)}</div>`;
  }

  render() {
    const videoChunks = chunk(this.videos, 4);
    this.innerHTML = `
      <nav>
        <ul>
          <li>
            <h1 class="brand">📺 Snack TV</h1>
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
          <li><div>How much time have you got?</div></li>
          <li>
            <select id="fruit" required>
              <option value="" selected>Select a time frame...</option>
              ${Array.from(this.flair)
                .sort()
                .map((f) => `<option>${f}</option>`)
                .join('')}
            </select>
          </li>
        </ul>
      </nav>
      ${map(videoChunks, this.renderVideoRow.bind(this))}
    `;
  }
}

customElements.define('snack-tv', SnackTV);

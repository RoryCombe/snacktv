function htmlDecode(input) {
  var doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.documentElement.textContent || '';
}

class SnackTV extends HTMLElement {
  constructor(props) {
    super(props);
    this.loadVideos();
  }

  get category() {
    const params = new URLSearchParams(location.search);
    return params.get('category') ?? this.getAttribute('category') ?? 'top';
  }

  listen() {
    this.querySelectorAll('.video').forEach((v) => v.addEventListener('click', (e) => this.watch(e)));
  }

  watch(event) {
    console.log('Video clicked', event);
    const index = event.detail;
    this.querySelector(`#video_${index}`).innerHTML = htmlDecode(this.videos[index].data.media_embed.content);
  }

  async loadVideos() {
    const resp = await (await fetch(`https://www.reddit.com/r/mealtimevideos/${this.category}/.json`)).json();
    this.videos = resp.data.children;
    this.render();
    this.listen();
  }

  renderVideo(video, index) {
    const {
      data: { title, link_flair_text, secure_media },
    } = video;
    return `
      <article id="card_${index}">
        <div id="video_${index}" class="video">
          <img class="thumbnail" src="${secure_media?.oembed?.thumbnail_url}" />
        </div>
        <div class="description">
          <a onclick="">${title}</a>
          <br />
          <kbd>${link_flair_text}</kbd>
        </div>
        <!-- ${JSON.stringify(video, null, 2)} -->
      </article>
    `;
  }

  render() {
    this.innerHTML = `
      <div class="header">
        <div><h3>📺 (${this.category} ${this.videos.length})</h3></div>
        <div>
          <a href="?category=top">Top</a>
          <a href="?category=hot">Hot</a>
          <a href="?category=new">New</a>
          <a href="?category=rising">Rising</a>
        </div>
      </div>
      <div class="videos">${this.videos.map(this.renderVideo).join('')}</div>
    `;
  }
}

customElements.define('snack-tv', SnackTV);

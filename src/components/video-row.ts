import { htmlDecode, map } from '../utils';

class VideoRow extends HTMLElement {
  vids: Array<STV.Video> = [];
  watchElemId: string = '';
  watchElem: string = '';

  static observedAttributes = ['mute'];

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'mute') {
      if (this.watchElemId) {
        this.querySelector(this.watchElemId)!.innerHTML = this.watchElem;
      }
    }
  }

  get videos() {
    return this.vids.length === 4 ? this.vids : this.vids.concat(Array(4 - this.vids.length).fill(null));
  }

  set videos(vids: Array<STV.Video>) {
    this.vids = vids;
    this.render();
  }

  listen() {
    this.querySelectorAll('.video, .title-link').forEach((v) => {
      v.addEventListener('click', (e) => this.videoLinkClicked(e));
    });
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

  renderVideo(video: STV.Video, index: number) {
    if (video === null) return `<div></div>`;
    const {
      data: { title, link_flair_text, secure_media },
    } = video;
    return `
      <div>
        <div 
          id="video_${index}"
          class="video"
          data-video-index="${index}"
          style="background-image: url(${secure_media?.oembed?.thumbnail_url ?? 'play.png'})"
        ></div>
        <div>
          <a class="title-link" data-video-index="${index}" title="${title}">${title}</a>
          <kbd>${link_flair_text}</kbd>
        </div>
      </div>
    `;
  }

  render() {
    this.innerHTML = `<div class="grid">${map(this.videos, this.renderVideo)}</div>`;
    this.listen();
  }
}

customElements.define('stv-video-row', VideoRow);

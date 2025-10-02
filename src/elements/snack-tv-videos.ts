import { log } from '../utils';

export class SnackTvVideos extends HTMLElement {
  constructor() {
    super();
  }

  get category() {
    return this.getAttribute('category');
  }

  set videos(videos: Array<STV.Video>) {
    log(videos[0]);
    const videosHtml = videos.map((video) => this.createVideoHtml(video));
    this.append(...videosHtml);
  }

  createVideoHtml(video: STV.Video) {
    const snackTvVideo = document.createElement('article');
    snackTvVideo.innerHTML = `
      <img src="${video.media.thumbnail_url}" loading="lazy" />
      <footer><a href="/${this.category}/${video.id}${location.search}">${video.media.title}</a></footer>
    `;
    snackTvVideo.dataset.videoId = video.id.toString();
    return snackTvVideo;
  }
}

export class SnackTvVideo extends HTMLElement {
  constructor() {
    super();
  }

  get videoId() {
    return this.getAttribute('video-id');
  }

  set video(video: STV.Video) {
    // Decode the HTML entities before inserting
    const decodedHtml = this.decodeHtmlEntities(video.media.html);
    this.innerHTML = decodedHtml;
  }

  private decodeHtmlEntities(html: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }
}

import { log } from './utils';
import { getVideos } from './api';
import { SnackTvVideo } from './elements/snack-tv-video';
import { SnackTvVideos } from './elements/snack-tv-videos';

customElements.define('snack-tv-video', SnackTvVideo);
customElements.define('snack-tv-videos', SnackTvVideos);

log(process.env.NODE_ENV);

async function main() {
  const paths = window.location.pathname.split('/');
  const searchParams = new URLSearchParams(window.location.search);
  const timeframe = (searchParams.get('timeframe') as STV.Timeframe) ?? 'all';
  const length = (searchParams.get('length') as STV.Length) ?? '';

  log('paths', paths);

  const category = paths[1] as STV.Category;
  const videoId = paths[2];

  const videos = await getVideos(category, timeframe, length);

  if (videoId) {
    document.getElementById('subnav')!.hidden = true;
    const snackTvVideo = document.createElement('snack-tv-video') as SnackTvVideo;
    snackTvVideo.setAttribute('video-id', videoId);
    snackTvVideo.video = videos.find((video) => video.id === parseInt(videoId))!;
    document.querySelector('main')!.append(snackTvVideo);
  } else {
    const snackTvVideos = document.createElement('snack-tv-videos') as SnackTvVideos;
    snackTvVideos.setAttribute('category', category);
    snackTvVideos.videos = videos;
    document.querySelector('main')!.append(snackTvVideos);
  }
}

main();

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicVideo } from '../components/PublicVideo';
import { readVideoFormat, videoFormatRatio, writeVideoFormat } from './video-format';

const video = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=12';
const renderVideo = (url: string) => renderToStaticMarkup(createElement(PublicVideo, { url }));

test('save, edit, remove format without losing URL parameters or fragments', () => {
  const original = `${video}#t=20`;
  const saved = writeVideoFormat(original, '9:16');
  assert.equal(saved, `${original}&bca-aspect=9:16`);
  assert.equal(readVideoFormat(saved), '9:16');
  assert.equal(videoFormatRatio(saved), 9 / 16);
  const edited = writeVideoFormat(saved, '4:5');
  assert.equal(readVideoFormat(edited), '4:5');
  assert.equal((edited.match(/bca-aspect/g) ?? []).length, 1);
  assert.equal(writeVideoFormat(edited, ''), original);
});

test('iframe format overrides its platform-provided landscape dimensions', () => {
  const original = '<iframe src="https://www.youtube.com/embed/aqz-KE-bpKQ" width="560" height="315"></iframe>';
  const saved = writeVideoFormat(original, '1080:1920');
  assert.equal(videoFormatRatio(saved), 9 / 16);
  assert.match(renderVideo(saved), /aspect-ratio:0\.5625/);
  assert.equal(writeVideoFormat(saved, ''), original);
});

test('invalid ratios are not applied', () => {
  for (const format of ['0:0', '1:0', '0:16', '1:100', '100:1']) {
    assert.equal(videoFormatRatio(`${video}#bca-aspect=${format}`), null);
  }
});

test('YouTube formats render at the chosen ratio without leaking local metadata to iframe', () => {
  for (const format of ['9:16', '16:9', '1:1', '4:5', '1080:1350']) {
    const [width, height] = format.split(':').map(Number);
    const html = renderVideo(writeVideoFormat(video, format));
    assert.ok(html.includes(`aspect-ratio:${width / height}`));
    assert.match(html, /youtube-nocookie\.com\/embed\/aqz-KE-bpKQ\?start=12/);
    assert.doesNotMatch(html, /bca-aspect/);
    assert.doesNotMatch(html, /object-cover/);
    if (width < height) assert.match(html, /80dvh/);
  }
});

test('ordinary URLs stay horizontal by default, Shorts stay vertical', () => {
  assert.match(renderVideo(video), /aspect-ratio:1\.7777777777777777/);
  assert.match(renderVideo('https://www.youtube.com/shorts/aqz-KE-bpKQ'), /aspect-ratio:0\.5625/);
  assert.match(renderVideo('https://www.youtube.com/watch?feature=shared&v=aqz-KE-bpKQ'), /<iframe/);
  assert.match(renderVideo('https://youtu.be/aqz-KE-bpKQ#bca-aspect=9:16'), /aspect-ratio:0\.5625/);
});

test('Facebook uses the configured original format too', () => {
  const html = renderVideo(writeVideoFormat('https://www.facebook.com/reel/123456789', '9:16'));
  assert.match(html, /facebook\.com\/plugins\/video\.php/);
  assert.match(html, /aspect-ratio:0\.5625/);
});

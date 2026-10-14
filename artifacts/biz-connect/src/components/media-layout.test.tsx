import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PartnerLogos } from './PartnerLogos';
import { VideoTestimonials } from './VideoTestimonials';
import type { Partner, Testimonial } from '@workspace/api-client-react';

const partner = (id: number): Partner => ({ id, name: `Partenaire ${id}`, logoUrl: `/api/media/${id}/content`, sortOrder: id });
const video = (id: number): Testimonial => ({
  id, name: `Client ${id}`, country: '', duration: '', text: '', mediaType: 'video',
  mediaUrl: `/api/media/${id}/video`, sortOrder: id,
});

test('one or two partner logos stay centered, original, uncropped and in full color', () => {
  for (const count of [1, 2]) {
    const html = renderToStaticMarkup(createElement(PartnerLogos, { partners: Array.from({ length: count }, (_, i) => partner(i + 1)) }));
    assert.equal((html.match(/<img /g) ?? []).length, count);
    assert.match(html, /justify-center/);
    assert.match(html, /src="\/api\/media\/1\/content"/);
    assert.match(html, /object-contain/);
    assert.doesNotMatch(html, /grayscale|object-cover|srcSet|srcset|animate-slider/);
  }
});

test('three or more logos use the seamless ticker and blank logos are excluded', () => {
  const html = renderToStaticMarkup(createElement(PartnerLogos, { partners: [partner(1), partner(2), partner(3), { ...partner(4), logoUrl: '' }] }));
  assert.match(html, /animate-slider-left/);
  assert.match(html, /padding-right:32px/);
  assert.equal((html.match(/<img /g) ?? []).length, 6);
  assert.match(html, /aria-hidden="true"/);
  assert.equal(renderToStaticMarkup(createElement(PartnerLogos, { partners: [] })), '');
});

test('video carousel has real navigation buttons and only one mounted player', () => {
  const html = renderToStaticMarkup(createElement(VideoTestimonials, {
    items: [video(1), video(2), video(3)],
    renderHeader: item => createElement('h3', null, item.name),
  }));
  assert.equal((html.match(/<video /g) ?? []).length, 1);
  assert.match(html, /<button[^>]+aria-label="Zapper/);
  assert.match(html, /Précédent/);
  assert.match(html, /1 \/ 3/);
  assert.match(html, /Voir la vidéo de Client 2/);
  assert.match(html, /preload="none"/);
});

test('a single testimony disables skip, and an empty carousel renders nothing', () => {
  const props = { items: [video(1)], renderHeader: () => null };
  const html = renderToStaticMarkup(createElement(VideoTestimonials, props));
  assert.match(html, /disabled=""/);
  assert.match(html, /1 \/ 1/);
  assert.equal(renderToStaticMarkup(createElement(VideoTestimonials, { ...props, items: [] })), '');
});

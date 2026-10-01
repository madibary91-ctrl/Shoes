// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { inertOthers, supportsInert } from '../../assets/src/utils/inert.js';

let stage;
let card;

function mk(tag, attrs = {}) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

beforeEach(() => {
  document.body.textContent = '';
  stage = mk('div');
  card = mk('aside', { role: 'dialog' });
  document.body.appendChild(stage);
});

describe('inertOthers', () => {
  it('بقیه‌ی فرزندان را inert می‌کند و کارت را دست نمی‌زند', () => {
    const header = mk('header');
    const island = mk('div');
    stage.append(header, island, card);
    inertOthers(stage, card);
    expect(header.hasAttribute('inert')).toBe(true);
    expect(island.hasAttribute('inert')).toBe(true);
    expect(card.hasAttribute('inert')).toBe(false);
  });

  it('canvas، live region و دیالوگ‌های دیگر فعال می‌مانند', () => {
    const canvas = mk('canvas');
    const wrap = mk('div');
    wrap.appendChild(mk('canvas'));
    const toast = mk('div', { 'aria-live': 'polite' });
    const drawer = mk('aside', { role: 'dialog' });
    const keep = mk('div', { 'data-sf3d-keep': '' });
    stage.append(canvas, wrap, toast, drawer, keep, card);
    inertOthers(stage, card);
    [canvas, wrap, toast, drawer, keep].forEach((el) => expect(el.hasAttribute('inert')).toBe(false));
  });

  it('عنصری که از قبل inert بوده (مثل دراور بسته) لمس و بعد از release هم حفظ می‌شود', () => {
    const closedDrawer = mk('aside', { inert: '' });
    const header = mk('header');
    stage.append(closedDrawer, header, card);
    const release = inertOthers(stage, card);
    release();
    expect(closedDrawer.hasAttribute('inert')).toBe(true);
    expect(header.hasAttribute('inert')).toBe(false);
  });

  it('release همه چیز را برمی‌گرداند و چندبار صدا زدنش بی‌خطر است', () => {
    const header = mk('header', { 'aria-hidden': 'false' });
    stage.append(header, card);
    const release = inertOthers(stage, card);
    release();
    release();
    expect(header.hasAttribute('inert')).toBe(false);
    expect(header.getAttribute('aria-hidden')).toBe('false');
  });

  it('بدون inert بومی، aria-hidden موقت می‌گذارد و مقدار قبلی را برمی‌گرداند', () => {
    const header = mk('header');
    stage.append(header, card);
    const release = inertOthers(stage, card);
    if (!supportsInert()) expect(header.getAttribute('aria-hidden')).toBe('true');
    release();
    expect(header.hasAttribute('aria-hidden')).toBe(false);
  });

  it('ورودی نامعتبر خطا نمی‌دهد', () => {
    expect(() => inertOthers(null, null)()).not.toThrow();
  });
});

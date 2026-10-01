// مدیریت بافت‌ها: بارگذاری async (دیکد خارج از ترد اصلی با createImageBitmap)، صف و کش

const MAX_TEX = 768;

export class TextureStore {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {{onLoad?:Function, concurrency?:number}} opts
   */
  constructor(gl, opts = {}) {
    this.gl = gl;
    this.cache = new Map();
    this.queue = [];
    this.active = 0;
    this.concurrency = opts.concurrency || 4;
    this.onLoad = opts.onLoad || (() => {});
  }

  /** @returns {{tex:WebGLTexture, ready:boolean, aspect:number, failed:boolean}} */
  get(url) {
    let e = this.cache.get(url);
    if (!e) {
      e = { tex: this.gl.createTexture(), ready: false, failed: false, aspect: 1, url };
      this.cache.set(url, e);
      this.queue.push(e);
      this._pump();
    }
    return e;
  }

  /** آپلود canvas (برای برچسب‌ها و نشان‌ها)؛ در صورت وجود، دوباره آپلود می‌شود */
  fromCanvas(key, canvas) {
    let e = this.cache.get(key);
    if (!e) {
      e = { tex: this.gl.createTexture(), ready: false, failed: false, aspect: 1, url: key };
      this.cache.set(key, e);
    }
    this._upload(e, canvas, canvas.width, canvas.height);
    return e;
  }

  _pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const e = this.queue.shift();
      this.active++;
      this._load(e)
        .catch(() => { e.failed = true; })
        .finally(() => {
          this.active--;
          this._pump();
        });
    }
  }

  async _load(e) {
    const isSvg = /\.svg(\?|$)/i.test(e.url) || /[?&]format=svg/i.test(e.url) || e.url.startsWith('data:image/svg');
    let source;
    let w;
    let h;
    if (!isSvg && typeof createImageBitmap === 'function') {
      const res = await fetch(e.url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error('http ' + res.status);
      const blob = await res.blob();
      let bmp = await createImageBitmap(blob, { premultiplyAlpha: 'premultiply' });
      const big = Math.max(bmp.width, bmp.height);
      if (big > MAX_TEX) {
        const r = MAX_TEX / big;
        const small = await createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * r), resizeHeight: Math.round(bmp.height * r), resizeQuality: 'high' });
        bmp.close && bmp.close();
        bmp = small;
      }
      source = bmp;
      w = bmp.width;
      h = bmp.height;
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.src = e.url;
      await img.decode();
      const nw = img.naturalWidth || 512;
      const nh = img.naturalHeight || 512;
      const r = Math.min(1, MAX_TEX / Math.max(nw, nh));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(nw * r));
      c.height = Math.max(1, Math.round(nh * r));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      source = c;
      w = c.width;
      h = c.height;
    }
    this._upload(e, source, w, h);
    if (source.close) source.close();
    this.onLoad(e);
  }

  _upload(e, source, w, h) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, e.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    e.aspect = w / h;
    e.ready = true;
  }

  dispose() {
    this.cache.forEach((e) => this.gl.deleteTexture(e.tex));
    this.cache.clear();
    this.queue.length = 0;
  }
}

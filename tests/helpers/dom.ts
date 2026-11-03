/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The DOM the call-site tests need: a window (matchMedia), a
 * localStorage, an IntersectionObserver the test can trigger, a
 * requestAnimationFrame and a fetch the test can answer.
 *
 * ponytail: bun:test shares one process across all the files, so every
 * stub is restored when the file ends (a stubbed fetch would hijack
 * the real HTTP calls of the other suites).
 */

export interface StubbedObserver {
  callback: (entries: any[], observer: any) => void;
  options: any;
  elements: any[];
  trigger(isIntersecting: boolean): void;
  disconnect(): void;
}

export interface DomStub {
  observers: StubbedObserver[];
  /** Answer a request: the handler gets the url and returns the JSON body. */
  fetchJson(handler: (url: string) => unknown): void;
  restore(): void;
}

export function stubDom(opts: { reducedMotion?: boolean } = {}): DomStub {
  const g = globalThis as any;
  const saved = {
    window: g.window,
    localStorage: g.localStorage,
    document: g.document,
    IntersectionObserver: g.IntersectionObserver,
    requestAnimationFrame: g.requestAnimationFrame,
    cancelAnimationFrame: g.cancelAnimationFrame,
    fetch: g.fetch
  };

  const observers: StubbedObserver[] = [];

  class FakeIntersectionObserver {
    callback: any;
    options: any;
    elements: any[] = [];
    constructor(callback: any, options: any) {
      this.callback = callback;
      this.options = options;
      observers.push(this as unknown as StubbedObserver);
    }
    observe(el: any) {
      this.elements.push(el);
    }
    unobserve(el: any) {
      this.elements = this.elements.filter((e) => e !== el);
    }
    disconnect() {
      this.elements = [];
    }
    trigger(isIntersecting: boolean) {
      this.callback(
        [{ isIntersecting, target: this.elements[0] }],
        this
      );
    }
  }

  const media = (matches: boolean) => ({
    matches,
    media: '',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false
  });

  g.window = {
    addEventListener() {},
    removeEventListener() {},
    matchMedia: (query: string) =>
      media(query.includes('reduced-motion') ? !!opts.reducedMotion : false),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    setTimeout: (fn: any, ms?: number) => setTimeout(fn, ms),
    clearTimeout: (id: any) => clearTimeout(id),
    setInterval: (fn: any, ms?: number) => setInterval(fn, ms),
    clearInterval: (id: any) => clearInterval(id),
    // the edit-mode flows ask for the EDIT_TOKEN with a prompt
    prompt: () => 'token-de-prueba'
  };

  const store = new Map<string, string>();
  g.localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear()
  };

  g.document = {
    addEventListener() {},
    removeEventListener() {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      style: {},
      setAttribute() {},
      appendChild() {},
      addEventListener() {},
      removeEventListener() {}
    }),
    body: { appendChild() {}, style: {} },
    documentElement: { style: {} }
  };

  g.IntersectionObserver = FakeIntersectionObserver;
  g.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(0), 16);
  g.cancelAnimationFrame = (id: any) => clearTimeout(id);

  return {
    observers,
    fetchJson(handler: (url: string) => unknown) {
      g.fetch = async (url: any) =>
        new Response(JSON.stringify(handler(String(url))), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    },
    restore() {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete g[key];
        else g[key] = value;
      }
    }
  };
}

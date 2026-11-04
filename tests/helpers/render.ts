/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A tiny React runtime for the call-site tests.
 *
 * The suite has no DOM runner (no jsdom, no testing-library) but the
 * components under test are effects-driven: the gallery reads the
 * photos from the API, the timeline waits for them, the hero watches
 * the viewport. A helper-only test cannot see any of that, so this
 * runtime calls the REAL component with a REAL React dispatcher (the
 * internals slot React 19 uses), runs the effects, re-renders when the
 * state changes and finally hands the tree to `react-dom/server`
 * (already a dependency) to produce the markup.
 *
 * ponytail: no new dependency. React's own dispatcher slot is the
 * smallest seam that gives real hooks + real effects without a DOM.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type Any = any;

const INTERNALS = (React as Any)
  .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

interface Slot {
  value?: Any;
  deps?: Any[];
  cleanup?: Any;
  hasValue?: boolean;
}

const sameDeps = (a: Any[] | undefined, b: Any[] | undefined): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.length === b.length &&
    a.every((v, i) => Object.is(v, b[i])));

class Runtime {
  slots: Slot[] = [];
  pending: { create: () => Any; deps?: Any[]; slot: Slot }[] = [];
  index = 0;
  dirty = false;
  tree: Any = null;
  dispatcher: Any;
  nodeMock: ((element: Any) => Any) | undefined;

  constructor(nodeMock?: (element: Any) => Any) {
    this.nodeMock = nodeMock;
    this.dispatcher = makeDispatcher(this);
  }

  /** One render pass: call the component, then commit the effects. */
  pass(Component: (props: Any) => Any, props: Any): void {
    this.index = 0;
    this.pending = [];
    this.dirty = false;
    const prev = INTERNALS.H;
    INTERNALS.H = this.dispatcher;
    try {
      this.tree = Component(props);
    } finally {
      INTERNALS.H = prev;
    }
    // ponytail: the refs are attached before the effects run (React does
    // the same), so an effect that watches an element sees it.
    attachRefs(this.tree, this.nodeMock);
    this.commit();
  }

  /** Run the effects whose deps changed (and clean the old ones up). */
  commit(): void {
    for (const effect of this.pending) {
      if (sameDeps(effect.slot.deps, effect.deps) && effect.slot.hasValue) continue;
      if (typeof effect.slot.cleanup === 'function') effect.slot.cleanup();
      effect.slot.deps = effect.deps;
      effect.slot.hasValue = true;
      effect.slot.cleanup = effect.create();
    }
    this.pending = [];
  }

  unmount(): void {
    for (const slot of this.slots) {
      if (typeof slot.cleanup === 'function') slot.cleanup();
      slot.cleanup = undefined;
      slot.hasValue = false;
    }
  }
}

function makeDispatcher(rt: Runtime): Any {
  const dispatcher: Any = {
    useState(initial: Any) {
      const i = rt.index++;
      const slot = (rt.slots[i] ??= {});
      if (!slot.hasValue) {
        slot.value = typeof initial === 'function' ? initial() : initial;
        slot.hasValue = true;
      }
      const setState = (next: Any) => {
        const value = typeof next === 'function' ? next(slot.value) : next;
        if (!Object.is(value, slot.value)) {
          slot.value = value;
          rt.dirty = true;
        }
      };
      return [slot.value, setState];
    },
    useReducer(reducer: Any, initialArg: Any, init?: Any) {
      const i = rt.index++;
      const slot = (rt.slots[i] ??= {});
      if (!slot.hasValue) {
        slot.value = init ? init(initialArg) : initialArg;
        slot.hasValue = true;
      }
      const dispatch = (action: Any) => {
        const value = reducer(slot.value, action);
        if (!Object.is(value, slot.value)) {
          slot.value = value;
          rt.dirty = true;
        }
      };
      return [slot.value, dispatch];
    },
    useRef(initial: Any) {
      const i = rt.index++;
      const slot = (rt.slots[i] ??= {});
      if (!slot.hasValue) {
        slot.value = { current: initial };
        slot.hasValue = true;
      }
      return slot.value;
    },
    useMemo(factory: Any, deps?: Any[]) {
      const i = rt.index++;
      const slot = (rt.slots[i] ??= {});
      if (!sameDeps(slot.deps, deps)) {
        slot.deps = deps;
        slot.value = factory();
      }
      return slot.value;
    },
    useCallback(fn: Any, deps?: Any[]) {
      return dispatcher.useMemo(() => fn, deps);
    },
    useEffect(create: Any, deps?: Any[]) {
      const i = rt.index++;
      const slot = (rt.slots[i] ??= {});
      rt.pending.push({ create, deps, slot });
    },
    useLayoutEffect(create: Any, deps?: Any[]) {
      dispatcher.useEffect(create, deps);
    },
    useInsertionEffect() {},
    useImperativeHandle() {},
    useDebugValue() {},
    useDeferredValue(value: Any) {
      return value;
    },
    useTransition() {
      return [false, (fn: Any) => fn()];
    },
    useSyncExternalStore(_subscribe: Any, getSnapshot: Any) {
      return getSnapshot();
    },
    useOptimistic(value: Any) {
      return [value, () => {}];
    },
    useId() {
      return 'test-id';
    },
    use(usable: Any) {
      return typeof usable === 'function' ? usable() : usable;
    },
    useEffectEvent(fn: Any) {
      return fn;
    },
    useMemoCache(size: number) {
      return new Array(size);
    },
    useContext(context: Any) {
      // ponytail: the default value of the context. The components under
      // test only read contexts they do not write to (motion's internal
      // ones), so the default is enough.
      return context?._currentValue;
    }
  };
  return dispatcher;
}

/**
 * The fake element a ref points to when there is no DOM.
 *
 * ponytail: the smallest surface the components touch: the video
 * element of the hero (canPlayType / play / pause), the observers and
 * the pointer capture of the marquee.
 */
function defaultNode(element: Any): Any {
  return {
    tagName: typeof element?.type === 'string' ? element.type : 'div',
    dataset: {},
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    getAttribute: () => null,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0
    }),
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture: () => false,
    closest: () => null,
    focus() {},
    blur() {},
    click() {},
    querySelector: () => null,
    canPlayType: () => 'maybe',
    play: () => Promise.resolve(),
    pause() {},
    load() {},
    src: ''
  };
}

/** Attach the refs of the rendered tree to the fake nodes. */
function attachRefs(node: Any, nodeMock?: (element: Any) => Any): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) attachRefs(child, nodeMock);
    return;
  }
  if (typeof node !== 'object') return;
  const props = node.props;
  if (!props) return;
  const ref = props.ref;
  if (ref && typeof ref === 'object' && 'current' in ref && ref.current === null) {
    ref.current = nodeMock ? nodeMock(node) : defaultNode(node);
  }
  attachRefs(props.children, nodeMock);
}

export interface Mounted<P> {
  /** The markup of the current tree (real render, react-dom/server). */
  html(): string;
  /** The current React element tree (props included: handlers, styles). */
  tree(): Any;
  /** Re-render now (state changed outside of an effect).
   *  With `next` the component gets NEW props (the parent re-rendered). */
  render(next?: any): void;
  /** Let the pending promises/effects settle and re-render until quiet. */
  settle(rounds?: number): Promise<void>;
  /** Run the effect cleanups. */
  unmount(): void;
}

/**
 * Mount a component: real hooks, real effects, no DOM.
 */
export function mount<P>(
  Component: (props: P) => Any,
  props: P,
  opts: { createNodeMock?: (element: Any) => Any } = {}
): Mounted<P> {
  const rt = new Runtime(opts.createNodeMock);
  // ponytail: `current` follows the last props: `render(next)` is the
  // parent re-rendering with new props, and the re-renders that `settle`
  // does later must keep them (not the ones of the first mount).
  let current = props;
  rt.pass(Component, current);
  return {
    html: () => renderToStaticMarkup(rt.tree),
    tree: () => rt.tree,
    render: (next?: any) => {
      if (next !== undefined) current = next;
      rt.pass(Component, current);
    },
    settle: async (rounds = 25) => {
      for (let i = 0; i < rounds; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (rt.dirty) {
          rt.pass(Component, current);
          continue;
        }
        await Promise.resolve();
        if (rt.dirty) {
          rt.pass(Component, current);
          continue;
        }
        return;
      }
    },
    unmount: () => rt.unmount()
  };
}

/**
 * The text a node renders (elements and strings).
 */
export function textOf(node: Any): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'object' && node.props) return textOf(node.props.children);
  return '';
}

/**
 * Walk a React element tree and return every element whose props match.
 *
 * ponytail: the call-site tests need the REAL props of the rendered
 * element (the handler the component wired, the style it computed), so
 * they walk the tree instead of grepping the source.
 */
export function findElements(
  node: Any,
  match: (props: Any, type: Any) => boolean,
  found: Any[] = []
): Any[] {
  if (node === null || node === undefined || typeof node === 'boolean') return found;
  if (Array.isArray(node)) {
    for (const child of node) findElements(child, match, found);
    return found;
  }
  if (typeof node !== 'object') return found;
  if (node.props && match(node.props, node.type)) found.push(node);
  const children = node.props?.children;
  if (children !== undefined) findElements(children, match, found);
  return found;
}

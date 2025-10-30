/**
 * Global Polyfills Loader
 * 
 * This module ensures that all necessary polyfills are loaded
 * before any other code executes, preventing build-time errors.
 */

// Load polyfills immediately when this module is imported
import './server-polyfills';

// Ensure we're in a server environment
if (typeof process !== 'undefined' && process.env.NODE_ENV) {
  // We're in Node.js server environment
  globalThis.process = process;
}

// Additional global polyfills that might be needed
// Only add minimal polyfills for server-side rendering, avoid browser-like environment
if (typeof globalThis.window === 'undefined') {
  // Minimal window object for server-side rendering - avoid browser detection
  globalThis.window = {
    location: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
    },
    navigator: {
      userAgent: 'Node.js Server',
    },
  } as any;
}

// Mock HTMLElement for server-side rendering
if (typeof globalThis.HTMLElement === 'undefined') {
  globalThis.HTMLElement = class HTMLElement {
    constructor() {
      // Mock implementation
    }
  } as any;
}

// Mock Element for server-side rendering
if (typeof globalThis.Element === 'undefined') {
  globalThis.Element = class Element {
    constructor() {
      // Mock implementation
    }
  } as any;
}

// Mock Node for server-side rendering
if (typeof globalThis.Node === 'undefined') {
  globalThis.Node = class Node {
    constructor() {
      // Mock implementation
    }
  } as any;
}

// Mock Event for server-side rendering
if (typeof globalThis.Event === 'undefined') {
  globalThis.Event = class Event {
    type: string;
    target: any;
    currentTarget: any;
    bubbles: boolean = false;
    cancelable: boolean = false;
    defaultPrevented: boolean = false;
    eventPhase: number = 0;
    isTrusted: boolean = false;
    timeStamp: number = Date.now();

    constructor(type: string, eventInitDict?: any) {
      this.type = type;
      this.target = eventInitDict?.target || null;
      this.currentTarget = eventInitDict?.currentTarget || null;
      this.bubbles = eventInitDict?.bubbles || false;
      this.cancelable = eventInitDict?.cancelable || false;
    }

    preventDefault() {
      this.defaultPrevented = true;
    }

    stopPropagation() {
      // Mock implementation
    }

    stopImmediatePropagation() {
      // Mock implementation
    }
  } as any;
}

// Mock CustomEvent for server-side rendering
if (typeof globalThis.CustomEvent === 'undefined') {
  globalThis.CustomEvent = class CustomEvent extends Event {
    detail: any;

    constructor(type: string, eventInitDict?: any) {
      super(type, eventInitDict);
      this.detail = eventInitDict?.detail || null;
    }
  } as any;
}

// Mock AbortSignal for server-side rendering
if (typeof globalThis.AbortSignal === 'undefined') {
  globalThis.AbortSignal = class AbortSignal {
    private _aborted: boolean = false;
    reason: any = undefined;
    onabort: ((event: Event) => void) | null = null;

    constructor() {
      // Mock implementation
    }

    get aborted() {
      return this._aborted;
    }

    addEventListener(type: string, listener: (event: Event) => void) {
      // Mock implementation
    }

    removeEventListener(type: string, listener: (event: Event) => void) {
      // Mock implementation
    }

    dispatchEvent(event: Event) {
      return true;
    }
  } as any;
}

// Mock AbortController for server-side rendering
if (typeof globalThis.AbortController === 'undefined') {
  globalThis.AbortController = class AbortController {
    signal: AbortSignal;

    constructor() {
      this.signal = new AbortSignal();
    }

    abort() {
      (this.signal as any)._aborted = true;
    }
  } as any;
}

// Mock Performance for server-side rendering
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntries: () => [],
    getEntriesByType: () => [],
    getEntriesByName: () => [],
    clearMarks: () => {},
    clearMeasures: () => {},
    clearResourceTimings: () => {},
  } as any;
}

// Mock requestAnimationFrame for server-side rendering
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(callback, 16);
  };
}

// Mock cancelAnimationFrame for server-side rendering
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// Mock setTimeout and setInterval for server-side rendering
if (typeof globalThis.setTimeout === 'undefined') {
  globalThis.setTimeout = setTimeout;
}

if (typeof globalThis.setInterval === 'undefined') {
  globalThis.setInterval = setInterval;
}

if (typeof globalThis.clearTimeout === 'undefined') {
  globalThis.clearTimeout = clearTimeout;
}

if (typeof globalThis.clearInterval === 'undefined') {
  globalThis.clearInterval = clearInterval;
}

// Export to ensure the module is loaded
export const globalPolyfills = {
  loaded: true,
  timestamp: Date.now(),
};

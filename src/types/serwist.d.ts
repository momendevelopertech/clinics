declare module "@serwist/turbopack" {
  export function withSerwist(options?: any): (nextConfig?: any) => any;
  export const createSerwistRoute: any;
}

declare module "@serwist/turbopack/react" {
  import * as React from "react";
  export const SerwistProvider: React.FC<{
    swUrl: string;
    children: React.ReactNode;
  }>;
}

declare module "@serwist/turbopack/worker" {
  export const defaultCache: any[];
  export function installSerwist(options?: any): void;
}

declare module "serwist" {
  export const defaultCache: any[];
  export interface PrecacheEntry {
    url: string;
    revision?: string | null;
    integrity?: string;
  }
  export interface SerwistGlobalConfig {}
  export interface SerwistPlugin {
    cacheKeyWillBeUsed?: (param: { request: Request }) => Promise<string>;
    [key: string]: any;
  }
  export class CacheFirst {
    constructor(options?: any);
  }
  export class CacheableResponsePlugin {
    constructor(options?: any);
  }
  export class ExpirationPlugin {
    constructor(options?: any);
  }
  export class NetworkFirst {
    constructor(options?: any);
  }
  export class NetworkOnly {
    constructor(options?: any);
  }
  export class StaleWhileRevalidate {
    constructor(options?: any);
  }
  export class Serwist {
    constructor(options?: any);
    addEventListeners(): void;
  }
  export type SerwistOptions = any;
}

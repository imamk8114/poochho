/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

// The literal `self.__WB_MANIFEST` below is what the build tool looks for when it injects the file list.
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] };

// The whole app is a handful of small files, so all of it is precached: after the first visit every screen,
// chart and the data generator work with no network at all. Updates swap in the next time the app opens.
void self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// Any navigation (including a reload while offline) is served the cached app shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

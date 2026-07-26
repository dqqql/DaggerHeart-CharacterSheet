"use client"

import { useEffect } from 'react';

const CHUNK_RELOAD_STORAGE_KEY = 'character-sheet:chunk-reload-at';
const CHUNK_RELOAD_COOLDOWN_MS = 10_000;

function reloadAfterChunkLoadError(message: string) {
  const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) || 0);
  const now = Date.now();

  if (now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
    console.error(
      '[ChunkLoadErrorHandler] Chunk loading is still failing after a reload. Automatic reload paused:',
      message,
    );
    return;
  }

  sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
  console.warn('[ChunkLoadErrorHandler] Chunk load error detected, reloading once:', message);
  window.setTimeout(() => window.location.reload(), 100);
}

/**
 * 处理 Next.js chunk 加载失败的组件
 *
 * 问题：当部署新版本后，旧页面请求的 chunk 文件（带旧 hash）会 404
 * 解决：检测 chunk 加载错误，最多自动刷新一次获取最新版本
 */
export function ChunkLoadErrorHandler() {
  useEffect(() => {
    // 旧版 Service Worker 会在短暂的网络错误后让所有标签页无限刷新。
    // 分块错误由下方的页面级监听器处理，因此清理旧注册即可。
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (registration) {
            void registration.unregister();
          }
        })
        .catch((error) => {
          console.warn('[ChunkLoadErrorHandler] Service Worker cleanup failed:', error);
        });
    }

    // 全局错误处理：捕获 chunk 加载失败
    const handleError = (event: ErrorEvent) => {
      const isChunkLoadError =
        event.message?.includes('Loading chunk') ||
        event.message?.includes('Failed to fetch dynamically imported module') ||
        event.message?.includes('Importing a module script failed');

      if (isChunkLoadError) {
        event.preventDefault();
        reloadAfterChunkLoadError(event.message);
      }
    };

    // 监听未捕获的错误
    window.addEventListener('error', handleError);

    // 监听 Promise rejection（用于动态 import 失败）
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || '';
      const isChunkLoadError =
        reason.includes('Loading chunk') ||
        reason.includes('Failed to fetch dynamically imported module') ||
        reason.includes('/_next/static/');

      if (isChunkLoadError) {
        event.preventDefault();
        reloadAfterChunkLoadError(reason);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Prevent unhandled promise rejections or unexpected socket aborts from terminating the server
    process.on('uncaughtException', (err: any) => {
      console.warn('[SearchBiz Guardian] Prevented process crash on uncaughtException:', err?.message || err);
    });

    process.on('unhandledRejection', (reason: any) => {
      console.warn('[SearchBiz Guardian] Prevented process crash on unhandledRejection:', reason?.message || reason);
    });

    console.log('[SearchBiz Guardian] Always-on crash immunity initialized.');
  }
}

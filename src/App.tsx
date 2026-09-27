import { lazy, Suspense } from 'react';
import Landing from './landing/Landing';

// The landing page loads without the console's charts; the console loads on its own route.
const ConsoleApp = lazy(() => import('./console/App'));

// The console used to live at the root; keep its old links working.
const OLD_CONSOLE_PATHS = ['/history', '/trajectory', '/futures'];

export default function App() {
  const { pathname, search } = window.location;
  if (pathname === '/console' || pathname.startsWith('/console/')) {
    return (
      <Suspense fallback={null}>
        <ConsoleApp />
      </Suspense>
    );
  }

  const oldConsoleLink =
    OLD_CONSOLE_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`)) ||
    (pathname === '/' && new URLSearchParams(search).has('workflowId'));
  if (oldConsoleLink) {
    window.location.replace(`/console${pathname === '/' ? '/' : pathname}${search}`);
    return null;
  }

  return <Landing />;
}

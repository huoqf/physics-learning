import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './app/Layout';

// 路由级代码分割：各页面按需加载，避免首屏打入全部页面与重型依赖
const HomePage = lazy(() => import('./pages/HomePage'));
const AnimationPage = lazy(() => import('./pages/AnimationPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const WrongPage = lazy(() => import('./pages/WrongPage'));
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'));

function RouteFallback() {
  return (
    <div className="w-full h-[60vh] flex items-center justify-center text-neutral-400">
      加载中…
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<RouteFallback />}>
                <HomePage />
              </Suspense>
            }
          />
          <Route
            path="/animation/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AnimationPage />
              </Suspense>
            }
          />
          <Route
            path="/analysis/:id"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AnalysisPage />
              </Suspense>
            }
          />
          <Route
            path="/practice"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PracticePage />
              </Suspense>
            }
          />
          <Route
            path="/wrong"
            element={
              <Suspense fallback={<RouteFallback />}>
                <WrongPage />
              </Suspense>
            }
          />
          <Route
            path="/knowledge"
            element={
              <Suspense fallback={<RouteFallback />}>
                <KnowledgePage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}

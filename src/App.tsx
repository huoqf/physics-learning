import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import Layout from './app/Layout';

// 路由级代码分割：各页面按需加载，避免首屏打入全部页面与重型依赖
const HomePage = lazy(() => import('./pages/HomePage'));
const AnimationPage = lazy(() => import('./pages/AnimationPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const WrongPage = lazy(() => import('./pages/WrongPage'));
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'));
const VectorPlayground = lazy(() => import('./features/dev/VectorPlayground'));

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
          <Route element={<Suspense fallback={<RouteFallback />}> <Outlet /> </Suspense>}>
            <Route path="/" element={<HomePage />} />
            <Route path="/animation/:id" element={<AnimationPage />} />
            <Route path="/analysis/:id" element={<AnalysisPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/wrong" element={<WrongPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
          </Route>
        </Route>
        <Route
          path="/dev/playground"
          element={
            <Suspense fallback={<RouteFallback />}>
              <VectorPlayground />
            </Suspense>
          }
        />
      </Routes>
    </HashRouter>
  );
}

import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './app/Layout';
import HomePage from './pages/HomePage';
import AnimationPage from './pages/AnimationPage';
import AnalysisPage from './pages/AnalysisPage';
import PracticePage from './pages/PracticePage';
import WrongPage from './pages/WrongPage';
import KnowledgePage from './pages/KnowledgePage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/animation/:id" element={<AnimationPage />} />
          <Route path="/analysis/:id" element={<AnalysisPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/wrong" element={<WrongPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

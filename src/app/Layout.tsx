import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Play, ClipboardList, BookOpenCheck } from 'lucide-react';
import { ErrorBoundary, PageTransition } from '@/components/UI';
import { duration, easing } from '@/theme/motion';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: '首页', icon: <Home className="w-4 h-4" /> },
    { path: '/knowledge', label: '知识树', icon: <BookOpen className="w-4 h-4" /> },
    { path: '/practice', label: '真题练习', icon: <ClipboardList className="w-4 h-4" /> },
    { path: '/wrong', label: '错题本', icon: <BookOpenCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="h-14 bg-primary-800 text-white shadow-md z-10">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-6 h-6" fill="currentColor" />
            <span className="font-semibold text-lg">物理学习</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg active:scale-[0.97] ${
                    isActive ? 'bg-primary-700' : 'hover:bg-primary-700/50'
                  }`}
                  style={{
                    transitionProperty: 'all',
                    transitionDuration: `${duration.fast}ms`,
                    transitionTimingFunction: easing.standard,
                  }}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <ErrorBoundary resetKey={location.pathname}>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </ErrorBoundary>
      </main>
    </div>
  );
}

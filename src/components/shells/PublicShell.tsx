import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { AppFooter } from '../shared/AppFooter';

export const PublicShell: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-nest-bg text-nest-ink font-sans">
      <a
        href="#main-content"
        className="sr-only sr-only-focusable z-50 p-3 bg-terracotta-500 text-white font-bold"
      >
        Skip to main content
      </a>
      <AppHeader />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
};

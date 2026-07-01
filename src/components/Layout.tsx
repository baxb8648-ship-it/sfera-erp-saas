import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

// Scroll restoration component to run on every route transition
const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there is no hash, scroll to top
    if (!hash) {
      window.scrollTo(0, 0);
    } else {
      // If there is a hash, try to scroll to the element after a short delay to let rendering complete
      const id = hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [pathname, hash]);

  return null;
};

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg text-text-muted selection:bg-[#F95700]/30 selection:text-white antialiased flex flex-col justify-between">
      <ScrollToTop />
      
      {/* Shared Navigation Header */}
      <Header />
      
      {/* Nested Route Components */}
      <main className="flex-grow pt-20">
        <Outlet />
      </main>
      
      {/* Shared Footer */}
      <Footer />
    </div>
  );
};

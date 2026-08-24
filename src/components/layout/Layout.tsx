import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-page flex flex-col selection:bg-accent-blue selection:text-white font-sans text-text-primary antialiased">
      <Navbar />
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-24 md:pb-12">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};

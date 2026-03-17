import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

const Layout = () => {
    const location = useLocation();
    const MotionDiv = motion.div;

    return (
        <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-transparent">
            <div className="pointer-events-none absolute -left-16 top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />

            <TopBar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 pt-3 px-4">
                <Outlet />
            <main className="relative flex-1 overflow-y-auto px-4 pb-28 pt-4">
                <AnimatePresence mode="wait">
                    <MotionDiv
                        key={location.pathname}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                    >
                        <Outlet />
                    </MotionDiv>
                </AnimatePresence>
            </main>

            <BottomNav />
        </div>
    );
};

export default Layout;

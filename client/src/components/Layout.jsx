import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

const Layout = () => {
    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-50 shadow-2xl relative overflow-hidden">
            {/* Top Bar for Language Toggle and Branding */}
            <TopBar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 pt-3 px-4">
                <Outlet />
            </main>

            {/* Persistent Bottom Navigation */}
            <BottomNav />
        </div>
    );
};

export default Layout;

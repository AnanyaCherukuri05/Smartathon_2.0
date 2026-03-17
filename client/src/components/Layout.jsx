import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

const Layout = () => {
    return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col bg-green-50">

            <TopBar />

            <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
                <Outlet />
            </main>

            <BottomNav />
        </div>
    );
};

export default Layout;

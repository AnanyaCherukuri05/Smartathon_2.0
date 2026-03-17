import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

const Layout = () => {
    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="ambient-orb -left-16 top-20 h-52 w-52 bg-emerald-200" />
            <div className="ambient-orb -right-24 top-56 h-64 w-64 bg-lime-200" />
            <div className="ambient-orb bottom-24 left-1/3 h-44 w-44 bg-green-100" />

            <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-3 sm:px-5">
                <TopBar />

                <main className="flex-1 overflow-y-auto pb-28 pt-28 sm:pt-28">
                    <div className="mx-auto w-full max-w-4xl">
                        <Outlet />
                    </div>
                </main>

                <BottomNav />
            </div>
        </div>
    );
};

export default Layout;

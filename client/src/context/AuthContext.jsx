import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }) => {
    const { i18n } = useTranslation();

    // Initialize user safely from localStorage (NO setState in useEffect)
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            console.error('Failed to parse user from localStorage', error);
            return null;
        }
    });

    const loading = false;

    useEffect(() => {
        if (user?.languagePreference) {
            i18n.changeLanguage(user.languagePreference);
        }
    }, [user, i18n]);

    const login = (userData, token) => {
        try {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('token', token);

            if (userData.languagePreference) {
                i18n.changeLanguage(userData.languagePreference);
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const setLanguagePreference = (languageCode) => {
        i18n.changeLanguage(languageCode);

        setUser((prevUser) => {
            if (!prevUser) return prevUser;

            const updatedUser = {
                ...prevUser,
                languagePreference: languageCode,
            };

            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                setLanguagePreference,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
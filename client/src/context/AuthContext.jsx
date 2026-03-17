import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiClient';

import { AuthContext } from './AuthContextContext';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            try {
                return JSON.parse(storedUser);
            } catch {
                return null;
            }
        }
        return null;
    });

    const [loading] = useState(false);
    const { i18n } = useTranslation();

    useEffect(() => {
        if (user?.languagePreference) {
            i18n.changeLanguage(user.languagePreference);
        }
    }, [i18n, user?.languagePreference]);

    const login = (userData, token) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        if (userData.languagePreference) {
            i18n.changeLanguage(userData.languagePreference);
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
            const nextUser = { ...prevUser, languagePreference: languageCode };
            localStorage.setItem('user', JSON.stringify(nextUser));
            return nextUser;
        });

        const token = localStorage.getItem('token');
        if (token) {
            apiFetch('/api/auth/me', {
                method: 'PATCH',
                body: { languagePreference: languageCode }
            })
                .then((data) => {
                    if (data?.user) {
                        setUser(data.user);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                })
                .catch(() => {
                    // Non-blocking: keep local preference even if server update fails
                });
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setLanguagePreference }}>
            {children}
        </AuthContext.Provider>
    );
};

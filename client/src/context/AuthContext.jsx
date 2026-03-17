import React, { createContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { i18n } = useTranslation();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            if (parsedUser.languagePreference) {
                i18n.changeLanguage(parsedUser.languagePreference);
            }
        }
        setLoading(false);
    }, [i18n]);

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
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setLanguagePreference }}>
            {children}
        </AuthContext.Provider>
    );
};

import React from 'react';
import clsx from 'clsx';

const GradientButton = ({
    children,
    className,
    type = 'button',
    disabled = false,
    ...props
}) => {
    return (
        <button
            type={type}
            disabled={disabled}
            className={clsx(
                'relative w-full overflow-hidden rounded-2xl px-5 py-3.5 font-semibold text-white',
                'bg-gradient-to-r from-emerald-600 via-green-600 to-lime-500 shadow-[0_14px_28px_rgba(28,123,74,0.28)]',
                'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(28,123,74,0.32)]',
                'active:translate-y-0 active:shadow-[0_10px_22px_rgba(28,123,74,0.28)]',
                'disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:hover:translate-y-0',
                'focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200',
                className,
            )}
            {...props}
        >
            <span className="relative z-10">{children}</span>
        </button>
    );
};

export default GradientButton;
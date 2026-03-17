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
                'w-full rounded-xl px-5 py-3 font-semibold text-white',
                'bg-green-600 shadow-md transition-colors duration-200 hover:bg-green-500',
                'disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-200',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
};

export default GradientButton;
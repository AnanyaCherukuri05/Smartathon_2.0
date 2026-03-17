import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const GradientButton = ({
    children,
    className,
    type = 'button',
    disabled = false,
    ...props
}) => {
    const MotionButton = motion.button;

    return (
        <MotionButton
            type={type}
            disabled={disabled}
            whileHover={disabled ? undefined : { scale: 1.02 }}
            whileTap={disabled ? undefined : { scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 22 }}
            className={clsx(
                'w-full rounded-2xl px-5 py-3 font-semibold text-white',
                'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
                'shadow-[0_12px_24px_rgba(16,185,129,0.28)]',
                'disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70',
                className,
            )}
            {...props}
        >
            {children}
        </MotionButton>
    );
};

export default GradientButton;
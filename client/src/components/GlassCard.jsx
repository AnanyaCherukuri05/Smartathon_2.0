import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const GlassCard = ({
    children,
    className,
    hover = false,
    as = 'div',
    ...props
}) => {
    const Component = motion[as] || motion.div;

    return (
        <Component
            className={clsx(
                'rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(3,7,18,0.45)]',
                hover && 'transition-transform duration-300 hover:-translate-y-0.5',
                className,
            )}
            whileHover={hover ? { scale: 1.01 } : undefined}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            {...props}
        >
            {children}
        </Component>
    );
};

export default GlassCard;
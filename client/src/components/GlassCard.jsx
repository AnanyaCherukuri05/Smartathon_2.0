import React from 'react';
import clsx from 'clsx';

const GlassCard = ({
    children,
    className,
    hover = false,
    as = 'div',
    ...props
}) => {
    const Component = as;

    return (
        <Component
            className={clsx(
                'glass-surface card-neuro rounded-2xl',
                hover && 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(16,56,38,0.16)]',
                className,
            )}
            {...props}
        >
            {children}
        </Component>
    );
};

export default GlassCard;
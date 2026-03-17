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
                'rounded-xl border border-green-100 bg-white shadow-md',
                hover && 'transition-shadow duration-200 hover:shadow-lg',
                className,
            )}
            {...props}
        >
            {children}
        </Component>
    );
};

export default GlassCard;
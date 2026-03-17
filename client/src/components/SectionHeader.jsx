import React from 'react';
import clsx from 'clsx';

const SectionHeader = ({ title, subtitle, action, className }) => {
    return (
        <div className={clsx('mb-5 flex items-start justify-between gap-3', className)}>
            <div>
                <h2 className="text-display text-2xl font-semibold tracking-tight text-gray-800">{title}</h2>
                {subtitle ? (
                    <p className="mt-1 text-sm font-medium text-gray-600">{subtitle}</p>
                ) : null}
            </div>
            {action ? <div>{action}</div> : null}
        </div>
    );
};

export default SectionHeader;
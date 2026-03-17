import React from 'react';
import clsx from 'clsx';

const SectionHeader = ({ title, subtitle, action, className, eyebrow }) => {
    return (
        <div className={clsx('mb-5 flex items-start justify-between gap-3', className)}>
            <div>
                {eyebrow ? (
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700/80">{eyebrow}</p>
                ) : null}
                <h2 className="text-display text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">{title}</h2>
                {subtitle ? (
                    <p className="mt-1.5 max-w-xl text-sm font-medium leading-relaxed text-slate-600">{subtitle}</p>
                ) : null}
            </div>
            {action ? <div>{action}</div> : null}
        </div>
    );
};

export default SectionHeader;
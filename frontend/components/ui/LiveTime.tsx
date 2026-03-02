'use client';

import { useEffect, useState } from 'react';

interface LiveTimeProps {
    format?: Intl.DateTimeFormatOptions;
}

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
};

export default function LiveTime({ format = DEFAULT_FORMAT }: LiveTimeProps) {
    const [time, setTime] = useState('');

    useEffect(() => {
        const update = () =>
            setTime(new Date().toLocaleTimeString('en-US', format));
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [format]);

    // Render nothing on the server (avoids SSR/client mismatch)
    return <span suppressHydrationWarning>{time}</span>;
}

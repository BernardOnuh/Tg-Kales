import { useState, useEffect } from 'react';

const useTelegram = () => {
    const [tg, setTg] = useState(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-web-app.js';
        script.async = true;
        script.onload = () => {
            setTg(window.Telegram.WebApp);
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return tg;
};

export default useTelegram;

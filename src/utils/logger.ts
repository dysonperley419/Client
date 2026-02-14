const getTimestamp = () => {
    return new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 });
};

const styles = {
    timestamp: 'color: #888; font-style: italic;',
    logPrefix: 'background: #5865F2; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;',
    warnPrefix: 'background: #FEE75C; color: black; padding: 2px 5px; border-radius: 3px; font-weight: bold;',
    errorPrefix: 'background: #ED4245; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;',
    source: 'color: #B9BBBE; font-weight: bold;'
};

export const logger = {
    info: (source: string, message: string, data?: any) => {
        console.groupCollapsed(
            `%c${getTimestamp()}%c %c INFO %c %c[${source}]%c ${message}`,
            styles.timestamp, '',
            styles.logPrefix, '',
            styles.source, '',
        );

        if (data) {
            console.log(data);
        }

        console.groupEnd();
    },

    warn: (source: string, message: string, data?: any) => {
        console.group(
            `%c${getTimestamp()}%c %c WARN %c %c[${source}]%c ${message}`,
            styles.timestamp, '',
            styles.warnPrefix, '',
            styles.source, '',
        );

        if (data) {
            console.warn(data);
        }
        
        console.groupEnd();
    },

    error: (source: string, message: string, error?: any) => {
        console.error(
            `%c${getTimestamp()}%c %c ERROR %c %c[${source}]%c ${message}`,
            styles.timestamp, '',
            styles.errorPrefix, '',
            styles.source, '',
            error
        );
    }
};
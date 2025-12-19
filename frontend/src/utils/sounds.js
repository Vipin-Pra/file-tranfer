// Sound notification utility
const sounds = {
    peerJoined: () => {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);

        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.3);
    },

    peerDisconnected: () => {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.frequency.value = 400;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.5);
    },

    messageReceived: () => {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.frequency.value = 600;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);

        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.15);
    },

    fileTransferComplete: () => {
        const context = new (window.AudioContext || window.webkitAudioContext)();

        // Play two ascending tones
        [600, 800].forEach((freq, index) => {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.frequency.value = freq;
            oscillator.type = 'sine';

            const startTime = context.currentTime + (index * 0.15);
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.2);
        });
    }
};

// Play sound with error handling
export const playSound = (soundName) => {
    try {
        const soundFn = sounds[soundName];
        if (soundFn && localStorage.getItem('soundEnabled') !== 'false') {
            soundFn();
        }
    } catch (error) {
        console.error('Error playing sound:', error);
    }
};

// Toggle sound notifications
export const toggleSound = () => {
    const currentState = localStorage.getItem('soundEnabled') !== 'false';
    localStorage.setItem('soundEnabled', (!currentState).toString());
    return !currentState;
};

// Check if sound is enabled
export const isSoundEnabled = () => {
    return localStorage.getItem('soundEnabled') !== 'false';
};

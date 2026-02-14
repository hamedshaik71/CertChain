// src/hooks/useMicroInteractions.js
import { useCallback, useRef } from 'react';

// Disable external sounds due to 403 errors
// In production, use local sound files from /public/sounds/
const soundsEnabled = false;

export const useMicroInteractions = () => {
    const soundEnabled = useRef(soundsEnabled);

    // Play sound effect (disabled for now)
    const playSound = useCallback((type) => {
        if (soundEnabled.current) {
            console.log(`Sound would play: ${type}`);
            // In production, implement with local files:
            // const audio = new Audio(`/sounds/${type}.mp3`);
            // audio.volume = 0.3;
            // audio.play().catch(e => console.log('Audio play failed:', e));
        }
    }, []);

    // Toggle sounds
    const toggleSounds = useCallback(() => {
        soundEnabled.current = !soundEnabled.current;
        return soundEnabled.current;
    }, []);

    // Ripple effect for buttons
    const createRipple = useCallback((event) => {
        const button = event.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
        circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
        circle.classList.add('ripple');

        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) {
            ripple.remove();
        }

        button.appendChild(circle);
        playSound('click');
    }, [playSound]);

    // Magnetic button effect
    const magneticEffect = useCallback((event, strength = 0.3) => {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;

        button.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    }, []);

    const resetMagnetic = useCallback((event) => {
        event.currentTarget.style.transform = 'translate(0, 0)';
    }, []);

    // Haptic feedback (for mobile)
    const hapticFeedback = useCallback((type = 'light') => {
        if (navigator.vibrate) {
            switch (type) {
                case 'light':
                    navigator.vibrate(10);
                    break;
                case 'medium':
                    navigator.vibrate(20);
                    break;
                case 'heavy':
                    navigator.vibrate([30, 10, 30]);
                    break;
                case 'success':
                    navigator.vibrate([10, 50, 20]);
                    break;
                case 'error':
                    navigator.vibrate([50, 30, 50, 30, 50]);
                    break;
                default:
                    navigator.vibrate(10);
            }
        }
    }, []);

    // Trigger success animation
    const triggerSuccess = useCallback((element) => {
        if (element) {
            element.classList.add('success-pulse');
            playSound('success');
            hapticFeedback('success');
            
            setTimeout(() => {
                element.classList.remove('success-pulse');
            }, 600);
        }
    }, [playSound, hapticFeedback]);

    // Trigger error animation
    const triggerError = useCallback((element) => {
        if (element) {
            element.classList.add('error-shake');
            playSound('error');
            hapticFeedback('error');
            
            setTimeout(() => {
                element.classList.remove('error-shake');
            }, 500);
        }
    }, [playSound, hapticFeedback]);

    // Counter animation
    const animateCounter = useCallback((element, from, to, duration = 1000) => {
        const startTime = Date.now();
        const diff = to - from;

        const update = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(from + diff * easeOutQuart);

            if (element) {
                element.textContent = current.toLocaleString();
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    }, []);

    return {
        playSound,
        toggleSounds,
        createRipple,
        magneticEffect,
        resetMagnetic,
        hapticFeedback,
        triggerSuccess,
        triggerError,
        animateCounter,
        soundEnabled: soundEnabled.current
    };
};

export default useMicroInteractions;
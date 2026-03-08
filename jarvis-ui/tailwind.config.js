/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                jarvis: {
                    bg: '#0a0f1c',
                    dark: '#050810',
                    cyan: '#00f3ff',
                    blue: '#00a8ff',
                    text: '#e0f7fa',
                    alert: '#ff3333',
                    // Semantic Tokens
                    primary: '#00f3ff', // Main action color
                    secondary: '#00a8ff', // Secondary action color
                    success: '#00ff9d', // Success state
                    warning: '#ffb300', // Warning state
                    error: '#ff3333', // Error state
                    surface: '#0a0f1c', // Component background
                    border: 'rgba(0, 243, 255, 0.3)', // Default border
                }
            },
            fontFamily: {
                mono: ['"Fira Code"', 'monospace'],
                sans: ['"Inter"', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin 8s linear infinite',
                'spin-slower': 'spin 12s linear infinite',
                'spin-reverse': 'spin-reverse 1s linear infinite',
                'spin-reverse-slow': 'spin-reverse 8s linear infinite',
                'spin-reverse-slower': 'spin-reverse 12s linear infinite',
                'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
            },
            keyframes: {
                'spin-reverse': {
                    'from': { transform: 'rotate(360deg)' },
                    'to': { transform: 'rotate(0deg)' },
                }
            },
            boxShadow: {
                'glow': '0 0 20px rgba(0, 243, 255, 0.3)',
                'glow-sm': '0 0 10px rgba(0, 243, 255, 0.2)',
                'glow-md': '0 0 30px rgba(0, 243, 255, 0.4)',
                'glow-lg': '0 0 50px rgba(0, 243, 255, 0.5)',
            }
        }
    },
    plugins: [],
};

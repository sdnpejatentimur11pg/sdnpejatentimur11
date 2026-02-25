tailwind.config = {
    theme: {
        extend: {
            colors: {
                sd: {
                    red: '#DC2626',      /* Merah SD Utama */
                    dark: '#991B1B',     /* Merah Gelap (Hover) */
                    light: '#FEF2F2',    /* Merah Sangat Muda (Background) */
                }
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'sans-serif'],
            },
            animation: {
                'scaleIn': 'scaleIn 0.3s ease-out forwards',
            },
            keyframes: {
                scaleIn: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                }
            }
        }
    }
}

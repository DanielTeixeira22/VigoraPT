import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
    initialColorMode: 'light',
    useSystemColorMode: false, // Disable to avoid dark mode issues
};

const colors = {
    brand: {
        50: '#e6f7f4',
        100: '#c2ebe3',
        200: '#9bded1',
        300: '#73d1bf',
        400: '#52c7b0',
        500: '#33b79e',
        600: '#2a9a84',
        700: '#207a68',
        800: '#175a4d',
        900: '#0e3a32',
    },
    accent: {
        50: '#fff5e6',
        100: '#ffe4bf',
        200: '#ffd199',
        300: '#ffbe73',
        400: '#ffac4d',
        500: '#ffa92e',
        600: '#e69529',
        700: '#cc8024',
        800: '#b36b1f',
        900: '#99571a',
    },
};

const semanticTokens = {
    colors: {
        background: {
            default: '#f7f8fa',
            _dark: '#1a1a2e',
        },
        card: {
            default: '#ffffff',
            _dark: '#25253a',
        },
        border: {
            default: '#e2e8f0',
            _dark: '#3a3a50',
        },
        muted: {
            default: '#718096',
            _dark: '#a0aec0',
        },
        text: {
            default: '#1a202c',
            _dark: '#f7fafc',
        },
        textSecondary: {
            default: '#4a5568',
            _dark: '#e2e8f0',
        },
    },
};

const fonts = {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
};

const styles = {
    global: {
        body: {
            bg: 'background',
            color: 'text',
        },
    },
};

const components = {
    Button: {
        defaultProps: {
            colorScheme: 'brand',
        },
    },
    Card: {
        baseStyle: {
            container: {
                bg: 'card',
                color: 'text',
                borderRadius: '16px',
                boxShadow: 'sm',
            },
        },
    },
    Heading: {
        baseStyle: {
            color: 'text',
        },
    },
    Input: {
        variants: {
            outline: {
                field: {
                    bg: 'card',
                    borderColor: 'border',
                    color: 'text',
                    _placeholder: {
                        color: 'muted',
                    },
                },
            },
        },
    },
    Textarea: {
        variants: {
            outline: {
                bg: 'card',
                borderColor: 'border',
                color: 'text',
                _placeholder: {
                    color: 'muted',
                },
            },
        },
    },
    Select: {
        variants: {
            outline: {
                field: {
                    bg: 'card',
                    borderColor: 'border',
                    color: 'text',
                },
            },
        },
    },
    Menu: {
        baseStyle: {
            list: {
                zIndex: 'dropdown',
            },
        },
    },
};

const zIndices = {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
};

const theme = extendTheme({
    config,
    colors,
    semanticTokens,
    fonts,
    styles,
    components,
    zIndices,
});

export default theme;

import React from 'react';
import { useNavigate } from 'react-router';
import {
    Box, Button, Container, Typography, Card, CardContent,
    Grid, Avatar, Divider, ThemeProvider, createTheme,
    styled, useMediaQuery, Chip, Stack, GlobalStyles
} from '@mui/material';
import {
    ShowChart, Timeline, Assessment, PieChart as PieChartIcon,
    BarChart as BarChartIcon, CompareArrows, AutoGraph,
    Security, Money, Insights, TrendingUp, RocketLaunch,
    Science, Schema, Terminal, DataObject
} from '@mui/icons-material';
import { deepPurple, orange, green, blue, pink, cyan } from '@mui/material/colors';
import Navbar from './Navbar';
import Squares from './Squares';
import PixelCard from './PixelCard';
import { useUser } from '@clerk/clerk-react';

// Futuristic Theme Configuration
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#9c27b0' },
        secondary: { main: '#00e5ff' },
        background: {
            default: '#0a0a12',
            paper: 'rgba(20, 20, 30, 0.9)',
        },
    },
    typography: {
        fontFamily: '"Rajdhani", "Inter", sans-serif',
        h1: {
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1
        },
        h2: {
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
        },
        h3: {
            fontWeight: 600,
            lineHeight: 1.2
        },
        button: {
            textTransform: 'none',
            fontWeight: 600
        }
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backdropFilter: 'blur(12px)',
                    background: 'rgba(30, 30, 45, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 16px 32px rgba(156, 39, 176, 0.3)',
                        borderColor: 'rgba(156, 39, 176, 0.3)'
                    }
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: '12px 24px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }
            }
        }
    }
});

const features = [
    {
        icon: <AutoGraph />,
        title: "Advanced Analytics",
        description: "Real-time portfolio performance tracking with deep analytics and customizable dashboards.",
        color: deepPurple
    },
    {
        icon: <Security />,
        title: "Risk Management",
        description: "Comprehensive risk metrics including Value at Risk, Beta, and Sharpe Ratio calculations.",
        color: orange
    },
    {
        icon: <CompareArrows />,
        title: "Market Comparison",
        description: "Benchmark your portfolio against major indices and custom benchmarks.",
        color: green
    },
    {
        icon: <Insights />,
        title: "AI Insights",
        description: "Get AI-powered investment recommendations and portfolio optimization suggestions.",
        color: blue
    }
];


// Futuristic Gradient Text
const GradientText = styled(Typography)(({ theme }) => ({
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline',
    fontWeight: 800
}));

const WhiteText = styled(Typography)(({ theme }) => ({
    color: '#ffffff',
    display: 'inline',
    fontWeight: 800
}));

// Holographic Card Component
const HolographicCard = styled(Card)(({ theme }) => ({
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(135deg, 
      rgba(156, 39, 176, 0.1) 0%, 
      rgba(0, 229, 255, 0.05) 50%, 
      rgba(156, 39, 176, 0.1) 100%)`,
        zIndex: -1
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        top: "-50%",
        left: "-50%",
        right: "-50%",
        bottom: "-50%",
        background: `linear-gradient(
      to bottom right,
      rgba(156, 39, 176, 0) 0%,
      rgba(156, 39, 176, 0) 35%,
      rgba(156, 39, 176, 0.1) 50%,
      rgba(156, 39, 176, 0) 65%,
      rgba(156, 39, 176, 0) 100%
    )`,
        transform: 'rotate(30deg)',
        animation: 'holographicEffect 6s linear infinite',
        zIndex: -1
    },
    '@keyframes holographicEffect': {
        '0%': { transform: 'rotate(30deg) translateX(-100%) translateY(-100%)' },
        '100%': { transform: 'rotate(30deg) translateX(100%) translateY(100%)' }
    }
}));

// Futuristic Feature Card
const FeatureCard = styled(HolographicCard)(({ theme }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(4),
    '&:hover': {
        '& .feature-icon': {
            transform: 'translateY(-5px) scale(1.1)',
            boxShadow: `0 0 30px ${theme.palette.primary.main}40`
        }
    }
}));

const FeatureIcon = styled(Avatar)(({ theme, color }) => ({
    width: 72,
    height: 72,
    marginBottom: theme.spacing(3),
    background: `linear-gradient(135deg, ${color[500]}, ${color[700]})`,
    boxShadow: `0 8px 24px ${color[700]}30`,
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    '& .MuiSvgIcon-root': {
        fontSize: '2.5rem'
    }
}));

// Cyberpunk Button
const CyberButton = styled(Button)(({ theme }) => ({
    position: 'relative',
    overflow: 'hidden',
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    color: 'black',
    fontWeight: 700,
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
        transform: 'translateX(-100%)',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    '&:hover': {
        '&::before': {
            transform: 'translateX(100%)'
        },
        boxShadow: `0 0 20px ${theme.palette.primary.main}80`
    }
}));

// Neon Border Box
const NeonBorderBox = styled(Box)(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    padding: '2px',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: theme.shape.borderRadius,
        padding: '2px',
        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        animation: 'neonGlow 2s ease-in-out infinite alternate',
        zIndex: -1
    },
    '@keyframes neonGlow': {
        '0%': { opacity: 0.7 },
        '100%': { opacity: 1 }
    }
}));

const LandingPage = () => {
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const { isSignedIn } = useUser();

    const testimonials = [
        {
            name: "Dr. Elena Kovac",
            role: "Quantum Finance Researcher",
            quote: "Axion's analytics platform is 5 years ahead of anything else in the market. The predictive modeling is uncanny."
        },
        {
            name: "Raj Patel",
            role: "Crypto Hedge Fund Manager",
            quote: "We've reduced our risk exposure by 37% since implementing Axion's AI recommendations."
        },
        {
            name: "Mika Tanaka",
            role: "FinTech Innovator",
            quote: "The visualization tools alone are worth the subscription. Our analysts are twice as productive now."
        }
    ];

    return (
        <>
            <GlobalStyles styles={{
                html: {
                    backgroundColor: '#0a0a12',
                    overscrollBehavior: 'none',
                    height: '100dvh',
                    width: '100%',
                    overflowX: 'hidden',
                },
                body: {
                    overscrollBehavior: 'none',
                    height: '100dvh',
                    width: '100%',
                    overflowX: 'hidden',
                }
            }} />
            {/* Background with Squares Animation */}
            <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: -2,
                background: 'radial-gradient(circle at 20% 30%, #0a0a12 0%, #000000 100%)',
                backgroundColor: '#0a0a12',
                overflow: 'hidden',
                minHeight: '100dvh', // ✅ Use 100dvh instead of 100vh
                width: '100vw',
                '@media (max-width: 600px)': {
                    position: 'fixed',
                    minHeight: '100dvh', // ✅ Ensure full mobile screen height
                    touchAction: 'none'
                }
            }} >

                <Squares
                    speed={0.5}
                    squareSize={40}
                    direction='diagonal'
                    borderColor='rgba(255, 255, 255, 0.05)'
                    hoverFillColor='rgba(156, 39, 176, 0.1)'
                />
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, transparent 100%)',
                    overflow: 'hidden'
                }} />
            </Box>

            <Navbar />

            {/* Main Content */}
            <ThemeProvider theme={theme}>
                <Container maxWidth="xl" sx={{ pt: { xs: 6, md: 10 }, pb: 12 }}>
                    {/* Hero Section */}
                    {/* Hero Section */}
                    <Box sx={{
                        minHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        mb: { xs: 8, md: 10 }
                    }}>
                        <Box sx={{
                            maxWidth: 1000,
                            mx: 'auto',
                            px: 3,
                            position: 'relative',
                            zIndex: 1
                        }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 5,
                                gap: 3
                            }}>
                                <img
                                    src="/logo.png"
                                    alt="Axion Logo"
                                    style={{
                                        height: isMobile ? 60 : 80,
                                        width: isMobile ? 60 : 80,
                                        objectFit: 'contain'
                                    }}
                                />
                                <Typography variant="h2" sx={{
                                    background: `linear-gradient(90deg, ${deepPurple[500]}, ${orange[500]})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontSize: isMobile ? '2.5rem' : '4rem'
                                }}>
                                    Axion
                                </Typography>
                            </Box>

                            <Typography variant="h4" sx={{
                                fontWeight: 400,
                                color: 'text.secondary',
                                mb: 5,
                                maxWidth: 800,
                                mx: 'auto',
                                fontSize: isMobile ? '1.25rem' : '1.5rem'
                            }}>
                                Axion combines traditional funds Management with <GradientText variant="inherit">Gen-AI Portfolio Analytics</GradientText> providing valuable insights and complex risk analysis.
                            </Typography>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
                                <CyberButton
                                    size="large"
                                    sx={{
                                        px: 5,
                                        py: 2,
                                        fontSize: '1rem'
                                    }}
                                    onClick={() => navigate(isSignedIn ? '/xplore' : '/login')}
                                >
                                    {isSignedIn ? 'Proceed to Market ▶' : 'Proceed to Login ▶'}
                                </CyberButton>
                            </Stack>
                        </Box>
                    </Box>

                    {/* Features Section */}
                    <Box sx={{ mb: 10 }}>
                        <Typography variant="h2" sx={{
                            textAlign: 'center',
                            mb: 8,
                            background: `linear-gradient(90deg, ${deepPurple[500]}, ${orange[500]})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Powerful  <GradientText variant="inherit">Features</GradientText>
                        </Typography>

                        <Grid container spacing={4}>
                            {features.map((feature, index) => (
                                <Grid item xs={12} sm={6} md={3} key={index}>
                                    <FeatureCard>
                                        <FeatureIcon color={feature.color} className="feature-icon">
                                            {feature.icon}
                                        </FeatureIcon>
                                        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary">
                                            {feature.description}
                                        </Typography>
                                    </FeatureCard>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                    {/* Analytics Showcase */}
                    {/* Analytics Showcase */}
                    <Box sx={{ mb: { xs: 10, md: 10 } }}>
                        <Box sx={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column-reverse' : 'row',
                            alignItems: 'center',
                            gap: 6
                        }}>
                            <Box sx={{ flex: 1 }}>
                                <Chip
                                    label="Portfolio Visualizations"
                                    sx={{
                                        mb: 2,
                                        background: 'rgba(0, 229, 255, 0.1)',
                                        color: cyan[500],
                                        fontWeight: 600,
                                        letterSpacing: '1px'
                                    }}
                                />
                                <Typography variant="body1" sx={{
                                    fontWeight: 400,
                                    color: 'text.secondary',
                                    mb: 3,
                                    maxWidth: 800,
                                    mx: 'auto',
                                    fontSize: isMobile ? '1.25rem' : '1.5rem'
                                }}>
                                    <GradientText variant="inherit">Gen-AI Portfolio Analytics</GradientText>
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
                                    Graphical data visualizations for data insights and complex risk analysis using real-time APIs
                                </Typography>

                                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
                                    <Chip
                                        icon={<TrendingUp />}
                                        label="Real-time Streams"
                                        sx={{
                                            background: 'rgba(156, 39, 176, 0.1)',
                                            color: deepPurple[300],
                                            border: `1px solid ${deepPurple[500]}30`
                                        }}
                                    />
                                    <Chip
                                        icon={<PieChartIcon />}
                                        label="Complex Risk Assessment"
                                        sx={{
                                            background: 'rgba(0, 229, 255, 0.1)',
                                            color: cyan[300],
                                            border: `1px solid ${cyan[500]}30`
                                        }}
                                    />
                                    <Chip
                                        icon={<Assessment />}
                                        label="Graphical Analytics"
                                        sx={{
                                            background: 'rgba(233, 30, 99, 0.1)',
                                            color: pink[300],
                                            border: `1px solid ${pink[500]}30`
                                        }}
                                    />
                                </Stack>
                            </Box>

                            {/* Replaced with PixelCard */}
                            <Box sx={{
                                flex: 1,
                                position: 'relative',
                                minHeight: 400,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <PixelCard variant="blue">
                                    <Box sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        textAlign: 'center',
                                        width: '95%'
                                    }}>
                                        <Terminal sx={{
                                            fontSize: 80,
                                            mb: 2,
                                            color: 'white',
                                            filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))'
                                        }} />
                                        <Typography variant="h6" sx={{
                                            color: 'white',
                                            textTransform: 'uppercase',
                                            letterSpacing: '2px',
                                            fontWeight: 600,
                                            textShadow: '0 0 8px rgba(255,255,255,0.5)'
                                        }}>
                                            Beautiful Graphical Visualizations
                                        </Typography>
                                    </Box>
                                </PixelCard>
                            </Box>
                        </Box>
                    </Box>


                </Container>

                {/* Futuristic Footer */}
                <Box sx={{
                    py: 6,
                    borderTop: '1px solid rgba(156, 39, 176, 0.2)',
                    background: 'linear-gradient(to bottom, rgba(10, 10, 18, 0.9), rgba(5, 5, 10, 1))',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: `linear-gradient(90deg, transparent, ${deepPurple[500]}, ${cyan[500]}, transparent)`,
                        boxShadow: `0 0 10px ${deepPurple[500]}`
                    }
                }}>
                    <Container maxWidth="xl">
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={4}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    mb: 2
                                }}>
                                    <img
                                        src="/logo.png"
                                        alt="Axion Logo"
                                        style={{
                                            height: 40,
                                            width: 40,
                                            objectFit: 'contain'
                                        }}
                                    />
                                    <Typography variant="h6" sx={{
                                        fontWeight: 700,
                                        fontSize: '1.5rem'
                                    }}>
                                        <GradientText>Axion</GradientText>
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                                    The future of fund management powered by AI driven insights and risk analysis.
                                </Typography>
                            </Grid>

                            <Grid item xs={6} sm={3} md={2}>

                                <Stack spacing={1}>
                                    <Typography variant="body2" color="text.secondary" sx={{ '&:hover': { color: cyan[500], cursor: 'pointer' } }} onClick={() => { navigate("/about") }}>About</Typography>
                                </Stack>
                            </Grid>

                            <Grid item xs={6} sm={3} md={2}>

                                <Stack spacing={1}>
                                    <Typography variant="body2" color="text.secondary" sx={{ '&:hover': { color: cyan[500], cursor: 'pointer' } }} onClick={() => { navigate("/login") }}>Login</Typography>
                                </Stack>
                            </Grid>

                            <Grid item xs={6} sm={3} md={2}>

                                <Stack spacing={1}>
                                    <Typography variant="body2" color="text.secondary" sx={{ '&:hover': { color: cyan[500], cursor: 'pointer' } }} onClick={() => { navigate("/dashboard") }}>Dashboard</Typography>
                                </Stack>
                            </Grid>

                            <Grid item xs={6} sm={3} md={2}>

                                <Stack spacing={1}>
                                    <Typography variant="body2" color="text.secondary" sx={{ '&:hover': { color: cyan[500], cursor: 'pointer' } }} onClick={() => { navigate("/analytics") }}>Analytics</Typography>
                                </Stack>
                            </Grid>
                        </Grid>

                        <Divider sx={{
                            my: 6,
                            borderColor: 'rgba(156, 39, 176, 0.2)',
                            '&::before, &::after': {
                                borderColor: 'rgba(156, 39, 176, 0.2)'
                            }
                        }} />

                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            © {new Date().getFullYear()} Axion. All rights reserved.
                        </Typography>
                    </Container>
                </Box>
            </ThemeProvider>
        </>
    );
};

export default LandingPage;
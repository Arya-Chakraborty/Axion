import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Box, Button, Container, Typography, Card, CardContent,
    Chip, ThemeProvider, Avatar, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
    Paper, LinearProgress, createTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    InputAdornment, GlobalStyles
} from '@mui/material';
import {
    ArrowDropUp, ArrowDropDown,
    ArrowBack
} from '@mui/icons-material';
import { green, red, orange, deepPurple, blue } from '@mui/material/colors';
import axios from 'axios';
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import Navbar from "./Navbar";
import { styled } from '@mui/material/styles';
import {
    Refresh,
    WarningAmber,
    CheckCircle,
    ArrowForward
} from '@mui/icons-material';
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#7b2cbf',
        },
        secondary: {
            main: '#ff9e00',
        },
        background: {
            default: '#0f0f13',
            paper: 'rgba(30, 30, 40, 0.8)',
        },
    },
    typography: {
        fontFamily: '"Poppins", "Inter", sans-serif',
        h1: {
            fontWeight: 800,
            letterSpacing: '-0.05em',
        },
        h2: {
            fontWeight: 700,
        },
        h3: {
            fontWeight: 600,
        }
    },
    shape: {
        borderRadius: 16
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backdropFilter: 'blur(16px)',
                    background: 'rgba(40, 40, 50, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)'
                }
            }
        }
    }
});

const GlassCard = styled(Card)(({ theme }) => ({
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4)'
    },
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(45deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
        borderRadius: theme.shape.borderRadius,
        zIndex: -1
    },
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(16px)',
    background: 'rgba(40, 40, 50, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)'
}));

const FundDetails = () => {
    const { portfolioId } = useParams();
    const { user } = useUser();
    const navigate = useNavigate();
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPrices, setCurrentPrices] = useState({});
    const [priceLoading, setPriceLoading] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [evaluationLoading, setEvaluationLoading] = useState(false);
    const [sellDialogOpen, setSellDialogOpen] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState(null);
    const [sellQuantity, setSellQuantity] = useState(1);
    const [selling, setSelling] = useState(false);

    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);

    useEffect(() => {
        if (user && portfolioId) {
            fetchPortfolio();
        }
    }, [user, portfolioId]);

    useEffect(() => {
        if (portfolio) {
            fetchCurrentPrices();
            fetchPortfolioEvaluation();
        }
    }, [portfolio]);

    const fetchPortfolio = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/v1/getPortfolioById/${portfolioId}`);
            setPortfolio(response.data.data);
        } catch (err) {
            console.error('Error fetching portfolio:', err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentPrices = async () => {
        try {
            setPriceLoading(true);
            const symbols = portfolio.holdings.map(holding => holding.symbol);

            if (symbols.length === 0) return;

            const pricePromises = symbols.map(symbol =>
                axios.get(`/api/v1/getFundPrice/${symbol}`)
            );

            const priceResponses = await Promise.all(pricePromises);
            const newPrices = {};

            priceResponses.forEach((response, index) => {
                if (response.data && response.data.currentPrice) {
                    newPrices[symbols[index]] = response.data.currentPrice;
                }
            });

            setCurrentPrices(newPrices);
        } catch (err) {
            console.error('Error fetching current prices:', err);
        } finally {
            setPriceLoading(false);
        }
    };

    const fetchPortfolioEvaluation = async () => {
        try {
            setAnalysisLoading(true);
            setAnalysisError(null);

            const response = await axios.post(
                '/api/v1/portfolios/evaluate',
                { portfolioId }
            );

            setEvaluation(response.data);
        } catch (err) {
            console.error('Error fetching evaluation:', err);
            setAnalysisError(err.response?.data?.message || err.message);
        } finally {
            setAnalysisLoading(false);
        }
    };

    const calculateHoldingPerformance = useCallback((holding) => {
        const currentPrice = currentPrices[holding.symbol] || holding.avgBuyPrice;
        const currentValue = currentPrice * holding.quantity;
        const costBasis = holding.totalCost || (holding.avgBuyPrice * holding.quantity);
        const gainLoss = currentValue - costBasis;
        const percentage = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

        return {
            currentPrice,
            currentValue,
            costBasis,
            gainLoss,
            percentage,
            isPositive: gainLoss >= 0
        };
    }, [currentPrices]);

    const handleSell = async () => {
        try {
            setSelling(true);

            if (!selectedHolding || !portfolioId || sellQuantity <= 0) return;

            const response = await axios.post(
                '/api/v1/portfolios/sell',
                {
                    portfolioId,
                    symbol: selectedHolding.symbol,
                    quantity: sellQuantity
                }
            );

            setSellDialogOpen(false);
            fetchPortfolio(); // Refresh portfolio data
            fetchPortfolioEvaluation(); // Refresh evaluation if needed
        } catch (err) {
            console.error('Error selling holding:', err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setSelling(false);
        }
    };

    const calculatePortfolioPerformance = useCallback(() => {
        if (!portfolio) return {};

        let currentValue = 0;
        let costBasis = portfolio.totalPortfolioCost || 0;

        portfolio.holdings.forEach(holding => {
            const perf = calculateHoldingPerformance(holding);
            currentValue += perf.currentValue;
        });

        const gainLoss = currentValue - costBasis;
        const percentage = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

        return {
            currentValue,
            costBasis,
            gainLoss,
            percentage,
            isPositive: gainLoss >= 0
        };
    }, [portfolio, calculateHoldingPerformance]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value || 0);
    };

    const formatPercentage = (value) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const preparePieChartData = useCallback(() => {
        if (!portfolio) return [];

        const portfolioValue = calculatePortfolioPerformance().currentValue;
        const holdingsWithAllocation = portfolio.holdings.map(holding => {
            const perf = calculateHoldingPerformance(holding);
            const allocation = portfolioValue > 0 ?
                (perf.currentValue / portfolioValue) * 100 : 0;
            return {
                ...holding,
                allocation,
                value: perf.currentValue
            };
        });

        holdingsWithAllocation.sort((a, b) => b.allocation - a.allocation);

        const top10 = holdingsWithAllocation.slice(0, 10);
        const others = holdingsWithAllocation.slice(10);
        const othersValue = others.reduce((sum, h) => sum + h.value, 0);

        const pieData = [
            ...top10.map(h => ({
                name: h.symbol,
                value: h.value,
                allocation: h.allocation
            })),
            ...(othersValue > 0 ? [{
                name: 'Others',
                value: othersValue,
                allocation: others.reduce((sum, h) => sum + h.allocation, 0)
            }] : [])
        ];

        return pieData;
    }, [portfolio, calculatePortfolioPerformance, calculateHoldingPerformance]);

    const COLORS = [
        '#7b2cbf', '#ff9e00', '#00b4d8', '#00c853', '#ff3d00',
        '#6200ea', '#009688', '#ffab00', '#c51162', '#2962ff',
        '#795548'
    ];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: '#1e1e28',
                    padding: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px'
                }}>
                    <p style={{ margin: 0 }}>{payload[0].name}</p>
                    <p style={{ margin: 0 }}>
                        {formatCurrency(payload[0].value)} ({payload[0].payload.allocation.toFixed(1)}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    const renderCustomizedLabel = ({
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        percent,
        index,
        name
    }) => {
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 20;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const segmentMiddleRadius = innerRadius + (outerRadius - innerRadius) / 2;
        const segmentX = cx + segmentMiddleRadius * Math.cos(-midAngle * RADIAN);
        const segmentY = cy + segmentMiddleRadius * Math.sin(-midAngle * RADIAN);

        const isRightSide = x > cx;
        const textAnchor = isRightSide ? 'start' : 'end';
        const lineEndX = isRightSide ? x - 5 : x + 5;

        const isMobile = window.innerWidth < 600;
        const labelOffset = isMobile ? 10 : 20;
        const maxTextLength = isMobile ? 8 : 15;

        const displayName = isMobile && name.length > maxTextLength
            ? `${name.substring(0, maxTextLength)}...`
            : name;

        return (
            <g>
                <path
                    d={`M${segmentX},${segmentY} L${lineEndX},${y}`}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={1}
                    fill="none"
                />
                <text
                    x={x}
                    y={y}
                    fill="white"
                    textAnchor={textAnchor}
                    dominantBaseline="central"
                    fontSize={isMobile ? 10 : 12}
                    fontWeight={500}
                >
                    {`${displayName} ${(percent * 100).toFixed(0)}%`}
                </text>
            </g>
        );
    };

    return (
        <>
            <GlobalStyles styles={{
                html: {
                    backgroundColor: 'rgba(7, 7, 7, 0.9)',
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
            <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: -1,
                background: 'rgba(7, 7, 7, 0.9)',
                backgroundColor: 'rgba(7, 7, 7, 0.9)',
                overflow: 'hidden',
                minHeight: '100dvh', // ✅ Use 100dvh instead of 100vh
                width: '100vw',
                '@media (max-width: 600px)': {
                    position: 'fixed',
                    minHeight: '100dvh', // ✅ Ensure full mobile screen height
                    touchAction: 'none'
                }
            }} />

            <Navbar />

            <ThemeProvider theme={theme}>
                <Container maxWidth="xl" sx={{ py: 6, minHeight: '100vh', position: 'relative' }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/dashboard')}
                        sx={{
                            mb: 3,
                            color: 'text.secondary',
                            '&:hover': {
                                color: 'primary.main',
                                backgroundColor: 'rgba(123, 44, 191, 0.1)'
                            }
                        }}
                    >
                        Back to Dashboard
                    </Button>

                    {(loading || priceLoading) && (
                        <Box sx={{ width: '100%', mt: 4 }}>
                            <LinearProgress color="secondary" />
                        </Box>
                    )}

                    {portfolio && (
                        <>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: 4,
                                flexDirection: { xs: 'column', sm: 'row' },
                                gap: 2
                            }}>
                                <Avatar
                                    sx={{
                                        mr: { sm: 3 },
                                        width: 64,
                                        height: 64,
                                        fontSize: 24,
                                        fontWeight: 'bold',
                                        background: `linear-gradient(135deg, ${deepPurple[500]}, ${orange[500]})`
                                    }}
                                >
                                    {portfolio.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="h1"
                                        sx={{
                                            fontSize: { xs: '2rem', md: '2.5rem' },
                                            fontWeight: 700,
                                            letterSpacing: '-0.03em',
                                            background: `white`,
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        }}
                                    >
                                        {portfolio.name}
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        Created on {new Date(portfolio.createdAt).toLocaleDateString()}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={`${portfolio.holdings.length} holdings`}
                                    sx={{
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'text.primary',
                                        fontSize: '0.9rem',
                                        height: 'auto',
                                        py: 1
                                    }}
                                />
                            </Box>

                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                                gap: 3,
                                mb: 4
                            }}>
                                <GlassCard>
                                    <CardContent>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Current Value
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                                            {formatCurrency(calculatePortfolioPerformance().currentValue)}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                                vs Cost Basis:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: calculatePortfolioPerformance().isPositive ? green[500] : red[500],
                                                    fontWeight: 600
                                                }}
                                            >
                                                {formatPercentage(calculatePortfolioPerformance().percentage)}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </GlassCard>

                                <GlassCard>
                                    <CardContent>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Total Invested
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                                            {formatCurrency(calculatePortfolioPerformance().costBasis)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Average buy price across all holdings
                                        </Typography>
                                    </CardContent>
                                </GlassCard>

                                <GlassCard>
                                    <CardContent>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Profit/Loss
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            {calculatePortfolioPerformance().isPositive ? (
                                                <ArrowDropUp sx={{ color: green[500], fontSize: '2.5rem' }} />
                                            ) : (
                                                <ArrowDropDown sx={{ color: red[500], fontSize: '2.5rem' }} />
                                            )}
                                            <Typography
                                                variant="h4"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: calculatePortfolioPerformance().isPositive ? green[500] : red[500]
                                                }}
                                            >
                                                {formatCurrency(calculatePortfolioPerformance().gainLoss)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            All-time performance
                                        </Typography>
                                    </CardContent>
                                </GlassCard>
                            </Box>

                            <Card sx={{ mb: 4 }}>
                                <CardContent sx={{ p: 0 }}>
                                    <Typography variant="h6" sx={{ p: 3, pb: 1, fontWeight: 600 }}>
                                        Your Holdings
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255, 255, 255, 0.1)' } }}>
                                                    <TableCell sx={{ fontWeight: 600 }}>Fund</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Avg. Buy Price</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Current Price</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Invested</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Current Value</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Change</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {portfolio.holdings.map((holding) => {
                                                    const perf = calculateHoldingPerformance(holding);

                                                    return (
                                                        <TableRow
                                                            key={holding.symbol}
                                                            hover
                                                            sx={{
                                                                '&:last-child td': { borderBottom: 0 },
                                                                '&:hover': {
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.03)'
                                                                }
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <Avatar
                                                                        sx={{
                                                                            width: 32,
                                                                            height: 32,
                                                                            fontSize: 14,
                                                                            mr: 2,
                                                                            background: `linear-gradient(135deg, ${blue[500]}, ${deepPurple[500]})`
                                                                        }}
                                                                    >
                                                                        {holding.symbol.substring(0, 2)}
                                                                    </Avatar>
                                                                    <Box>
                                                                        <Typography variant="body1">{holding.name}</Typography>
                                                                        <Typography variant="body2" color="text.secondary">{holding.symbol}</Typography>
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography>{holding.quantity}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography>{formatCurrency(holding.avgBuyPrice)}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography>{formatCurrency(perf.currentPrice)}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography>{formatCurrency(perf.costBasis)}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Typography>{formatCurrency(perf.currentValue)}</Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                                    {perf.isPositive ? (
                                                                        <ArrowDropUp sx={{ color: green[500] }} />
                                                                    ) : (
                                                                        <ArrowDropDown sx={{ color: red[500] }} />
                                                                    )}
                                                                    <Typography
                                                                        sx={{
                                                                            color: perf.isPositive ? green[500] : red[500],
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {formatPercentage(perf.percentage)}
                                                                    </Typography>
                                                                </Box>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        color: perf.isPositive ? green[500] : red[500]
                                                                    }}
                                                                >
                                                                    {formatCurrency(perf.gainLoss)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right">

                                                                <Button
                                                                    variant="outlined"
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedHolding(holding);
                                                                        setSellQuantity(1);
                                                                        setSellDialogOpen(true);
                                                                    }}
                                                                    sx={{
                                                                        mt: 1,
                                                                        textTransform: 'none',
                                                                        borderColor: red[500],
                                                                        color: red[500],
                                                                        '&:hover': {
                                                                            backgroundColor: 'rgba(186, 89, 89, 0.08)',
                                                                            borderColor: red[700]
                                                                        }
                                                                    }}
                                                                >
                                                                    Sell
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                        Performance Breakdown
                                    </Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                                        <Box>
                                            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                                                Allocation by Fund
                                            </Typography>
                                            <Box sx={{ height: 400 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={preparePieChartData()}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            outerRadius={120}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                            nameKey="name"
                                                            label={renderCustomizedLabel}
                                                        >
                                                            {preparePieChartData().map((entry, index) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={COLORS[index % COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<CustomTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                                                Top Performers
                                            </Typography>
                                            <GlassCard sx={{ p: 2 }}>
                                                {[...portfolio.holdings]
                                                    .sort((a, b) => {
                                                        const perfA = calculateHoldingPerformance(a).percentage;
                                                        const perfB = calculateHoldingPerformance(b).percentage;
                                                        return perfB - perfA;
                                                    })
                                                    .slice(0, 5)
                                                    .map((holding) => {
                                                        const perf = calculateHoldingPerformance(holding);
                                                        return (
                                                            <Box
                                                                key={holding.symbol}
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    p: 1.5,
                                                                    mb: 1,
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    borderRadius: 1,
                                                                    transition: 'all 0.3s ease',
                                                                    '&:hover': {
                                                                        transform: 'translateY(-2px)',
                                                                        background: 'rgba(255,255,255,0.08)',
                                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                                                                    }
                                                                }}
                                                            >
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <Avatar
                                                                        sx={{
                                                                            width: 32,
                                                                            height: 32,
                                                                            fontSize: 14,
                                                                            mr: 2,
                                                                            background: `linear-gradient(135deg, ${blue[500]}, ${deepPurple[500]})`
                                                                        }}
                                                                    >
                                                                        {holding.symbol.substring(0, 2)}
                                                                    </Avatar>
                                                                    <Typography variant="body2">{holding.symbol}</Typography>
                                                                </Box>
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        color: perf.isPositive ? green[500] : red[500],
                                                                        fontWeight: 600
                                                                    }}
                                                                >
                                                                    {formatPercentage(perf.percentage)}
                                                                </Typography>
                                                            </Box>
                                                        );
                                                    })}
                                            </GlassCard>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </>
                    )}
                    <Card sx={{
                        mt: 4,
                        background: 'rgba(40, 40, 50, 0.6)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)'
                    }}>
                        <CardContent sx={{ p: 0 }}>
                            {/* Header */}
                            <Box sx={{
                                p: 3,
                                pb: 2,
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'linear-gradient(90deg, rgba(123, 44, 191, 0.1), rgba(255, 158, 0, 0.1))'
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h5" sx={{
                                        fontWeight: 700,
                                        background: `linear-gradient(90deg, ${deepPurple[400]}, ${orange[500]})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        display: 'inline'
                                    }}>
                                        AI Portfolio Insights
                                    </Typography>
                                    <IconButton
                                        onClick={fetchPortfolioEvaluation}
                                        disabled={loading}
                                        sx={{
                                            color: 'text.secondary',
                                            '&:hover': { color: 'primary.main', background: 'rgba(123, 44, 191, 0.1)' }
                                        }}
                                    >
                                        <Refresh sx={{
                                            fontSize: '1.25rem',
                                            transition: 'transform 0.5s ease',
                                            transform: loading ? 'rotate(360deg)' : 'rotate(0deg)'
                                        }} />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Content */}
                            {analysisError ? (
                                <Box sx={{
                                    p: 3,
                                    background: 'rgba(255, 50, 50, 0.1)',
                                    borderLeft: `4px solid ${red[500]}`,
                                    my: 2,
                                    mx: 3,
                                    borderRadius: 1
                                }}>
                                    <Typography color="error" sx={{ mb: 1 }}>Analysis failed</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {analysisError}
                                    </Typography>
                                    <Button
                                        onClick={fetchPortfolioEvaluation}
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<Refresh />}
                                    >
                                        Retry
                                    </Button>
                                </Box>
                            ) : analysisLoading ? (
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    py: 6,
                                    minHeight: 300,
                                    background: 'rgba(255,255,255,0.03)'
                                }}>
                                    <Box sx={{
                                        width: 55,
                                        height: 55,
                                        aspectRatio: '1',
                                        background: `
                                        conic-gradient(from 90deg at 3px 3px, #0000 90deg, #fff 0),
                                        conic-gradient(from 90deg at 3px 3px, #0000 90deg, #fff 0),
                                        conic-gradient(from 90deg at 3px 3px, #0000 90deg, #fff 0),
                                        conic-gradient(from -90deg at 22px 22px, #0000 90deg, #fff 0),
                                        conic-gradient(from -90deg at 22px 22px, #0000 90deg, #fff 0),
                                        conic-gradient(from -90deg at 22px 22px, #0000 90deg, #fff 0)
                                      `,
                                        backgroundSize: '25px 25px',
                                        backgroundRepeat: 'no-repeat',
                                        animation: 'l7 1.5s infinite',
                                        mb: 3,
                                        '@keyframes l7': {
                                            '0%': { backgroundPosition: '0 0, 0 100%, 100% 100%' },
                                            '25%': { backgroundPosition: '100% 0, 0 100%, 100% 100%' },
                                            '50%': { backgroundPosition: '100% 0, 0 0, 100% 100%' },
                                            '75%': { backgroundPosition: '100% 0, 0 0, 0 100%' },
                                            '100%': { backgroundPosition: '100% 100%, 0 0, 0 100%' }
                                        }
                                    }} />
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: 'text.secondary',
                                            fontWeight: 500,
                                            textAlign: 'center',
                                            maxWidth: '70%',
                                            background: 'rgba(255,255,255,0.05)',
                                            px: 3,
                                            py: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        Analyzing your portfolio performance...
                                    </Typography>
                                </Box>
                            ) : evaluation ? (
                                <>
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                        gap: 3,
                                        p: 3,
                                        pb: 2
                                    }}>
                                        {/* Strengths */}
                                        <GlassCard sx={{
                                            background: 'rgba(76, 175, 80, 0.08)',
                                            borderLeft: `4px solid ${green[500]}`
                                        }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                    <Box sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        background: 'rgba(76, 175, 80, 0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        mr: 2
                                                    }}>
                                                        <CheckCircle sx={{ color: green[500], fontSize: '1rem' }} />
                                                    </Box>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: green[400] }}>
                                                        Strengths
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                    {evaluation.pros.map((item, index) => (
                                                        <Box key={`pro-${index}`} sx={{
                                                            p: 2,
                                                            borderRadius: 1,
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                                            transition: 'all 0.3s ease',
                                                            '&:hover': {
                                                                background: 'rgba(255, 255, 255, 0.08)',
                                                                transform: 'translateY(-2px)'
                                                            }
                                                        }}>
                                                            <Typography variant="body1">{item}</Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </CardContent>
                                        </GlassCard>

                                        {/* Considerations */}
                                        <GlassCard sx={{
                                            background: 'rgba(255, 158, 0, 0.08)',
                                            borderLeft: `4px solid ${orange[500]}`
                                        }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                    <Box sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        background: 'rgba(255, 158, 0, 0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        mr: 2,
                                                        position: 'relative'
                                                    }}>
                                                        <WarningAmber sx={{
                                                            color: orange[500],
                                                            fontSize: '1rem',
                                                            position: 'relative',
                                                            top: '-1px'
                                                        }} />
                                                    </Box>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: orange[400] }}>
                                                        Considerations
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                    {evaluation.cons.map((item, index) => (
                                                        <Box key={`con-${index}`} sx={{
                                                            p: 2,
                                                            borderRadius: 1,
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                            border: '1px solid rgba(255, 255, 255, 0.05)',
                                                            transition: 'all 0.3s ease',
                                                            '&:hover': {
                                                                background: 'rgba(255, 255, 255, 0.08)',
                                                                transform: 'translateY(-2px)'
                                                            }
                                                        }}>
                                                            <Typography variant="body1">{item}</Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </CardContent>
                                        </GlassCard>
                                    </Box>

                                    {/* Recommendations */}
                                    <GlassCard sx={{
                                        mx: 3,
                                        mb: 3,
                                        background: 'rgba(0, 180, 216, 0.08)',
                                        borderLeft: `4px solid ${blue[500]}`
                                    }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <Box sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    background: 'rgba(0, 180, 216, 0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    mr: 2
                                                }}>
                                                    <ArrowForward sx={{
                                                        color: blue[500],
                                                        fontSize: '1rem',
                                                        transform: 'rotate(-90deg)'
                                                    }} />
                                                </Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: blue[400] }}>
                                                    Recommendations
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                {evaluation.recommendations.map((item, index) => (
                                                    <Box key={`rec-${index}`} sx={{
                                                        p: 2,
                                                        borderRadius: 1,
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            background: 'rgba(255, 255, 255, 0.08)',
                                                            transform: 'translateY(-2px)'
                                                        }
                                                    }}>
                                                        <Typography variant="body1">{item}</Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </CardContent>
                                    </GlassCard>
                                </>
                            ) : (
                                <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                                    <Typography>No analysis available</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Sell Dialog */}
                    {/* Sell Dialog */}
                    <Dialog
                        open={sellDialogOpen}
                        onClose={() => setSellDialogOpen(false)}
                        PaperProps={{
                            sx: {
                                background: 'linear-gradient(to bottom, #1e1e28, #121218)',
                                borderRadius: 1,
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                width: '100%',
                                maxWidth: '600px', // Increased width
                                overflow: 'hidden' // Prevent scrollbar
                            }
                        }}
                    >
                        <DialogTitle sx={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            background: `linear-gradient(90deg, ${red[500]}, ${orange[500]})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            py: 2,
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        }}>
                            Sell Holding
                        </DialogTitle>

                        <DialogContent sx={{ py: 2, px: 3, mt: 2 }}>
                            {selectedHolding && (
                                <>
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                                        {selectedHolding.name} ({selectedHolding.symbol})
                                    </Typography>

                                    {/* First row - Current Price and Available Quantity */}
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        mb: 3,
                                        gap: 2
                                    }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                Current Price
                                            </Typography>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                {formatCurrency(currentPrices[selectedHolding.symbol] || selectedHolding.avgBuyPrice)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                Available Quantity
                                            </Typography>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                {selectedHolding.quantity} shares
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Quantity Input */}
                                    <TextField
                                        label="Quantity to Sell"
                                        type="number"
                                        value={sellQuantity}
                                        onChange={(e) => {
                                            const value = Math.max(1, parseInt(e.target.value) || 1);
                                            setSellQuantity(Math.min(value, selectedHolding.quantity));
                                        }}
                                        fullWidth
                                        sx={{ mb: 3 }}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">shares</InputAdornment>
                                            ),
                                            inputProps: {
                                                min: 1,
                                                max: selectedHolding.quantity
                                            }
                                        }}
                                    />

                                    {/* Profit/Loss and Estimated Proceeds */}
                                    {currentPrices[selectedHolding.symbol] && (
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            mb: 2,
                                            justifyContent: 'space-between'
                                        }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Profit/Loss on Sale
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                {currentPrices[selectedHolding.symbol] > selectedHolding.avgBuyPrice ? (
                                                    <ArrowDropUp sx={{ color: green[500] }} />
                                                ) : (
                                                    <ArrowDropDown sx={{ color: red[500] }} />
                                                )}
                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: currentPrices[selectedHolding.symbol] > selectedHolding.avgBuyPrice
                                                            ? green[500]
                                                            : red[500]
                                                    }}
                                                >
                                                    {formatCurrency(
                                                        (currentPrices[selectedHolding.symbol] - selectedHolding.avgBuyPrice) * sellQuantity
                                                    )}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Estimated Proceeds */}
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 1
                                    }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Estimated Proceeds
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            {formatCurrency(
                                                (currentPrices[selectedHolding.symbol] || selectedHolding.avgBuyPrice) * sellQuantity
                                            )}
                                        </Typography>
                                    </Box>
                                </>
                            )}
                        </DialogContent>

                        <DialogActions sx={{
                            px: 3,
                            py: 2,
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <Button
                                onClick={() => setSellDialogOpen(false)}
                                variant="outlined"
                                sx={{
                                    px: 3,
                                    py: 1,
                                    borderRadius: 2,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    color: 'text.primary',
                                    '&:hover': {
                                        borderColor: red[500],
                                        color: red[500],
                                        backgroundColor: 'rgba(244, 67, 54, 0.08)'
                                    }
                                }}
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={handleSell}
                                disabled={!selectedHolding || selling}
                                variant="contained"
                                sx={{
                                    px: 3,
                                    py: 1,
                                    borderRadius: 2,
                                    color: 'white',
                                    background: `linear-gradient(45deg, ${red[500]}, ${orange[500]})`,
                                    boxShadow: `0 2px 10px ${red[500]}30`,
                                    '&:hover': {
                                        background: `linear-gradient(45deg, ${red[600]}, ${orange[600]})`,
                                        boxShadow: `0 4px 15px ${red[500]}50`
                                    },
                                    '&:disabled': {
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'rgba(255,255,255,0.3)'
                                    }
                                }}
                            >
                                {selling ? (
                                    <>
                                        <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                                        Selling...
                                    </>
                                ) : (
                                    'Confirm Sale'
                                )}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Container>
            </ThemeProvider>
        </>
    );
};

export default FundDetails;
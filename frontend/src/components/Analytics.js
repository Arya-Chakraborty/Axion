import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis, Legend,
    BarChart, Bar, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import {
    Box, Button, Container, Typography, Card, CardContent,
    Chip, ThemeProvider, Avatar, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
    Paper, LinearProgress, createTheme,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, InputAdornment, MenuItem, Select,
    FormControl, InputLabel, Divider, Tabs, Tab,
    Grid, Tooltip as MuiTooltip
} from '@mui/material';
import {
    ArrowDropUp, ArrowDropDown, ArrowBack, ShowChart,
    Timeline, CompareArrows, Assessment, PieChart as PieChartIcon,
    TableChart, BarChart as BarChartIcon, Refresh, Info
} from '@mui/icons-material';
import { green, red, orange, deepPurple, blue, grey } from '@mui/material/colors';
import axios from 'axios';
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import Navbar from "./Navbar";
import { styled } from '@mui/material/styles';

// Theme configuration
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#7b2cbf' },
        secondary: { main: '#ff9e00' },
        background: {
            default: '#0f0f13',
            paper: 'rgba(30, 30, 40, 0.8)',
        },
    },
    typography: {
        fontFamily: '"Poppins", "Inter", sans-serif',
        h1: { fontWeight: 800, letterSpacing: '-0.05em' },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 600 }
    },
    shape: { borderRadius: 16 },
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

const getDynamicFontSize = (value) => {
    const str = value.toString();
    if (str.length <= 8) return 'h4';  // Normal size for numbers like "₹1,234.56"
    if (str.length <= 12) return 'h5'; // Slightly smaller for longer numbers
    return 'h6';                       // Smallest size for very large numbers
};

const GlassCard = styled(Card)(({ theme }) => ({
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4)' },
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(16px)',
    background: 'rgba(40, 40, 50, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)'
}));

const COLORS = [
    '#7b2cbf', '#ff9e00', '#00b4d8', '#00c853', '#ff3d00',
    '#6200ea', '#009688', '#ffab00', '#c51162', '#2962ff'
];

const timeRanges = [
    { value: '1m', label: '1 Month' },
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: '1y', label: '1 Year' },
    { value: '3y', label: '3 Years' },
    { value: '5y', label: '5 Years' },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <Card sx={{
                background: 'rgba(30, 30, 40, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px'
            }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{label}</Typography>
                {payload.map((item, index) => (
                    <Box key={index} sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        mb: index === payload.length - 1 ? 0 : 0.5
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{
                                width: 10,
                                height: 10,
                                bgcolor: item.color,
                                borderRadius: '50%',
                                mr: 1
                            }} />
                            <Typography variant="body2">{item.name}:</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(item.value)}
                        </Typography>
                    </Box>
                ))}
            </Card>
        );
    }
    return null;
};

const comparisonMetrics = [
    { value: '^GSPC', label: 'S&P 500' },
    { value: '^IXIC', label: 'NASDAQ' },
    { value: '^NSEI', label: 'NIFTY 50' },
    { value: '^BSESN', label: 'SENSEX' },
    { value: '^DJI', label: 'Dow Jones' },
];

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value || 0);
};

const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
};

const PortfolioAnalytics = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [portfolios, setPortfolios] = useState([]);
    const [selectedPortfolio, setSelectedPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('1m');
    const [historicalData, setHistoricalData] = useState({});
    const [portfolioSummary, setPortfolioSummary] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [currentPrices, setCurrentPrices] = useState({});
    const [priceLoading, setPriceLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [comparisonMetric, setComparisonMetric] = useState('^GSPC');
    const [comparisonData, setComparisonData] = useState([]);
    const [comparisonLoading, setComparisonLoading] = useState(false);
    const [riskMetrics, setRiskMetrics] = useState({
        beta: null,
        standardDeviation: null,
        sharpeRatio: null,
        valueAtRisk: null,
        maxDrawdown: null
    });
    const [riskLoading, setRiskLoading] = useState(false);
    const [riskCharts, setRiskCharts] = useState({
        rollingVolatility: [],
        drawdownChart: [],
        returnDistribution: [],
        riskReturnPlot: []
    });

    useEffect(() => {
        if (user) {
            fetchPortfolios();
        }
    }, [user]);

    useEffect(() => {
        if (selectedPortfolio) {
            const fetchData = async () => {
                try {
                    setInitialLoad(true);
                    await fetchCurrentPrices();
                    await fetchPortfolioSummary();
                    await fetchHistoricalData();
                    if (tabValue === 3) { // Only fetch comparison data if on comparison tab
                        await fetchComparisonData();
                    }
                    if (tabValue === 4) {
                        await fetchRiskMetrics();
                    }
                } finally {
                    setInitialLoad(false);
                }
            };
            fetchData();
        }
    }, [selectedPortfolio, timeRange]);

    useEffect(() => {
        if (tabValue === 3 && selectedPortfolio) {
            fetchComparisonData();
        }
    }, [comparisonMetric]);

    // Add this handler for tab changes to fetch comparison data when needed
    const handleTabChange = (e, newValue) => {
        setTabValue(newValue);
        if (newValue === 3 && selectedPortfolio) {
            fetchComparisonData();
        }
        if (newValue === 4 && selectedPortfolio) {
            fetchRiskMetrics();
        }
    };

    const fetchRiskMetrics = async () => {
        if (!selectedPortfolio) return;

        try {
            setRiskLoading(true);
            const response = await axios.post('/api/v1/portfolios/riskMetrics', {
                portfolioId: selectedPortfolio._id,
                range: timeRange
            });

            if (response.data.success) {
                setRiskMetrics(response.data.data.metrics);
                setRiskCharts(response.data.data.charts);
            }
        } catch (err) {
            console.error('Error fetching risk metrics:', err);
        } finally {
            setRiskLoading(false);
        }
    };

    const fetchComparisonData = async () => {
        if (!selectedPortfolio) return;

        try {
            setComparisonLoading(true);
            const response = await axios.post('/api/v1/portfolios/comparison', {
                portfolioId: selectedPortfolio._id,
                range: timeRange,
                comparisonMetric
            });

            if (response.data.success) {
                setComparisonData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching comparison data:', err);
        } finally {
            setComparisonLoading(false);
        }
    };



    const fetchCurrentPrices = async () => {
        if (!selectedPortfolio?.holdings?.length) return;

        try {
            setPriceLoading(true);
            const symbols = selectedPortfolio.holdings.map(h => h.symbol);
            const pricePromises = symbols.map(symbol =>
                axios.get(`/api/v1/getFundPrice/${symbol}`) // Changed endpoint to match portfolio page
            );

            const responses = await Promise.all(pricePromises);
            const prices = {};

            responses.forEach((response, index) => {
                if (response.data?.currentPrice) {
                    prices[symbols[index]] = response.data.currentPrice;
                } else if (response.data?.data?.currentPrice) { // Handle different response structure
                    prices[symbols[index]] = response.data.data.currentPrice;
                }
            });

            setCurrentPrices(prices);
        } catch (err) {
            console.error('Error fetching current prices:', err);
        } finally {
            setPriceLoading(false);
        }
    };

    const fetchPortfolios = async () => {
        try {
            setLoading(true);
            const response = await axios.post('/api/v1/portfolios/getByEmail', {
                email: user.emailAddresses[0].emailAddress
            });
            setPortfolios(response.data.data);
            if (response.data.data.length > 0) {
                setSelectedPortfolio(response.data.data[0]);
            }
        } catch (err) {
            console.error('Error fetching portfolios:', err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllData = async () => {
        try {
            setRefreshing(true);
            await Promise.all([
                fetchHistoricalData(),
                fetchPortfolioSummary()
            ]);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setRefreshing(false);
        }
    };
    
    const fetchHistoricalData = async () => {
        try {
            const response = await axios.post('/api/v1/portfolios/getHistoricalRecords', {
                portfolioId: selectedPortfolio._id,
                range: timeRange
            });
            setHistoricalData(response.data.data);
        } catch (err) {
            console.log(selectedPortfolio._id, timeRange);
            console.error('Error fetching historical data:', err);
            setHistoricalData({});
        }
    };

    const fetchPortfolioSummary = async () => {
        if (!selectedPortfolio) return;

        try {
            const response = await axios.get(
                `/api/v1/getPortfolioById/${selectedPortfolio._id}`
            );

            if (response.data.success) {
                // Get fresh current prices (not from state)
                const pricesResponse = await axios.all(
                    response.data.data.holdings.map(h =>
                        axios.get(`/api/v1/getFundPrice/${h.symbol}`)
                    )
                );

                const currentPrices = {};
                pricesResponse.forEach((res, index) => {
                    const symbol = response.data.data.holdings[index].symbol;
                    currentPrices[symbol] = res.data?.currentPrice || res.data?.data?.currentPrice;
                });

                const updatedHoldings = response.data.data.holdings.map(holding => {
                    const currentPrice = currentPrices[holding.symbol] || holding.avgBuyPrice;
                    const currentValue = currentPrice * holding.quantity;
                    const costBasis = holding.totalCost || (holding.avgBuyPrice * holding.quantity);
                    const gainLoss = currentValue - costBasis;
                    const percentage = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

                    return {
                        ...holding,
                        currentPrice,
                        currentValue,
                        costBasis,
                        gainLoss,
                        percentage,
                        isPositive: gainLoss >= 0
                    };
                });

                const totalCurrentValue = updatedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
                const totalCostBasis = updatedHoldings.reduce((sum, h) => sum + h.costBasis, 0);
                const totalGainLoss = totalCurrentValue - totalCostBasis;
                const totalPercentage = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

                setPortfolioSummary({
                    ...response.data.data,
                    holdings: updatedHoldings,
                    currentValue: totalCurrentValue,
                    costBasis: totalCostBasis,
                    gainLoss: totalGainLoss,
                    percentage: totalPercentage,
                    isPositive: totalGainLoss >= 0
                });

                // Update current prices state for other components
                setCurrentPrices(currentPrices);
            }
        } catch (err) {
            console.error('Error fetching portfolio summary:', err);
        }
    };

    const handleRefresh = () => {
        fetchCurrentPrices().then(() => {
            fetchAllData();
        });
    };

    const handlePortfolioChange = (event) => {
        const portfolioId = event.target.value;
        const portfolio = portfolios.find(p => p._id === portfolioId);
        setSelectedPortfolio(portfolio);
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

    const portfolioPerformance = useMemo(() => {
        if (!portfolioSummary) return {
            currentValue: 0,
            costBasis: 0,
            gainLoss: 0,
            percentage: 0,
            isPositive: true
        };

        return {
            currentValue: portfolioSummary.currentValue,
            costBasis: portfolioSummary.costBasis,
            gainLoss: portfolioSummary.gainLoss,
            percentage: portfolioSummary.percentage,
            isPositive: portfolioSummary.isPositive
        };
    }, [portfolioSummary]);

    const allocationData = useMemo(() => {
        if (!portfolioSummary) return [];

        const holdings = portfolioSummary.holdings
            .map(holding => ({
                name: holding.symbol,
                value: holding.currentValue,
                percentage: portfolioSummary.currentValue > 0 ?
                    (holding.currentValue / portfolioSummary.currentValue) * 100 : 0,
                isOthers: false
            }))
            .sort((a, b) => b.value - a.value);

        if (holdings.length <= 10) {
            return holdings;
        }

        const topHoldings = holdings.slice(0, 9).map(h => ({ ...h }));
        const otherHoldings = holdings.slice(9);

        const othersValue = otherHoldings.reduce((sum, h) => sum + h.value, 0);
        const othersPercentage = otherHoldings.reduce((sum, h) => sum + h.percentage, 0);

        return [
            ...topHoldings,
            {
                name: 'Others',
                value: othersValue,
                percentage: othersPercentage,
                isOthers: true,
                othersCount: otherHoldings.length
            }
        ];
    }, [portfolioSummary]);

    const topPerformers = useMemo(() => {
        if (!portfolioSummary?.holdings) return [];

        return portfolioSummary.holdings
            .map(holding => ({
                symbol: holding.symbol,
                percentage: holding.percentage,
                gainLoss: holding.gainLoss,
                isPositive: holding.isPositive
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 5);
    }, [portfolioSummary]);

    const chartData = useMemo(() => {
        if (!historicalData || !selectedPortfolio) return [];

        const allDates = new Set();
        selectedPortfolio.holdings.forEach(holding => {
            if (historicalData[holding.symbol]) {
                Object.keys(historicalData[holding.symbol]).forEach(date => {
                    allDates.add(date);
                });
            }
        });

        const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

        return sortedDates.map(date => {
            const dataPoint = { date };

            selectedPortfolio.holdings.forEach(holding => {
                if (historicalData[holding.symbol] && historicalData[holding.symbol][date]) {
                    dataPoint[holding.symbol] = historicalData[holding.symbol][date];
                }
            });

            if (historicalData.PORTFOLIO_TOTAL && historicalData.PORTFOLIO_TOTAL[date]) {
                dataPoint['PORTFOLIO_TOTAL'] = historicalData.PORTFOLIO_TOTAL[date];
            }

            return dataPoint;
        });
    }, [historicalData, selectedPortfolio]);

    return (
        <>
            <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: -1,
                background: 'rgba(7, 7, 7, 0.9)'
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

                    {(loading || refreshing || priceLoading) && (
                        <Box sx={{ width: '100%', mt: 4 }}>
                            <LinearProgress color="secondary" />
                        </Box>
                    )}

                    {selectedPortfolio && (
                        <>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 4,
                                flexDirection: { xs: 'column', sm: 'row' },
                                gap: 2
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar
                                        sx={{
                                            width: 64,
                                            height: 64,
                                            fontSize: 24,
                                            fontWeight: 'bold',
                                            background: `linear-gradient(135deg, ${deepPurple[500]}, ${orange[500]})`
                                        }}
                                    >
                                        {selectedPortfolio.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box>
                                        <Typography
                                            variant="h1"
                                            sx={{
                                                fontSize: { xs: '2rem', md: '2.5rem' },
                                                fontWeight: 700,
                                                letterSpacing: '-0.03em',
                                                background: `linear-gradient(90deg, ${deepPurple[400]}, ${orange[500]})`,
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                            }}
                                        >
                                            {selectedPortfolio.name}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary">
                                            Created on {new Date(selectedPortfolio.createdAt).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' }, mt: { xs: 2, sm: 0 } }}>
                                    <FormControl fullWidth sx={{ minWidth: 200 }}>
                                        <InputLabel id="portfolio-select-label">Portfolio</InputLabel>
                                        <Select
                                            labelId="portfolio-select-label"
                                            value={selectedPortfolio._id}
                                            onChange={handlePortfolioChange}
                                            label="Portfolio"
                                            sx={{
                                                '& .MuiSelect-select': {
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }
                                            }}
                                        >
                                            {portfolios.map((portfolio) => (
                                                <MenuItem key={portfolio._id} value={portfolio._id}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Avatar
                                                            sx={{
                                                                width: 24,
                                                                height: 24,
                                                                fontSize: 12,
                                                                mr: 1.5,
                                                                background: `linear-gradient(135deg, ${deepPurple[500]}, ${orange[500]})`
                                                            }}
                                                        >
                                                            {portfolio.name.charAt(0).toUpperCase()}
                                                        </Avatar>
                                                        {portfolio.name}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth sx={{ minWidth: 120 }}>
                                        <InputLabel id="time-range-label">Time Range</InputLabel>
                                        <Select
                                            labelId="time-range-label"
                                            value={timeRange}
                                            onChange={(e) => setTimeRange(e.target.value)}
                                            label="Time Range"
                                        >
                                            {timeRanges.map((range) => (
                                                <MenuItem key={range.value} value={range.value}>
                                                    {range.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <IconButton onClick={handleRefresh} sx={{ ml: 1 }}>
                                        <Refresh sx={{ color: refreshing ? orange[500] : 'text.secondary' }} />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Portfolio Summary Cards */}
                            {/* Portfolio Summary Cards */}
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <GlassCard>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ overflow: 'hidden' }}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                                                        Current Value
                                                    </Typography>
                                                    <Typography
                                                        variant={getDynamicFontSize(portfolioPerformance.currentValue)}
                                                        sx={{
                                                            fontWeight: 700,
                                                            lineHeight: 1.2,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        {formatCurrency(portfolioPerformance.currentValue)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{
                                                    bgcolor: 'rgba(123, 44, 191, 0.2)',
                                                    borderRadius: '50%',
                                                    width: 48,
                                                    height: 48,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    ml: 1
                                                }}>
                                                    <Assessment sx={{ color: deepPurple[400] }} />
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </GlassCard>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <GlassCard>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ overflow: 'hidden' }}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                                                        Total Invested
                                                    </Typography>
                                                    <Typography
                                                        variant={getDynamicFontSize(portfolioPerformance.costBasis)}
                                                        sx={{
                                                            fontWeight: 700,
                                                            lineHeight: 1.2,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        {formatCurrency(portfolioPerformance.costBasis)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{
                                                    bgcolor: 'rgba(0, 180, 216, 0.2)',
                                                    borderRadius: '50%',
                                                    width: 48,
                                                    height: 48,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    ml: 1
                                                }}>
                                                    <Timeline sx={{ color: blue[400] }} />
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </GlassCard>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <GlassCard>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ overflow: 'hidden' }}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                                                        Profit/Loss
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        {/* {portfolioPerformance.isPositive ? (
                                                            <ArrowDropUp sx={{
                                                                color: green[500],
                                                                fontSize: '2.5rem',
                                                                flexShrink: 0
                                                            }} />
                                                        ) : (
                                                            <ArrowDropDown sx={{
                                                                color: red[500],
                                                                fontSize: '2.5rem',
                                                                flexShrink: 0
                                                            }} />
                                                        )} */}
                                                        <Typography
                                                            variant={getDynamicFontSize(portfolioPerformance.gainLoss)}
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: portfolioPerformance.isPositive ? green[500] : red[500],
                                                                lineHeight: 1.2,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}
                                                        >
                                                            {formatCurrency(portfolioPerformance.gainLoss)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box sx={{
                                                    bgcolor: portfolioPerformance.isPositive ?
                                                        'rgba(0, 200, 83, 0.2)' : 'rgba(255, 61, 0, 0.2)',
                                                    borderRadius: '50%',
                                                    width: 48,
                                                    height: 48,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    ml: 1
                                                }}>
                                                    {portfolioPerformance.isPositive ? (
                                                        <ArrowDropUp sx={{ color: green[500] }} />
                                                    ) : (
                                                        <ArrowDropDown sx={{ color: red[500] }} />
                                                    )}
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </GlassCard>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <GlassCard>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ overflow: 'hidden' }}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
                                                        Return
                                                    </Typography>
                                                    <Typography
                                                        variant={getDynamicFontSize(portfolioPerformance.percentage)}
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: portfolioPerformance.isPositive ? green[500] : red[500],
                                                            lineHeight: 1.2,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        {formatPercentage(portfolioPerformance.percentage)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{
                                                    bgcolor: 'rgba(255, 158, 0, 0.2)',
                                                    borderRadius: '50%',
                                                    width: 48,
                                                    height: 48,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    ml: 1
                                                }}>
                                                    <CompareArrows sx={{ color: orange[400] }} />
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </GlassCard>
                                </Grid>
                            </Grid>

                            {/* Main Content */}
                            <Card sx={{ mb: 4 }}>
                                <CardContent>
                                    <Tabs
                                        value={tabValue}
                                        onChange={handleTabChange}
                                        variant="scrollable"
                                        scrollButtons="auto"
                                        sx={{
                                            mb: 3,
                                            '& .MuiTabs-indicator': {
                                                backgroundColor: 'primary.main',
                                                height: 3
                                            }
                                        }}
                                    >
                                        <Tab label="Performance" icon={<Timeline />} iconPosition="start" />
                                        <Tab label="Allocation" icon={<PieChartIcon />} iconPosition="start" />
                                        <Tab label="Holdings" icon={<TableChart />} iconPosition="start" />
                                        <Tab label="Comparison" icon={<CompareArrows />} iconPosition="start" />
                                        <Tab label="Risk Analysis" icon={<Assessment />} iconPosition="start" />
                                    </Tabs>
                                    {/* Performance Tab */}
                                    {tabValue === 0 && (
                                        <Box sx={{ height: 500 }}>
                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                Portfolio Performance
                                            </Typography>
                                            {chartData.length === 0 ? (
                                                <Box sx={{
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column',
                                                    gap: 2
                                                }}>
                                                    <CircularProgress />
                                                    <Typography color="text.secondary">
                                                        Loading performance data...
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <ResponsiveContainer width="100%" height="90%">
                                                    <LineChart
                                                        data={chartData}
                                                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" stroke={grey[700]} />
                                                        <XAxis
                                                            dataKey="date"
                                                            stroke={grey[400]}
                                                            tickFormatter={(date) => {
                                                                const d = new Date(date);
                                                                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                            }}
                                                        />
                                                        <YAxis stroke={grey[400]} />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Legend />
                                                        {selectedPortfolio.holdings.map((holding, index) => (
                                                            <Line
                                                                key={holding.symbol}
                                                                type="monotone"
                                                                dataKey={holding.symbol}
                                                                stroke={COLORS[index % COLORS.length]}
                                                                strokeWidth={2}
                                                                dot={false}
                                                                activeDot={{ r: 6 }}
                                                            />
                                                        ))}
                                                        <Line
                                                            type="monotone"
                                                            dataKey="PORTFOLIO_TOTAL"
                                                            stroke="#ffffff"
                                                            strokeWidth={3}
                                                            dot={false}
                                                            activeDot={{ r: 8 }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            )}
                                        </Box>
                                    )}

                                    {/* Allocation Tab */}
                                    {tabValue === 1 && (
                                        <Box>
                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                Portfolio Allocation
                                            </Typography>
                                            {allocationData.length === 0 ? (
                                                <Box sx={{
                                                    height: 400,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column',
                                                    gap: 2
                                                }}>
                                                    <CircularProgress />
                                                    <Typography color="text.secondary">
                                                        Loading allocation data...
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Grid container spacing={4}>
                                                    <Grid item xs={12} md={6}>
                                                        <Box sx={{ height: 400 }}>
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie
                                                                        data={allocationData}
                                                                        cx="50%"
                                                                        cy="50%"
                                                                        labelLine={false}
                                                                        outerRadius={150}
                                                                        fill="#8884d8"
                                                                        dataKey="value"
                                                                        nameKey="name"
                                                                        label={({ name, percentage, isOthers, othersCount }) =>
                                                                            `${name} ${isOthers ? `(${othersCount} holdings)` : ''} ${percentage.toFixed(1)}%`
                                                                        }
                                                                    >
                                                                        {allocationData.map((entry, index) => (
                                                                            <Cell
                                                                                key={`cell-${index}`}
                                                                                fill={entry.isOthers ? grey[500] : COLORS[index % COLORS.length]}
                                                                            />
                                                                        ))}
                                                                    </Pie>
                                                                    <Tooltip
                                                                        formatter={(value, name, props) => {
                                                                            if (props.payload.isOthers) {
                                                                                return [
                                                                                    formatCurrency(value),
                                                                                    `Others (${props.payload.othersCount} holdings) (${props.payload.percentage.toFixed(2)}%)`
                                                                                ];
                                                                            }
                                                                            return [
                                                                                formatCurrency(value),
                                                                                `${name} (${props.payload.percentage.toFixed(2)}%)`
                                                                            ];
                                                                        }}
                                                                    />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </Box>
                                                    </Grid>
                                                    <Grid item xs={12} md={6}>
                                                        <Box>
                                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                                Top Performers
                                                            </Typography>
                                                            <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                                                                <Table>
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell>Symbol</TableCell>
                                                                            <TableCell align="right">Return</TableCell>
                                                                            <TableCell align="right">P&L</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {topPerformers.map((holding, index) => (
                                                                            <TableRow key={index}>
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
                                                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                                            {holding.symbol}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    align="right"
                                                                                    sx={{
                                                                                        color: holding.isPositive ? green[500] : red[500],
                                                                                        fontWeight: 600
                                                                                    }}
                                                                                >
                                                                                    {formatPercentage(holding.percentage)}
                                                                                </TableCell>
                                                                                <TableCell
                                                                                    align="right"
                                                                                    sx={{
                                                                                        color: holding.isPositive ? green[500] : red[500],
                                                                                        fontWeight: 600
                                                                                    }}
                                                                                >
                                                                                    {formatCurrency(holding.gainLoss)}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </TableContainer>
                                                        </Box>
                                                    </Grid>
                                                </Grid>
                                            )}
                                        </Box>
                                    )}

                                    {/* Holdings Tab */}
                                    {tabValue === 2 && (
                                        <Box>
                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                Detailed Holdings
                                            </Typography>
                                            <TableContainer>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Symbol</TableCell>
                                                            <TableCell align="right">Quantity</TableCell>
                                                            <TableCell align="right">Avg. Buy Price</TableCell>
                                                            <TableCell align="right">Current Price</TableCell>
                                                            <TableCell align="right">Invested Amount</TableCell>
                                                            <TableCell align="right">Current Value</TableCell>
                                                            <TableCell align="right">P&L</TableCell>
                                                            <TableCell align="right">Return</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {selectedPortfolio.holdings.map((holding) => {
                                                            const perf = calculateHoldingPerformance(holding);
                                                            return (
                                                                <TableRow key={holding.symbol}>
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
                                                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                                {holding.symbol}
                                                                            </Typography>
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell align="right">{holding.quantity}</TableCell>
                                                                    <TableCell align="right">{formatCurrency(holding.avgBuyPrice)}</TableCell>
                                                                    <TableCell align="right">{formatCurrency(perf.currentPrice)}</TableCell>
                                                                    <TableCell align="right">{formatCurrency(perf.costBasis)}</TableCell>
                                                                    <TableCell align="right">{formatCurrency(perf.currentValue)}</TableCell>
                                                                    <TableCell
                                                                        align="right"
                                                                        sx={{
                                                                            color: perf.isPositive ? green[500] : red[500],
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {formatCurrency(perf.gainLoss)}
                                                                    </TableCell>
                                                                    <TableCell
                                                                        align="right"
                                                                        sx={{
                                                                            color: perf.isPositive ? green[500] : red[500],
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {formatPercentage(perf.percentage)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}

                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    )}
                                    {tabValue === 3 && (
                                        <Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    Portfolio Comparison
                                                </Typography>
                                                <FormControl sx={{ minWidth: 200 }}>
                                                    <InputLabel id="comparison-metric-label">Compare With</InputLabel>
                                                    <Select
                                                        labelId="comparison-metric-label"
                                                        value={comparisonMetric}
                                                        onChange={(e) => setComparisonMetric(e.target.value)}
                                                        label="Compare With"
                                                    >
                                                        {comparisonMetrics.map((metric) => (
                                                            <MenuItem key={metric.value} value={metric.value}>
                                                                {metric.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Box>

                                            {/* {comparisonLoading ? (
                                                <Box sx={{
                                                    height: 400,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column',
                                                    gap: 2
                                                }}>
                                                    <CircularProgress />
                                                    <Typography color="text.secondary">
                                                        Loading comparison data...
                                                    </Typography>
                                                </Box>
                                            ) : ( */}
                                            <Box sx={{ height: 500 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart
                                                        data={comparisonData}
                                                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" stroke={grey[700]} />
                                                        <XAxis
                                                            dataKey="date"
                                                            stroke={grey[400]}
                                                            tickFormatter={(date) => {
                                                                const d = new Date(date);
                                                                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                            }}
                                                        />
                                                        <YAxis stroke={grey[400]} />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Legend />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="portfolioValue"
                                                            name="Your Portfolio"
                                                            stroke="#7b2cbf"
                                                            fill="#7b2cbf"
                                                            fillOpacity={0.2}
                                                            strokeWidth={2}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="comparisonValue"
                                                            name={comparisonMetrics.find(m => m.value === comparisonMetric)?.label || 'Comparison'}
                                                            stroke="#ff9e00"
                                                            fill="#ff9e00"
                                                            fillOpacity={0.2}
                                                            strokeWidth={2}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </Box>

                                        </Box>
                                    )}
                                    {tabValue === 4 && (
                                        <Box>
                                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                                                Portfolio Risk Analysis
                                            </Typography>

                                            {riskLoading ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                                    <CircularProgress />
                                                </Box>
                                            ) : (
                                                <>


                                                    {/* Risk Metrics Cards */}
                                                    <Grid container spacing={3} sx={{ mb: 4 }}>
                                                        {/* Beta Card */}
                                                        <Grid item xs={12} sm={6} md={4}>
                                                            <GlassCard>
                                                                <CardContent>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <Box>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                Portfolio Beta
                                                                            </Typography>
                                                                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                                                                {riskMetrics.beta !== null ? riskMetrics.beta.toFixed(2) : '--'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Market correlation
                                                                            </Typography>
                                                                        </Box>
                                                                        <Box sx={{
                                                                            bgcolor: 'rgba(123, 44, 191, 0.2)',
                                                                            borderRadius: '50%',
                                                                            width: 48,
                                                                            height: 48,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}>
                                                                            <BarChartIcon sx={{ color: deepPurple[400] }} />
                                                                        </Box>
                                                                    </Box>
                                                                    <MuiTooltip title="Measures portfolio sensitivity to market movements. <1: less volatile than market, >1: more volatile">
                                                                        <Info sx={{ color: 'text.secondary', fontSize: 16, mt: 1 }} />
                                                                    </MuiTooltip>
                                                                </CardContent>
                                                            </GlassCard>
                                                        </Grid>

                                                        {/* Standard Deviation Card */}
                                                        <Grid item xs={12} sm={6} md={4}>
                                                            <GlassCard>
                                                                <CardContent>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <Box>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                Annualized Volatility
                                                                            </Typography>
                                                                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                                                                {riskMetrics.standardDeviation !== null ? `${(riskMetrics.standardDeviation * 100).toFixed(2)}%` : '--'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Risk measure
                                                                            </Typography>
                                                                        </Box>
                                                                        <Box sx={{
                                                                            bgcolor: 'rgba(255, 158, 0, 0.2)',
                                                                            borderRadius: '50%',
                                                                            width: 48,
                                                                            height: 48,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}>
                                                                            <ShowChart sx={{ color: orange[400] }} />
                                                                        </Box>
                                                                    </Box>
                                                                    <MuiTooltip title="Measures how much returns fluctuate around the average. Higher values indicate more risk">
                                                                        <Info sx={{ color: 'text.secondary', fontSize: 16, mt: 1 }} />
                                                                    </MuiTooltip>
                                                                </CardContent>
                                                            </GlassCard>
                                                        </Grid>

                                                        {/* Sharpe Ratio Card */}
                                                        <Grid item xs={12} sm={6} md={4}>
                                                            <GlassCard>
                                                                <CardContent>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <Box>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                Sharpe Ratio
                                                                            </Typography>
                                                                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                                                                {riskMetrics.sharpeRatio !== null ? riskMetrics.sharpeRatio.toFixed(2) : '--'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Risk-adjusted return
                                                                            </Typography>
                                                                        </Box>
                                                                        <Box sx={{
                                                                            bgcolor: 'rgba(0, 200, 83, 0.2)',
                                                                            borderRadius: '50%',
                                                                            width: 48,
                                                                            height: 48,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}>
                                                                            <Timeline sx={{ color: green[500] }} />
                                                                        </Box>
                                                                    </Box>
                                                                    <MuiTooltip title="Measures excess return per unit of risk. >1: good, >2: excellent">
                                                                        <Info sx={{ color: 'text.secondary', fontSize: 16, mt: 1 }} />
                                                                    </MuiTooltip>
                                                                </CardContent>
                                                            </GlassCard>
                                                        </Grid>

                                                        {/* Value at Risk Card */}
                                                        <Grid item xs={12} sm={6}>
                                                            <GlassCard>
                                                                <CardContent>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <Box>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                1-Month Value at Risk (95%)
                                                                            </Typography>
                                                                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                                                                {riskMetrics.valueAtRisk !== null ? `${(riskMetrics.valueAtRisk * 100).toFixed(2)}%` : '--'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Potential loss
                                                                            </Typography>
                                                                        </Box>
                                                                        <Box sx={{
                                                                            bgcolor: 'rgba(255, 61, 0, 0.2)',
                                                                            borderRadius: '50%',
                                                                            width: 48,
                                                                            height: 48,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}>
                                                                            <Assessment sx={{ color: red[500] }} />
                                                                        </Box>
                                                                    </Box>
                                                                    <MuiTooltip title="Worst expected loss over 1 month with 95% confidence">
                                                                        <Info sx={{ color: 'text.secondary', fontSize: 16, mt: 1 }} />
                                                                    </MuiTooltip>
                                                                </CardContent>
                                                            </GlassCard>
                                                        </Grid>

                                                        {/* Max Drawdown Card */}
                                                        <Grid item xs={12} sm={6}>
                                                            <GlassCard>
                                                                <CardContent>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <Box>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                Maximum Drawdown
                                                                            </Typography>
                                                                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                                                                {riskMetrics.maxDrawdown !== null ? `${(riskMetrics.maxDrawdown * 100).toFixed(2)}%` : '--'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Worst decline
                                                                            </Typography>
                                                                        </Box>
                                                                        <Box sx={{
                                                                            bgcolor: 'rgba(0, 180, 216, 0.2)',
                                                                            borderRadius: '50%',
                                                                            width: 48,
                                                                            height: 48,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}>
                                                                            <ArrowDropDown sx={{ color: blue[500] }} />
                                                                        </Box>
                                                                    </Box>
                                                                    <MuiTooltip title="Largest peak-to-trough decline during selected period">
                                                                        <Info sx={{ color: 'text.secondary', fontSize: 16, mt: 1 }} />
                                                                    </MuiTooltip>
                                                                </CardContent>
                                                            </GlassCard>
                                                        </Grid>
                                                    </Grid>
                                                    {/* Risk Metrics Explanation - Full Width */}
                                                    <GlassCard sx={{ mb: 4 }}>
                                                        <CardContent>
                                                            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                                                Understanding Your Risk Metrics
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                                These metrics help you evaluate the risk characteristics of your portfolio.
                                                                Consider them when making investment decisions to ensure your portfolio aligns
                                                                with your risk tolerance and investment goals.
                                                            </Typography>
                                                            <Divider sx={{ my: 2 }} />
                                                            <Grid container spacing={2}>
                                                                <Grid item xs={12} sm={6} md={3}>
                                                                    <Typography variant="subtitle2">Beta</Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Measures sensitivity to market movements.
                                                                        &lt;1: less volatile than market, &gt;1: more volatile.
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={6} md={3}>
                                                                    <Typography variant="subtitle2">Standard Deviation</Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Measures return volatility. Higher values mean more price fluctuation.
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={6} md={3}>
                                                                    <Typography variant="subtitle2">Sharpe Ratio</Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Measures risk-adjusted return. Higher is better (aim for &gt;1).
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={6} md={3}>
                                                                    <Typography variant="subtitle2">Value at Risk</Typography>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Estimates potential losses. The lower the better for risk-averse investors.
                                                                    </Typography>
                                                                </Grid>
                                                            </Grid>
                                                        </CardContent>
                                                    </GlassCard>

                                                    {/* Risk Visualizations */}
                                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                        Risk Visualizations
                                                    </Typography>

                                                    {/* Rolling Volatility and Drawdown Charts */}
                                                    <Grid container spacing={3} sx={{ mb: 3 }}>
                                                        <Grid item xs={12} md={6}>
                                                            <GlassCard>
                                                                <CardContent>
                                                                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                                                                        30-Day Rolling Volatility {"(Choose 3 months or more)"}
                                                                    </Typography>
                                                                    <Box sx={{ height: 300 }}>
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <LineChart data={riskCharts.rollingVolatility}>
                                                                                <CartesianGrid strokeDasharray="3 3" stroke={grey[700]} />
                                                                                <XAxis
                                                                                    dataKey="date"
                                                                                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                                                                                />
                                                                                <YAxis
                                                                                    label={{ value: 'Volatility', angle: -90, position: 'insideLeft' }}
                                                                                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                                                                />
                                                                                <Tooltip
                                                                                    formatter={(value) => [`${(value * 100).toFixed(2)}%`, 'Volatility']}
                                                                                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                                                                />
                                                                                <Line
                                                                                    type="monotone"
                                                                                    dataKey="volatility"
                                                                                    stroke="#ff9e00"
                                                                                    strokeWidth={2}
                                                                                    dot={false}
                                                                                    name="Volatility"
                                                                                />
                                                                            </LineChart>
                                                                        </ResponsiveContainer>
                                                                    </Box>
                                                                </CardContent>
                                                            </GlassCard>
                                                        </Grid>
                                                        <Grid item xs={12} md={6}>
                                                            <GlassCard>
                                                                <CardContent>
                                                                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                                                                        Drawdown Analysis
                                                                    </Typography>
                                                                    <Box sx={{ height: 300 }}>
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <AreaChart data={riskCharts.drawdownChart}>
                                                                                <CartesianGrid strokeDasharray="3 3" stroke={grey[700]} />
                                                                                <XAxis
                                                                                    dataKey="date"
                                                                                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                                                                                />
                                                                                <YAxis
                                                                                    label={{ value: 'Drawdown', angle: -90, position: 'insideLeft' }}
                                                                                    tickFormatter={(value) => `${value}%`}
                                                                                />
                                                                                <Tooltip
                                                                                    formatter={(value) => [`${value}%`, 'Drawdown']}
                                                                                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                                                                />
                                                                                <Area
                                                                                    type="monotone"
                                                                                    dataKey="drawdown"
                                                                                    stroke="#c51162"
                                                                                    fill="#c51162"
                                                                                    fillOpacity={0.2}
                                                                                    name="Drawdown"
                                                                                />
                                                                            </AreaChart>
                                                                        </ResponsiveContainer>
                                                                    </Box>
                                                                </CardContent>
                                                            </GlassCard>
                                                        </Grid>
                                                    </Grid>

                                                    {/* Return Distribution and Risk Profile */}
                                                    <Grid container spacing={3}>
                                                        <Grid item xs={12} md={6}>
                                                            <GlassCard>
                                                                <CardContent>
                                                                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                                                                        Return Distribution
                                                                    </Typography>
                                                                    <Box sx={{ height: 250 }}>
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <BarChart data={riskCharts.returnDistribution}>
                                                                                <CartesianGrid strokeDasharray="3 3" stroke={grey[700]} />
                                                                                <XAxis dataKey="range" />
                                                                                <YAxis
                                                                                    label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
                                                                                    tickFormatter={(value) => `${value}%`}
                                                                                />
                                                                                <Tooltip
                                                                                    formatter={(value) => [`${value}% of returns`, 'Frequency']}
                                                                                    labelFormatter={(label) => `Range: ${label}`}
                                                                                />
                                                                                <Bar
                                                                                    dataKey="frequency"
                                                                                    fill="#7b2cbf"
                                                                                    name="Frequency"
                                                                                />
                                                                            </BarChart>
                                                                        </ResponsiveContainer>
                                                                    </Box>
                                                                </CardContent>
                                                            </GlassCard>
                                                        </Grid>
                                                        <Grid item xs={12} md={6}>
                                                            <GlassCard>
                                                                <CardContent>
                                                                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                                                        Understanding Your Risk Profile
                                                                    </Typography>
                                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                                        Your portfolio's risk profile helps you understand how your investments
                                                                        behave under different market conditions and whether they match your
                                                                        personal risk tolerance.
                                                                    </Typography>
                                                                    <Divider sx={{ my: 2 }} />
                                                                    <Grid container spacing={2}>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <Typography variant="subtitle2">Volatility</Typography>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                Shows how much your portfolio fluctuates. Higher volatility means
                                                                                larger price swings in both directions.
                                                                            </Typography>
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <Typography variant="subtitle2">Drawdowns</Typography>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                Measure peak-to-trough declines during market downturns.
                                                                                The speed and depth of recovery matters as much as the drawdown itself.
                                                                            </Typography>
                                                                        </Grid>
                                                                        <Grid item xs={12}>
                                                                            <Typography variant="subtitle2">Return Distribution</Typography>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                Reveals whether your portfolio has more extreme gains/losses than
                                                                                a normal distribution would predict.
                                                                            </Typography>
                                                                        </Grid>
                                                                    </Grid>
                                                                </CardContent>
                                                            </GlassCard>
                                                        </Grid>
                                                    </Grid>
                                                </>
                                            )}
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </Container>
            </ThemeProvider>
        </>
    );
};

export default PortfolioAnalytics;
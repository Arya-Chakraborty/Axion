import React, { useState, useEffect } from 'react';
import {
    Box, Button, Container, Typography, Card, CardContent,
    CircularProgress, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Chip, ThemeProvider,
    createTheme, Avatar
} from '@mui/material';
import { Add, ArrowDropUp, ArrowDropDown, Delete } from '@mui/icons-material';
import { green, red, orange, deepPurple } from '@mui/material/colors';
import axios from 'axios';
import { useUser } from "@clerk/clerk-react";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";

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

const Dashboard = () => {
    const { user } = useUser();
    const [portfolios, setPortfolios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [creatingPortfolio, setCreatingPortfolio] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [portfolioToDelete, setPortfolioToDelete] = useState(null);
    const [currentPrices, setCurrentPrices] = useState({});
    const [priceLoading, setPriceLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            fetchPortfolios();
        }
    }, [user]);

    useEffect(() => {
        if (portfolios.length > 0) {
            fetchCurrentPrices();
        }
    }, [portfolios]);

    const fetchCurrentPrices = async () => {
        try {
            setPriceLoading(true);
            const symbols = [];
            
            // Collect all unique symbols from all portfolios
            portfolios.forEach(portfolio => {
                portfolio.holdings.forEach(holding => {
                    if (!symbols.includes(holding.symbol)) {
                        symbols.push(holding.symbol);
                    }
                });
            });

            if (symbols.length === 0) return;

            // Fetch prices for all symbols
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

    const handleDeletePortfolio = (portfolio) => {
        setPortfolioToDelete(portfolio);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`/api/v1/portfolios/delete/${portfolioToDelete._id}`);
            fetchPortfolios();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setDeleteDialogOpen(false);
            setPortfolioToDelete(null);
        }
    };

    const fetchPortfolios = async () => {
        try {
            setLoading(true);
            const userEmail = user.emailAddresses[0].emailAddress;
            const response = await axios.post(
                '/api/v1/portfolios/getByEmail',
                { email: userEmail },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            setPortfolios(response.data.data);
        } catch (err) {
            console.error('Error fetching portfolios:', err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const createPortfolio = async () => {
        try {
            setCreatingPortfolio(true);
            const response = await axios.post(
                '/api/v1/portfolios/create',
                {
                    email: user.emailAddresses[0].emailAddress,
                    name: newPortfolioName
                }
            );
            setNewPortfolioName('');
            setOpenDialog(false);
            fetchPortfolios();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setCreatingPortfolio(false);
        }
    };

    const calculatePerformance = (portfolio) => {
        let currentValue = 0;
        let costBasis = portfolio.totalPortfolioCost || 0;

        portfolio.holdings.forEach(holding => {
            const currentPrice = currentPrices[holding.symbol] || holding.avgBuyPrice;
            currentValue += currentPrice * holding.quantity;
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
    };

    const handlePortfolioClick = (portfolioId) => {
        navigate(`/portfolio/${portfolioId}`);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value || 0);
    };

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
                <Container maxWidth="xl" sx={{ py: 8, minHeight: '100vh', position: 'relative' }}>
                    {/* Dashboard Header */}
                    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                            variant="h1"
                            sx={{
                                fontSize: { xs: '2.5rem', md: '3.5rem' },
                                fontWeight: 700,
                                letterSpacing: '-0.03em',
                                background: `linear-gradient(90deg, ${deepPurple[500]}, ${orange[500]})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            My Portfolios
                        </Typography>

                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setOpenDialog(true)}
                            sx={{
                                background: `linear-gradient(45deg, ${deepPurple[500]}, ${orange[500]})`,
                                '&:hover': {
                                    background: `linear-gradient(45deg, ${deepPurple[600]}, ${orange[600]})`,
                                },
                            }}
                        >
                            Add Portfolio
                        </Button>
                    </Box>

                    {/* Loading State */}
                    {(loading || priceLoading) && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {/* Portfolios Grid */}
                    {!loading && (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                                gap: 3,
                                mt: 3
                            }}
                        >
                            {portfolios.map((portfolio) => {
                                const performance = calculatePerformance(portfolio);

                                return (
                                    <Card
                                        key={portfolio._id}
                                        sx={{
                                            backdropFilter: 'blur(16px)',
                                            background: 'rgba(40, 40, 50, 0.6)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            cursor: 'pointer',
                                            transition: 'transform 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: `0 10px 20px rgba(0, 0, 0, 0.3)`
                                            }
                                        }}
                                        onClick={() => handlePortfolioClick(portfolio._id)}
                                    >
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePortfolio(portfolio);
                                            }}
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                minWidth: 0,
                                                padding: '6px',
                                                color: 'rgba(255,255,255,0.7)',
                                                '&:hover': {
                                                    color: red[500],
                                                    backgroundColor: 'rgba(255, 50, 50, 0.1)'
                                                }
                                            }}
                                        >
                                            <Delete fontSize="small" />
                                        </Button>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <Avatar
                                                    sx={{
                                                        mr: 2,
                                                        width: 48,
                                                        height: 48,
                                                        fontSize: 20,
                                                        fontWeight: 'bold',
                                                        background: `linear-gradient(135deg, ${deepPurple[500]}, ${orange[500]})`
                                                    }}
                                                >
                                                    {portfolio.name.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    {portfolio.name}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Current Value
                                                </Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                                    {formatCurrency(performance.currentValue)}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Cost Basis
                                                    </Typography>
                                                    <Typography variant="body1">
                                                        {formatCurrency(performance.costBasis)}
                                                    </Typography>
                                                </Box>

                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Gain/Loss
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                        {performance.isPositive ? (
                                                            <ArrowDropUp sx={{ color: green[500] }} />
                                                        ) : (
                                                            <ArrowDropDown sx={{ color: red[500] }} />
                                                        )}
                                                        <Typography
                                                            variant="body1"
                                                            sx={{ color: performance.isPositive ? green[500] : red[500] }}
                                                        >
                                                            {performance.percentage.toFixed(2)}%
                                                        </Typography>
                                                    </Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ color: performance.isPositive ? green[500] : red[500] }}
                                                    >
                                                        {formatCurrency(performance.gainLoss)}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Box sx={{ mt: 2 }}>
                                                <Chip
                                                    label={`${portfolio.holdings.length} holdings`}
                                                    size="small"
                                                    sx={{
                                                        background: 'rgba(255,255,255,0.1)',
                                                        color: 'text.primary'
                                                    }}
                                                />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Box>
                    )}

                    {/* Empty State */}
                    {!loading && portfolios.length === 0 && (
                        <Box sx={{
                            textAlign: 'center',
                            p: 6,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 1,
                            border: '1px dashed rgba(255,255,255,0.1)',
                            mt: 4
                        }}>
                            <Typography variant="h5" sx={{ mb: 2 }}>
                                No portfolios yet
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                Create your first portfolio to start tracking your investments
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => setOpenDialog(true)}
                                sx={{
                                    background: `linear-gradient(45deg, ${deepPurple[500]}, ${orange[500]})`,
                                    '&:hover': {
                                        background: `linear-gradient(45deg, ${deepPurple[600]}, ${orange[600]})`,
                                    },
                                }}
                            >
                                Create A Portfolio
                            </Button>
                        </Box>
                    )}
                </Container>

                {/* Create Portfolio Dialog */}
                <Dialog
                    open={openDialog}
                    onClose={() => setOpenDialog(false)}
                    PaperProps={{
                        sx: {
                            background: 'linear-gradient(to bottom, #1e1e28, #121218)',
                            borderRadius: 1,
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            width: '100%',
                            maxWidth: '450px'
                        }
                    }}
                >
                    <DialogTitle sx={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        background: `linear-gradient(90deg, ${deepPurple[500]}, ${orange[500]})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        py: 3,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        Create New Portfolio
                    </DialogTitle>

                    <DialogContent sx={{ py: 3 }}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label={
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Portfolio Name
                                </Typography>
                            }
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={newPortfolioName}
                            onChange={(e) => setNewPortfolioName(e.target.value)}
                            sx={{
                                mt: 2,
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'rgba(255,255,255,0.2)'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'rgba(255,255,255,0.3)'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: deepPurple[500],
                                        boxShadow: `0 0 0 2px ${deepPurple[500]}40`
                                    }
                                }
                            }}
                            InputProps={{
                                style: {
                                    fontSize: '1rem',
                                    color: 'white'
                                }
                            }}
                        />
                    </DialogContent>

                    <DialogActions sx={{
                        px: 3,
                        py: 2,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <Button
                            onClick={() => setOpenDialog(false)}
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
                                    backgroundColor: 'rgba(255, 50, 50, 0.1)'
                                }
                            }}
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={createPortfolio}
                            disabled={!newPortfolioName.trim() || creatingPortfolio}
                            variant="contained"
                            sx={{
                                px: 3,
                                py: 1,
                                borderRadius: 2,
                                color: 'white',
                                background: `linear-gradient(45deg, ${deepPurple[500]}, ${orange[500]})`,
                                boxShadow: `0 2px 10px ${deepPurple[500]}30`,
                                '&:hover': {
                                    background: `linear-gradient(45deg, ${deepPurple[600]}, ${orange[600]})`,
                                    boxShadow: `0 4px 15px ${deepPurple[500]}50`
                                },
                                '&:disabled': {
                                    background: 'rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.3)'
                                }
                            }}
                        >
                            {creatingPortfolio ? (
                                <>
                                    <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                                    Creating...
                                </>
                            ) : (
                                'Create Portfolio'
                            )}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    PaperProps={{
                        sx: {
                            background: 'linear-gradient(to bottom, #1e1e28, #121218)',
                            borderRadius: 1,
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            width: '100%',
                            maxWidth: '450px'
                        }
                    }}
                >
                    <DialogTitle sx={{
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        py: 2,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        Confirm Deletion
                    </DialogTitle>

                    <DialogContent sx={{ py: 2, mt:1 }}>
                        <Typography>
                            Are you sure you want to delete portfolio <strong>"{portfolioToDelete?.name}"</strong>?
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            This action cannot be undone.
                        </Typography>
                    </DialogContent>

                    <DialogActions sx={{
                        px: 3,
                        py: 2,
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <Button
                            onClick={() => setDeleteDialogOpen(false)}
                            variant="outlined"
                            sx={{
                                px: 3,
                                py: 1,
                                borderRadius: 2,
                                borderColor: 'rgba(255,255,255,0.2)',
                                color: 'text.primary',
                                '&:hover': {
                                    borderColor: deepPurple[500],
                                    color: deepPurple[500],
                                }
                            }}
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={confirmDelete}
                            variant="contained"
                            sx={{
                                px: 3,
                                py: 1,
                                borderRadius: 2,
                                color: 'white',
                                background: `linear-gradient(45deg, ${red[500]}, ${red[700]})`,
                                boxShadow: `0 2px 10px ${red[500]}30`,
                                '&:hover': {
                                    background: `linear-gradient(45deg, ${red[600]}, ${red[800]})`,
                                    boxShadow: `0 4px 15px ${red[500]}50`
                                }
                            }}
                        >
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </ThemeProvider>
        </>
    );
};

export default Dashboard;
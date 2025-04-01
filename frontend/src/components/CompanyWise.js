import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Button, Container, TextField, Typography,
  Card, CardContent, CircularProgress, Avatar,
  Chip, Skeleton,
  Tabs, Tab, Fade, ThemeProvider,
  createTheme, styled, Grow, Collapse, GlobalStyles
} from '@mui/material';
import {
  Search,
  Refresh, ArrowDropUp, ArrowDropDown,
  ShowChart, Timeline,
  AccountBalance, PieChart
} from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { deepPurple, orange, green, red } from '@mui/material/colors';
import { useUser } from "@clerk/clerk-react";
import Navbar from "./Navbar";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
// Optimized Glassmorphism theme
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

// 3D Card Effect with hover animation
const GlassCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  backdropFilter: 'blur(16px)',
  background: 'rgba(40, 40, 50, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
  cursor: 'pointer',
  transition: 'transform 0.3s, box-shadow 0.3s',
  transform: 'translateY(0)',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
    '&::before': {
      opacity: 0.4
    }
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}30, ${theme.palette.secondary.main}30)`,
    borderRadius: theme.shape.borderRadius,
    zIndex: -1,
    opacity: 0.2,
    transition: 'opacity 0.3s ease'
  }
}));
// Fixed Gradient Text Component
// const GradientText = styled(Typography)(({ theme }) => ({
//   background: `linear-gradient(90deg, ${orange[500]}, ${deepPurple[400]})`,
//   WebkitBackgroundClip: 'text',
//   WebkitTextFillColor: 'transparent',
//   display: 'inline',
//   fontWeight: 700,
//   backgroundAttachment: 'fixed',
//   padding: '0 2px' // Prevents text clipping
// }));

export default function NextGenFundExplorer() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [priceData, setPriceData] = useState({});
  const [priceLoading, setPriceLoading] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [expandedCard, setExpandedCard] = useState(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [addingToPortfolio, setAddingToPortfolio] = useState(false);
  // const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useUser(); // Clerk user
  const [userName, setUserName] = useState("Guest User");

  useEffect(() => {
    fetchData('tech');
  }, []);

  useEffect(() => {
    if (user && user.fullName) {
      setUserName(user.fullName); // Update userName when user data is available
    }
    const userData = {
      email: user?.emailAddresses,
      name: user?.fullName
    };

    fetch("/api/v1/checkUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    })
      .then(response => response.json())
      .then(data => console.log("DB updated:", data))
      .catch(error => console.error("Error:", error));
  }, [user]);

  const fetchData = async (searchQuery = query) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `/api/v1/getAllFunds/yahoo-search`,
        { params: { q: searchQuery } }
      );

      setFunds(response.data.quotes || []);

      if (response.data.quotes) {
        response.data.quotes.forEach(fund => {
          if (fund.symbol) {
            fetchPriceData(fund.symbol);
          }
        });
      }
    } catch (err) {
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPortfolios = async () => {
    try {
      const response = await axios.post(
        '/api/v1/portfolios/getByEmail',
        { email: user.emailAddresses[0].emailAddress }
      );
      setPortfolios(response.data.data);
    } catch (err) {
      console.error('Error fetching portfolios:', err);
    }
  };

  const handleAddToPortfolio = async () => {
    try {
      setAddingToPortfolio(true);

      if (!selectedFund || !selectedPortfolio) return;

      const currentPrice = priceData[selectedFund.symbol]?.currentPrice;
      if (!currentPrice) throw new Error('Could not get current price');

      const payload = {
        portfolioId: selectedPortfolio,
        symbol: selectedFund.symbol,
        name: selectedFund.longname || selectedFund.shortname || selectedFund.symbol,
        quantity: quantity,
        price: currentPrice
        // totalCost will be calculated by the backend
      };

      const response = await axios.post(
        '/api/v1/portfolios/addHolding',
        payload
      );

      setPurchaseDialogOpen(false);
      fetchUserPortfolios();
    } catch (err) {
      console.error('Error adding to portfolio:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setAddingToPortfolio(false);
    }
  };

  const fetchPriceData = async (symbol) => {
    try {
      setPriceLoading(prev => ({ ...prev, [symbol]: true }));

      const response = await axios.get(
        `/api/v1/getFundPrice/${symbol}`
      );

      setPriceData(prev => ({
        ...prev,
        [symbol]: response.data
      }));
    } catch (err) {
      console.error(`Failed to fetch price for ${symbol}:`, err);
      setPriceData(prev => ({
        ...prev,
        [symbol]: { error: 'Failed to fetch data' }
      }));
    } finally {
      setPriceLoading(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    const queries = ['tech', 'finance', 'commodities'];
    fetchData(queries[newValue] || '');
  };

  const toggleCardExpand = (symbol) => {
    setExpandedCard(expandedCard === symbol ? null : symbol);
  };

  const getTrendIcon = (change) => {
    if (!change) return <ShowChart color="disabled" />;
    return change >= 0
      ? <ArrowDropUp sx={{ color: green[400] }} />
      : <ArrowDropDown sx={{ color: red[400] }} />;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  // Generate random sparkline data
  const generateSparkline = () => {
    const points = Array.from({ length: 10 }, () => Math.floor(Math.random() * 40) + 60);
    return points.map((val, i) => `${(i * 100 / 9)}% ${100 - val}%`).join(', ');
  };

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
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        background: 'rgba(7, 7, 7, 0.9)',
        backgroundColor: '#0a0a12',
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
        <Container maxWidth="xl" sx={{
          py: 8,
          minHeight: '100vh',
          position: 'relative'
        }}>
          {/* Fixed Hero Section */}
          <Box sx={{
            mb: 4,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '3rem', md: '4.5rem' },
                mb: 2,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                background: `linear-gradient(90deg, ${deepPurple[500]}, ${orange[500]})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Xplore Market
            </Typography>

            <Typography variant="h6" sx={{
              color: 'text.secondary',
              fontWeight: 400,
              mb: 2,
            }}>
              Welcome to next-generation investment analytics, {userName}
            </Typography>

            {/* Fixed Underline Animation */}
            <Box sx={{
              width: '50%', // Restrict width
              height: 3,
              background: `linear-gradient(90deg, transparent, ${deepPurple[500]}, transparent)`,
              margin: '0 auto',
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                width: '80%', // Make sure it doesn't break layout
                height: '100%',
                background: `linear-gradient(90deg, ${orange[500]}, ${deepPurple[500]})`,
                animation: 'glow 3s infinite alternate',
                borderRadius: 2
              },
              '@keyframes glow': {
                '0%': { left: '0%' },
                '100%': { left: '50%' }
              }
            }} />
          </Box>



          {/* Search & Tabs */}
          <Box sx={{
            mb: 2,
            backdropFilter: 'blur(16px)',
            background: 'rgba(40, 40, 50, 0.6)',
            borderRadius: 1,
            p: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            zIndex: 2
          }}>
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                fetchData();
              }}
              display="flex"
              gap={2}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search funds, stocks, ETFs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                  sx: {
                    '& .MuiOutlinedInput-input': {
                      py: 1
                    }
                  }
                }}
                sx={{
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.2)'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.3)'
                    }
                  }
                }}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                size="large"
                sx={{
                  height: '56px',
                  px: 4,
                  background: `linear-gradient(45deg, ${deepPurple[500]}, ${orange[500]})`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${deepPurple[600]}, ${orange[600]})`,
                  },
                  minWidth: 120
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Analyze'}
              </Button>
            </Box>

            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTabs-indicator': {
                  background: `linear-gradient(90deg, ${orange[500]}, ${deepPurple[500]})`,
                  height: 3
                }
              }}
            >
              <Tab label="Technology" icon={<Timeline />} iconPosition="start" />
              <Tab label="Financial" icon={<AccountBalance />} iconPosition="start" />
              <Tab label="Commodities" icon={<PieChart />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* Content */}
          {error && (
            <Fade in>
              <Box sx={{
                mb: 2,
                p: 3,
                background: 'rgba(255, 50, 50, 0.1)',
                borderLeft: `4px solid ${red[500]}`,
                borderRadius: 2,
                position: 'relative',
                zIndex: 2
              }}>
                <Typography color="error" variant="h6">
                  Error: {error.message || JSON.stringify(error)}
                </Typography>
                <Button
                  onClick={() => fetchData()}
                  color="error"
                  sx={{ mt: 2 }}
                  startIcon={<Refresh />}
                  variant="outlined"
                >
                  Retry
                </Button>
              </Box>
            </Fade>
          )}

          {loading && !funds.length ? (
            <Box
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)'
              }}
              gap={3}
              position="relative"
              zIndex={2}
            >
              {[...Array(8)].map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={320}
                  sx={{
                    borderRadius: 3,
                    animationDelay: `${i * 0.1}s`,
                    background: 'rgba(255,255,255,0.1)'
                  }}
                />
              ))}
            </Box>
          ) : (
            <Box
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)'
              }}
              gap={3}
              position="relative"
              zIndex={2}
            >
              {funds.map((fund, index) => (
                <Grow in timeout={index * 100 + 300} key={fund.symbol}>
                  <GlassCard sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    '&:hover': {
                      '& .MuiCardContent-root': {
                        bgcolor: 'rgba(255,255,255,0.03)'
                      }
                    }
                  }}>
                    <CardContent sx={{
                      flexGrow: 1,
                      p: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      transition: 'background-color 0.3s ease'
                    }}>
                      {/* Header */}
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box display="flex" alignItems="center">
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
                            {fund.symbol?.substring(0, 2)}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle1"
                              component="div"
                              sx={{
                                lineHeight: '1.2',
                                fontWeight: 600,
                                wordBreak: 'break-word'
                              }}
                            >
                              {fund.longname || fund.shortname}
                            </Typography>
                            <Chip
                              label={fund.symbol}
                              size="small"
                              sx={{
                                background: 'rgba(255,255,255,0.1)',
                                color: 'text.primary',
                                fontWeight: 'bold',
                                fontSize: '0.7rem',
                                height: 20,
                                mt: 0.5
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>

                      {/* Sparkline Sculpture */}
                      <Box sx={{
                        height: 60,
                        my: 2,
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: 2,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: `linear-gradient(to right, ${deepPurple[500]}20, ${orange[500]}20)`,
                          clipPath: `polygon(${generateSparkline()})`,
                          opacity: 0.8
                        },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '1px',
                          background: 'rgba(255,255,255,0.1)'
                        }
                      }} />

                      {/* Price Data */}
                      {priceLoading[fund.symbol] ? (
                        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                          <CircularProgress size={32} />
                        </Box>
                      ) : (
                        <>
                          {priceData[fund.symbol]?.error ? (
                            <Box textAlign="center" py={2}>
                              <Typography color="error" variant="body2">
                                Data unavailable
                              </Typography>
                              <Button
                                size="small"
                                onClick={() => fetchPriceData(fund.symbol)}
                                startIcon={<Refresh />}
                                sx={{ mt: 1 }}
                                variant="outlined"
                              >
                                Retry
                              </Button>
                            </Box>
                          ) : priceData[fund.symbol] ? (
                            <>
                              <Box mb={2} display="flex" alignItems="center" justifyContent="space-between">
                                {/* Current Value Box */}
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Current Value
                                  </Typography>
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      fontWeight: 700,
                                      color: priceData[fund.symbol].change >= 0 ? green[400] : red[400]
                                    }}
                                  >
                                    {formatCurrency(priceData[fund.symbol].currentPrice)}
                                  </Typography>
                                </Box>

                                {/* Change & Trend Icon */}
                                <Box display="flex" alignItems="center">
                                  {getTrendIcon(priceData[fund.symbol].change)}
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      ml: 0.5,
                                      color: priceData[fund.symbol].change >= 0 ? green[400] : red[400]
                                    }}
                                  >
                                    {priceData[fund.symbol].change >= 0 ? '+' : ''}
                                    {priceData[fund.symbol].change?.toFixed(2) || '0.00'}%
                                  </Typography>
                                </Box>
                              </Box>

                              <Collapse in={expandedCard === fund.symbol}>
                                <Box mt={2}>
                                  <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="text.secondary">
                                      Open
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                      {formatCurrency(priceData[fund.symbol].open)}
                                    </Typography>
                                  </Box>
                                  <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="text.secondary">
                                      High
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                      {formatCurrency(priceData[fund.symbol].high)}
                                    </Typography>
                                  </Box>
                                  <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" color="text.secondary">
                                      Low
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                      {formatCurrency(priceData[fund.symbol].low)}
                                    </Typography>
                                  </Box>
                                  <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                      Prev. Close
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                      {formatCurrency(priceData[fund.symbol].previousClose)}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Collapse>

                              <Box mt={3} display="flex" gap={1}>
                                <Button
                                  fullWidth
                                  size="small"
                                  onClick={() => toggleCardExpand(fund.symbol)}
                                  endIcon={expandedCard === fund.symbol ? <ArrowDropUp /> : <ArrowDropDown />}
                                  sx={{
                                    textTransform: 'none',
                                    color: 'text.secondary',
                                    flex: 1
                                  }}
                                >
                                  {expandedCard === fund.symbol ? 'Less' : 'More'} details
                                </Button>
                                <Button
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFund(fund);
                                    setPurchaseDialogOpen(true);
                                    fetchUserPortfolios();
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    background: `linear-gradient(45deg, ${deepPurple[500]}, ${orange[500]})`,
                                    color: 'white',
                                    flex: 1,
                                    '&:hover': {
                                      background: `linear-gradient(45deg, ${deepPurple[600]}, ${orange[600]})`
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </Box>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary" textAlign="center" py={1}>
                              Price data not loaded
                            </Typography>
                          )}
                        </>
                      )}
                    </CardContent>
                  </GlassCard>
                </Grow>
              ))}
            </Box>
          )}

          {!loading && funds.length === 0 && !error && (
            <Box sx={{
              textAlign: 'center',
              p: 6,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4,
              border: '1px dashed rgba(255,255,255,0.1)',
              position: 'relative',
              zIndex: 2
            }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                No investment vehicles found
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Try searching for stocks, mutual funds, or ETFs
              </Typography>
              <Box display="flex" gap={2} justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={() => fetchData('technology')}
                  startIcon={<Timeline />}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    '&:hover': {
                      borderColor: deepPurple[500],
                      background: 'rgba(123, 44, 191, 0.1)'
                    }
                  }}
                >
                  Tech Stocks
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => fetchData('financial')}
                  startIcon={<AccountBalance />}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    '&:hover': {
                      borderColor: orange[500],
                      background: 'rgba(255, 158, 0, 0.1)'
                    }
                  }}
                >
                  Financials
                </Button>
              </Box>
            </Box>
          )}
          <Dialog
            open={purchaseDialogOpen}
            onClose={() => setPurchaseDialogOpen(false)}
            PaperProps={{
              sx: {
                background: 'linear-gradient(to bottom, #1e1e28, #121218)',
                borderRadius: 1,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                width: '100%',
                maxWidth: '600px',
                overflow: 'hidden'
              }
            }}
          >
            <DialogTitle sx={{
              fontSize: '1.25rem',
              fontWeight: 600,
              background: `linear-gradient(90deg, ${deepPurple[500]}, ${orange[500]})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              py: 1,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              Add to Portfolio
            </DialogTitle>

            <DialogContent sx={{ py: 2, mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedFund?.longname || selectedFund?.shortname} ({selectedFund?.symbol})
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Current Price
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {selectedFund && priceData[selectedFund.symbol]?.currentPrice
                    ? formatCurrency(priceData[selectedFund.symbol].currentPrice)
                    : 'Loading...'}
                </Typography>
              </Box>

              <TextField
                select
                label="Select Portfolio"
                value={selectedPortfolio}
                onChange={(e) => setSelectedPortfolio(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="">Select Portfolio</option>
                {portfolios.map((portfolio) => (
                  <option key={portfolio._id} value={portfolio._id}>
                    {portfolio.name}
                  </option>
                ))}
              </TextField>

              <TextField
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">shares</InputAdornment>
                  ),
                  inputProps: { min: 1 }
                }}
              />

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Cost
                </Typography>
                <Typography variant="h6">
                  {selectedFund && priceData[selectedFund.symbol]?.currentPrice
                    ? formatCurrency(priceData[selectedFund.symbol].currentPrice * quantity)
                    : 'Calculating...'}
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions sx={{
              px: 3,
              py: 2,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Button
                onClick={() => setPurchaseDialogOpen(false)}
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
                  }
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={handleAddToPortfolio}
                disabled={!selectedPortfolio || addingToPortfolio}
                variant="contained"
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  color: 'white',
                  background: `linear-gradient(45deg, ${green[500]}, ${green[700]})`,
                  boxShadow: `0 2px 10px ${green[500]}30`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${green[600]}, ${green[800]})`,
                    boxShadow: `0 4px 15px ${green[500]}50`
                  },
                  '&:disabled': {
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.3)'
                  }
                }}
              >
                {addingToPortfolio ? (
                  <>
                    <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                    Adding...
                  </>
                ) : (
                  'Confirm Purchase'
                )}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </ThemeProvider>
    </>
  );
}
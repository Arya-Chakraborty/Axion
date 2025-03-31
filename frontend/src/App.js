import './App.css';
import CompanyWise from './components/CompanyWise';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Login from './components/Login';
import LandingPage from './components/Landing';
import PortfolioAnalytics from './components/Analytics';
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/xplore" element={< CompanyWise />} />
          <Route path="/dashboard" element={< Dashboard />} />
          <Route path="/portfolio/:portfolioId" element={<Portfolio />}/>
          <Route path="/analytics" element={< PortfolioAnalytics />} />
        </Routes>
    </>
  );
}

export default App;

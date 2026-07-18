import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Send, Activity, Info, ListFilter } from "lucide-react";
import Predict from "./Predict";
import Dashboard from "./Dashboard";
import History from "./History";

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className="container"
  >
    {children}
  </motion.div>
);

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar navbar-expand-lg fixed-top">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <Activity size={28} className="text-primary" />
          <span className="fw-bold outfit text-white">COVID Pulse</span>
        </Link>

        <div className="ms-auto d-flex gap-4">
          <Link
            className={`nav-link d-flex align-items-center gap-2 ${location.pathname === '/predict' ? 'active' : ''}`}
            to="/predict"
          >
            <Send size={18} />
            <span>Predict</span>
          </Link>
          <Link
            className={`nav-link d-flex align-items-center gap-2 ${location.pathname === '/dashboard' ? 'active' : ''}`}
            to="/dashboard"
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link
            className={`nav-link d-flex align-items-center gap-2 ${location.pathname === '/history' ? 'active' : ''}`}
            to="/history"
          >
            <ListFilter size={18} />
            <span>History</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

function AppContent() {
  const location = useLocation();

  return (
    <>
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      <Navbar />
      <div className="page-wrapper pt-5 mt-4">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageWrapper>
                  <div className="text-center py-5">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.7 }}
                    >
                      <h1 className="display-2 fw-bold text-gradient outfit mb-4">
                        Understanding the <br />
                        <motion.span
                          animate={{
                            textShadow: ["0 0 10px var(--primary-glow)", "0 0 30px var(--primary-glow)", "0 0 10px var(--primary-glow)"],
                            scale: [1, 1.05, 1]
                          }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          style={{ color: 'var(--primary)', display: 'inline-block' }}
                        >
                          Pulse
                        </motion.span> of COVID Sentiment
                      </h1>
                      <p className="lead text-secondary mx-auto mb-5" style={{ maxWidth: '700px' }}>
                        Leveraging data science to decode public emotions.
                        Live tweet analysis and historical trends visualized for the modern researcher.
                      </p>
                      <div className="d-flex justify-content-center gap-4">
                        <Link to="/predict" className="btn btn-premium px-5 py-3 shadow-lg">
                          <Send size={20} />
                          <span>Start Predicting</span>
                        </Link>
                        <Link to="/dashboard" className="btn btn-glow-border px-5 py-3">
                          <LayoutDashboard size={20} />
                          <span>View Analytics</span>
                        </Link>
                      </div>
                    </motion.div>
                  </div>
                </PageWrapper>
              }
            />
            <Route path="/predict" element={<PageWrapper><Predict /></PageWrapper>} />
            <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
            <Route path="/history" element={<PageWrapper><History /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

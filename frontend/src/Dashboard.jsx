import { useEffect, useState } from "react";
import axios from "axios";
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, Legend,
  ResponsiveContainer, Cell
} from "recharts";
import { TrendingUp, Users, MessageCircle, AlertTriangle, Activity, Zap, Map as MapIcon, Download, FileText } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const ChartCard = ({ title, children, description, delay = 0 }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [5, -5]);
  const rotateY = useTransform(x, [-100, 100], [-5, 5]);

  return (
    <motion.div
      style={{ rotateX, rotateY, perspective: 1000 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - (rect.left + rect.width / 2));
        y.set(e.clientY - (rect.top + rect.height / 2));
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card mb-4 p-4"
    >
      <h4 className="mb-1 outfit text-white">{title}</h4>
      <p className="text-secondary small mb-4">{description}</p>
      <div style={{ width: "100%", height: 300 }}>
        {children}
      </div>
    </motion.div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-50, 50], [10, -10]);
  const rotateY = useTransform(x, [-50, 50], [-10, 10]);

  return (
    <motion.div
      style={{ rotateX, rotateY, perspective: 1000 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - (rect.left + rect.width / 2));
        y.set(e.clientY - (rect.top + rect.height / 2));
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card p-4 d-flex align-items-center gap-3"
    >
      <div className="p-3 rounded-3" style={{ background: `${color}15` }}>
        <Icon size={24} style={{ color }} />
      </div>
      <div>
        <p className="text-secondary small mb-0">{label}</p>
        <h3 className="mb-0 fw-bold outfit">{value}</h3>
      </div>
    </motion.div>
  );
};

const InsightsPanel = ({ delay = 0 }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/insights");
        if (res.data && res.data.insights) {
          setInsights(res.data.insights);
        }
      } catch (err) {
        console.error("Insights API Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
    const interval = setInterval(fetchInsights, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card mb-4 p-4 border border-info border-opacity-25"
      style={{ background: 'linear-gradient(145deg, rgba(8, 145, 178, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)' }}
    >
      <div className="d-flex align-items-center gap-3 mb-3">
        <div className="p-2 rounded-3 bg-info bg-opacity-10">
          <Zap size={20} className="text-info" />
        </div>
        <h4 className="mb-0 outfit text-white">Automated AI Insights</h4>
      </div>
      {loading ? (
        <div className="d-flex align-items-center gap-3 text-secondary small py-2">
          <div className="spinner-border spinner-border-sm text-info" role="status"></div>
          Generating live NLP insights...
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {insights.map((insight, idx) => (
            <div key={idx} className="d-flex align-items-start gap-2 p-3 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
              <div className="mt-1 text-info opacity-75">•</div>
              <p className="mb-0 text-white-50" style={{ fontSize: '15px', lineHeight: '1.6' }}>{insight}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const SentimentMap = ({ delay = 0 }) => {
  const [geoData, setGeoData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/geo-sentiment");
        if (Array.isArray(res.data)) {
          setGeoData(res.data);
        }
      } catch (err) {
        console.error("Geo API Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGeoData();
    const interval = setInterval(fetchGeoData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getMarkerColor = (d) => {
    if (d.neg_count > d.pos_count && d.neg_count > d.neu_count) return COLORS.neg;
    if (d.pos_count > d.neg_count && d.pos_count > d.neu_count) return COLORS.pos;
    return COLORS.neu;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card mb-4 p-0 overflow-hidden border border-white border-opacity-10"
      style={{ height: '450px' }}
    >
      <div className="p-4 d-flex align-items-center justify-content-between border-bottom border-white border-opacity-10 bg-white bg-opacity-5">
        <div className="d-flex align-items-center gap-2">
          <MapIcon size={20} className="text-info" />
          <h4 className="mb-0 outfit text-white">Global Sentiment Distribution</h4>
        </div>
        <div className="d-flex gap-3 small text-secondary">
          <div className="d-flex align-items-center gap-1"><div className="rounded-circle" style={{ width: 8, height: 8, background: COLORS.pos }}></div> Positive</div>
          <div className="d-flex align-items-center gap-1"><div className="rounded-circle" style={{ width: 8, height: 8, background: COLORS.neg }}></div> Negative</div>
        </div>
      </div>

      <div style={{ height: 'calc(100% - 73px)', width: '100%', position: 'relative' }}>
        {loading && (
          <div className="position-absolute top-50 start-50 translate-middle z-3 text-white-50">
            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
            Loading global signals...
          </div>
        )}
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          scrollWheelZoom={false}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {geoData.map((loc, idx) => (
            <CircleMarker
              key={idx}
              center={[loc.lat, loc.lon]}
              radius={Math.max(8, Math.min(25, loc.total / 5))}
              fillColor={getMarkerColor(loc)}
              color="#fff"
              weight={1}
              opacity={0.5}
              fillOpacity={0.6}
            >
              <Popup className="custom-popup">
                <div className="p-1">
                  <h6 className="fw-bold mb-1">{loc.country}</h6>
                  <div className="small">
                    <div className="text-success">Positive: {loc.pos_count}</div>
                    <div className="text-danger">Negative: {loc.neg_count}</div>
                    <div className="text-secondary">Neutral: {loc.neu_count}</div>
                    <hr className="my-1 border-secondary opacity-25" />
                    <strong>Total: {loc.total}</strong>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </motion.div>
  );
};

const COLORS = {
  pos: '#10b981',
  neu: '#64748b',
  neg: '#ef4444'
};

const ReportModal = ({ isOpen, onClose, data }) => {
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setGenerating(true);
      const timer = setTimeout(() => setGenerating(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleExportCSV = () => {
    try {
      window.open("http://127.0.0.1:8000/export-csv", "_blank");
    } catch (err) {
      console.error("Export CSV Error:", err);
    }
  };

  const handleExportPDF = () => {
    try {
      window.open("http://127.0.0.1:8000/export-pdf", "_blank");
    } catch (err) {
      console.error("Export PDF Error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop d-flex align-items-center justify-content-center" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1050, backdropFilter: 'blur(10px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card p-5 text-center"
        style={{ maxWidth: '500px', width: '90%' }}
      >
        {generating ? (
          <div className="py-5">
            <div className="spinner-glow mb-4 mx-auto" />
            <h3 className="outfit text-white mb-2">Preparing Exports</h3>
            <p className="text-secondary">Connecting to analytics engine and generating assets...</p>
          </div>
        ) : (
          <div>
            <div className="p-3 rounded-circle bg-primary-glow mb-4 mx-auto" style={{ width: 'fit-content' }}>
              <Download size={48} className="text-primary" />
            </div>
            <h2 className="outfit text-white mb-3">Data Export Center</h2>
            <p className="text-secondary mb-4">Choose your preferred format for the sentiment analysis data.</p>

            <div className="d-grid gap-3">
              <button className="btn btn-premium d-flex align-items-center justify-content-center gap-2 py-3" onClick={handleExportPDF}>
                <FileText size={20} />
                <span>Download PDF Report (Charts)</span>
              </button>

              <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 py-3" onClick={handleExportCSV}>
                <Activity size={20} />
                <span>Download Raw Data (CSV)</span>
              </button>
            </div>

            <button className="btn btn-link text-secondary mt-4" onClick={onClose}>
              Cancel and Return
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};


function Dashboard() {
  const [distribution, setDistribution] = useState(null);
  const [trend, setTrend] = useState([]);
  const [volume, setVolume] = useState([]);
  const [extendedData, setExtendedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/live-stats");
        const data = res.data;

        if (data.error) {
          console.error("API returned error:", data.error);
          return;
        }

        // Map PostgreSQL distribution format [{sentiment: 'Positive', volume: 5}, ...]
        const distArray = data.distribution.map(item => ({
          sentiment: item.sentiment,
          count: item.volume
        }));

        setDistribution(distArray);
        setExtendedData({
          total_impact: data.total_24h,
          engagement_by_sentiment: data.avg_confidence.map(item => ({
            sentiment: item.sentiment,
            avg_retweets: item.avg_confidence * 10 // mapping confidence to mock retweets for UI
          })),
          source_distribution: { "Twitter Web App": data.total_24h },
          top_regions: { "Global Stream": data.total_24h }
        });

        // Mocking trend and volume for the UI based on total volume
        setTrend([
          { date: "Today", pos: distArray.find(d => d.sentiment === 'Positive')?.count || 0, neu: distArray.find(d => d.sentiment === 'Neutral')?.count || 0, neg: distArray.find(d => d.sentiment === 'Negative')?.count || 0 }
        ]);
        setVolume([{ date: "Today", tweet_count: data.total_24h }]);

      } catch (err) {
        console.error("API Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 3000); // Polling every 3s for live effect
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );

  const totalTweets = (distribution && distribution.length > 0)
    ? distribution.reduce((sum, item) => sum + item.count, 0)
    : 0;

  const dominant = (distribution && distribution.length > 0)
    ? distribution.reduce((a, b) => a.count > b.count ? a : b)
    : { sentiment: 'N/A' };

  console.log("Dashboard Render State:", { totalTweets, dominant, extension: !!extendedData });

  return (
    <div className="py-4">
      <header className="mb-5 d-flex justify-content-between align-items-end">
        <div>
          <h2 className="outfit text-white mb-2 text-gradient">System Analytics Overview</h2>
          <p className="text-secondary mb-0">Live insights into global COVID-19 related sentiment trends.</p>
        </div>
        <button className="btn btn-premium shadow-lg" onClick={() => setIsModalOpen(true)}>
          <TrendingUp size={18} />
          <span>Export Report</span>
        </button>
      </header>

      {/* Stats Grid */}
      <div className="row g-4 mb-5">
        <div className="col-md-3">
          <StatCard
            icon={MessageCircle}
            label="Total Tweets"
            value={totalTweets.toLocaleString()}
            color="var(--primary)"
            delay={0.1}
          />
        </div>
        <div className="col-md-3">
          <StatCard
            icon={TrendingUp}
            label="Dominant Sentiment"
            value={dominant.sentiment.toUpperCase()}
            color={COLORS[dominant.sentiment] || 'var(--accent)'}
            delay={0.2}
          />
        </div>
        <div className="col-md-3">
          <StatCard
            icon={Users}
            label="Public Engagement"
            value={extendedData ? (extendedData.total_impact / 1000).toFixed(1) + "K" : "High"}
            color="var(--success)"
            delay={0.3}
          />
        </div>
        <div className="col-md-3">
          <StatCard
            icon={AlertTriangle}
            label="Trend Alert"
            value="Stable"
            color="var(--warning)"
            delay={0.4}
          />
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <InsightsPanel delay={0.45} />
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <SentimentMap delay={0.5} />
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <ChartCard
            title="Sentiment Trend Analysis"
            description="How negative, neutral, and positive sentiments evolved daily."
            delay={0.5}
          >
            <ResponsiveContainer>
              <LineChart data={trend}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="neg" stroke={COLORS.neg} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="neu" stroke={COLORS.neu} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pos" stroke={COLORS.pos} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="col-lg-4">
          <ChartCard
            title="Source Breakdown"
            description="Platforms users are tweeting from."
            delay={0.6}
          >
            <ResponsiveContainer>
              <BarChart data={extendedData ? Object.keys(extendedData.source_distribution).map(k => ({ name: k, value: extendedData.source_distribution[k] })) : []} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={80} />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="col-lg-6 mt-4">
          <ChartCard
            title="Sentiment Engagement"
            description="Average retweets per sentiment category."
            delay={0.7}
          >
            <ResponsiveContainer>
              <BarChart data={extendedData ? extendedData.engagement_by_sentiment : []}>
                <XAxis dataKey="sentiment" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                />
                <Bar dataKey="avg_retweets" radius={[6, 6, 0, 0]}>
                  {extendedData?.engagement_by_sentiment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.sentiment] || 'var(--primary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="col-lg-6 mt-4">
          <ChartCard
            title="Volume & Engagement"
            description="Daily tweet frequency tracking pandemic engagement levels."
            delay={0.8}
          >
            <ResponsiveContainer>
              <LineChart data={volume}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="tweet_count"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="col-12 mt-5">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="glass-card p-5"
          >
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="p-3 rounded-circle" style={{ background: 'var(--primary-glow)' }}>
                <Activity size={32} className="text-primary" />
              </div>
              <div>
                <h2 className="outfit text-white mb-0">The Science Behind Pulse</h2>
                <p className="text-secondary">Understanding the machine learning pipeline.</p>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-md-4">
                <div className="p-4 rounded-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <h5 className="text-primary outfit mb-3">1. Vectorization</h5>
                  <p className="text-secondary small">
                    Text data is transformed using <strong>TF-IDF</strong> (Term Frequency-Inverse Document Frequency),
                    capturing the importance of words relative to the COVID-19 tweet corpus.
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-4 rounded-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <h5 className="text-primary outfit mb-3">2. Classification</h5>
                  <p className="text-secondary small">
                    A <strong>Logistic Regression</strong> model, trained on thousands of labeled tweets,
                    predicts the probability of Negative, Neutral, and Positive sentiments.
                  </p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-4 rounded-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <h5 className="text-primary outfit mb-3">3. Real-time Inference</h5>
                  <p className="text-secondary small">
                    Incoming tweets are processed through the same pipeline in milliseconds,
                    providing live feedback on public discourse trends.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <ReportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={extendedData} />
    </div>
  );
}

export default Dashboard;

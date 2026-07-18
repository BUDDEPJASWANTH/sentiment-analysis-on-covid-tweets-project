import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Send, AlertCircle, CheckCircle2, HelpCircle, Activity, RefreshCcw, Smile, Frown, Meh, Zap, Heart, Ghost } from "lucide-react";

const SentimentProgress = ({ label, value, color, icon: Icon }) => (
  <div className="mb-4">
    <div className="d-flex justify-content-between align-items-center mb-2">
      <div className="d-flex align-items-center gap-2">
        <Icon size={16} style={{ color }} />
        <span className="text-secondary small fw-medium">{label}</span>
      </div>
      <span className="fw-bold fw-mono" style={{ color }}>{(value * 100).toFixed(1)}%</span>
    </div>
    <div className="progress-container" style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ height: '100%', backgroundColor: color, boxShadow: `0 0 15px ${color}60`, borderRadius: '4px' }}
      />
    </div>
  </div>
);

const EmotionBadge = ({ emotion }) => {
  const getEmotionDetails = (emo) => {
    switch (emo?.toLowerCase()) {
      case 'joy': return { icon: Heart, color: '#f472b6', label: 'Joy' };
      case 'fear': return { icon: Ghost, color: '#a78bfa', label: 'Fear' };
      case 'anger': return { icon: Zap, color: '#fb923c', label: 'Anger' };
      case 'sadness': return { icon: Frown, color: '#60a5fa', label: 'Sadness' };
      default: return { icon: Smile, color: '#94a3b8', label: 'Neutral' };
    }
  };
  const { icon: Icon, color, label } = getEmotionDetails(emotion);
  return (
    <div className="px-3 py-1 rounded-pill d-flex align-items-center gap-2"
      style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
      <Icon size={16} style={{ color }} />
      <span className="fw-bold small" style={{ color }}>{label.toUpperCase()}</span>
    </div>
  );
};

function Predict() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retraining, setRetraining] = useState(false);

  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handlePredict = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/predict", {
        text: text,
        save: true,
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    if (window.confirm("Train the model immediately using the collected user data? This takes a few seconds.")) {
      setRetraining(true);
      try {
        const res = await axios.post("http://127.0.0.1:8000/retrain");
        alert(res.data.message);
        if (res.data.status === "success" && text.trim()) {
          // Immediately predict using the newly loaded model!
          handlePredict();
        }
      } catch (err) {
        console.error(err);
        alert("Failed to trigger retraining.");
      } finally {
        setRetraining(false);
      }
    }
  };

  const getSentimentInfo = (sentiment) => {
    switch (sentiment) {
      case 'Negative': return { label: 'Negative', color: 'var(--danger)', icon: AlertCircle };
      case 'Positive': return { label: 'Positive', color: 'var(--success)', icon: CheckCircle2 };
      default: return { label: 'Neutral', color: 'var(--secondary)', icon: HelpCircle };
    }
  };

  return (
    <div className="row justify-content-center py-5">
      <div className="col-lg-8">
        <motion.div
          style={{ rotateX, rotateY, perspective: 1000 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-5"
        >
          <div className="text-center mb-5">
            <h2 className="outfit text-white mb-2">Live Sentiment Analysis</h2>
            <p className="text-secondary">Enter any COVID-related statement to detect underlying emotions.</p>
          </div>

          <div className="mb-4">
            <textarea
              className="form-control bg-transparent text-white border-0 p-4"
              rows="5"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste tweet content here..."
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                border: '1px solid var(--glass-border)',
                fontSize: '1.1rem',
                resize: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          </div>

          <div className="d-flex gap-3">
            <button
              className="btn btn-premium py-3 flex-grow-1 d-flex align-items-center justify-content-center gap-2"
              onClick={handlePredict}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                <>
                  <Send size={18} />
                  <span>Analyze Sentiment</span>
                </>
              )}
            </button>
            <button
              className="btn btn-glow-border py-3 px-4"
              onClick={() => { setText(""); setResult(null); }}
              disabled={loading || (!text && !result)}
              title="Clear all"
            >
              <Activity size={20} />
            </button>
            <button
              className="btn btn-outline-secondary py-3 px-4 d-flex align-items-center gap-2"
              onClick={handleRetrain}
              disabled={retraining}
              title="Trigger Model Retraining"
            >
              <RefreshCcw size={20} className={retraining ? "spin-animation" : ""} />
              <span className="small fw-bold">re-train-data</span>
            </button>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 pt-5 border-top"
                style={{ borderColor: 'var(--glass-border) !important' }}
              >
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <h4 className="outfit text-white mb-0">Analysis Result</h4>
                  <div className="d-flex gap-2">
                    <EmotionBadge emotion={result.emotion} />
                    <div className="px-3 py-1 rounded-pill d-flex align-items-center gap-2"
                      style={{ background: `${getSentimentInfo(result.sentiment).color}20`, border: `1px solid ${getSentimentInfo(result.sentiment).color}40` }}>
                      <div className="rounded-circle" style={{ width: 8, height: 8, background: getSentimentInfo(result.sentiment).color }} />
                      <span className="fw-bold small" style={{ color: getSentimentInfo(result.sentiment).color }}>
                        {getSentimentInfo(result.sentiment).label.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-4 rounded-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-secondary small mb-3 text-uppercase fw-bold tracking-wider">Word Importance Map</p>
                  <div className="d-flex flex-wrap gap-1">
                    {result.attentions?.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-1 rounded"
                        style={{
                          background: `rgba(8, 145, 178, ${Math.min(0.6, item.score * 5)})`,
                          color: item.score > 0.1 ? '#fff' : 'rgba(255,255,255,0.6)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {item.token}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 mb-4 rounded-3" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
                  <CheckCircle2 size={16} />
                  <span className="small">This tweet has been securely saved to <code className="text-white">user_retrain.csv</code> for future model fine-tuning!</span>
                </div>

                <div className="row">
                  <div className="col-md-12">
                    <SentimentProgress
                      label="Negative"
                      value={result.scores.Negative}
                      color="var(--danger)"
                      icon={AlertCircle}
                    />
                    <SentimentProgress
                      label="Neutral"
                      value={result.scores.Neutral}
                      color="var(--secondary)"
                      icon={HelpCircle}
                    />
                    <SentimentProgress
                      label="Positive"
                      value={result.scores.Positive}
                      color="var(--success)"
                      icon={CheckCircle2}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default Predict;

import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Clock, ShieldCheck, Activity, Search } from "lucide-react";

function History() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await axios.get("http://127.0.0.1:8000/history");
            setHistory(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching history:", error);
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item =>
        item.original_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sentiment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.source && item.source.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getSentimentStyles = (sentiment) => {
        switch (sentiment) {
            case "Positive": return { color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" };
            case "Negative": return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
            default: return { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.1)" };
        }
    };

    return (
        <div className="container-fluid min-vh-100 py-5 px-lg-5" style={{ background: '#0a0b10' }}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4 mb-5">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="outfit text-white fw-bold mb-1">Prediction Logs</h1>
                    <p className="text-secondary mb-0">Historical record of all analyzed tweets and system classifications.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="d-flex gap-3 align-items-center"
                >
                    <div className="search-bar px-3 py-2 rounded-3 d-flex align-items-center gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Search size={18} className="text-secondary" />
                        <input
                            type="text"
                            placeholder="Filter by keyword..."
                            className="bg-transparent border-0 text-white"
                            style={{ outline: 'none', width: '200px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={fetchHistory} className="btn btn-outline-secondary p-2 rounded-3 border-opacity-10 d-flex align-items-center justify-content-center" title="Refresh Logs">
                        <Activity size={20} />
                    </button>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.05)' }}
            >
                <div className="table-responsive">
                    <table className="table table-dark table-hover mb-0">
                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                                <th className="px-4 py-3 text-secondary border-0 small text-uppercase fw-bold">Timestamp</th>
                                <th className="px-4 py-3 text-secondary border-0 small text-uppercase fw-bold">Analyzed Content</th>
                                <th className="px-4 py-3 text-secondary border-0 small text-uppercase fw-bold">Classification</th>
                                <th className="px-4 py-3 text-secondary border-0 small text-uppercase fw-bold">Source</th>
                                <th className="px-4 py-3 text-secondary border-0 small text-uppercase fw-bold text-end">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredHistory.map((item, idx) => {
                                    const styles = getSentimentStyles(item.sentiment);
                                    return (
                                        <motion.tr
                                            key={item.id || idx}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: Math.min(idx * 0.02, 1) }}
                                            className="border-bottom border-secondary-subtle"
                                            style={{ borderBottomColor: 'rgba(255,255,255,0.03) !important' }}
                                        >
                                            <td className="px-4 py-4 align-middle">
                                                <div className="d-flex flex-column">
                                                    <span className="text-white small fw-bold">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-secondary x-small opacity-50">
                                                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 align-middle" style={{ maxWidth: '500px' }}>
                                                <p className="text-light mb-0 small opacity-75">{item.original_text}</p>
                                            </td>
                                            <td className="px-4 py-4 align-middle">
                                                <span className="px-3 py-1 rounded-pill x-small fw-bold" style={{ color: styles.color, background: styles.bg, border: `1px solid ${styles.color}20` }}>
                                                    {item.sentiment.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 align-middle">
                                                <span className="x-small fw-bold opacity-75" style={{ color: item.source?.includes('Manual') ? '#a78bfa' : '#38bdf8' }}>
                                                    {item.source?.includes('Manual') ? 'MANUAL' : (item.source || 'STREAM')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 align-middle text-end">
                                                <div className="d-flex align-items-center justify-content-end gap-2">
                                                    <ShieldCheck size={14} style={{ color: styles.color }} className="opacity-75" />
                                                    <span className="text-white fw-bold small">{(item.confidence_score * 100).toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                    {(filteredHistory.length === 0 && !loading) && (
                        <div className="py-5 text-center">
                            <MessageSquare size={48} className="text-secondary opacity-20 mb-3 mx-auto" />
                            <p className="text-secondary outfit">No matching records found in the history.</p>
                        </div>
                    )}
                    {loading && (
                        <div className="py-5 text-center">
                            <div className="spinner-border text-primary opacity-50 mb-3" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="text-secondary outfit">Fetching history logs...</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

export default History;

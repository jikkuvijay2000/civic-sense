import React, { useState, useEffect } from 'react';
import { FaClipboardCheck, FaExclamationCircle, FaHourglassHalf, FaRobot } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api/axios';
import { notify } from '../utils/notify';

const AuthorityDashboard = () => {
    const [statsData, setStatsData] = useState({
        total: 0,
        resolved: 0,
        pending: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/complaint/authority-stats');
                if (response.data.status === 'success') {
                    setStatsData(response.data.data);
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
                // notify("error", "Failed to fetch dashboard stats");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // Derived Stats
    const stats = [
        { title: "Total Registered", value: statsData.total, color: "primary", icon: FaExclamationCircle },
        { title: "Resolved", value: statsData.resolved, color: "success", icon: FaClipboardCheck },
        { title: "Pending", value: statsData.pending, color: "warning", icon: FaHourglassHalf },
        { title: "Avg AI Confidence", value: `${statsData.avgConfidence || 0}%`, color: "info", icon: FaRobot }
    ];

    if (loading) {
        return <div className="p-5 text-center">Loading Dashboard...</div>;
    }

    return (
        <div className="p-5">
            <div className="mb-5">
                <h2 className="fw-bold text-dark ls-tight">Authority Dashboard</h2>
                <p className="text-muted">Overview of civic issues and complaint resolution status.</p>
            </div>

            <div className="row g-4">
                {stats.map((stat, index) => (
                    <div key={index} className="col-md-3">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-surface rounded-custom-xl shadow-custom-sm p-4 border border-light h-100 position-relative overflow-hidden group hover-scale"
                        >
                            <div className="d-flex justify-content-between align-items-start position-relative z-2">
                                <div>
                                    <h6 className="text-muted text-uppercase fw-bold ls-wide mb-3" style={{ fontSize: '0.8rem' }}>{stat.title}</h6>
                                    <h2 className="fw-bold display-5 mb-0 text-dark">{stat.value.toLocaleString()}</h2>
                                </div>
                                <div className={`p-3 rounded-circle bg-${stat.color}-subtle text-${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                            </div>
                            {/* Decorative background circle */}
                            <div className={`position-absolute top-0 end-0 p-5 rounded-circle bg-${stat.color} opacity-5 translate-middle-y me-n5 mt-n3`} style={{ width: '150px', height: '150px' }}></div>
                        </motion.div>
                    </div>
                ))}
            </div>

            {/* AI Analytics Section */}
            <div className="row mt-5">
                <div className="col-lg-8 mb-4">
                    <div className="bg-surface rounded-custom-xl shadow-custom-sm p-4 border border-light h-100">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-bold text-dark ls-tight mb-0">AI Confidence Distribution</h5>
                            <span className="badge bg-primary-subtle text-primary rounded-pill px-3">Real-time</span>
                        </div>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData.confidenceDistribution || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6c757d' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6c757d' }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" fill="#4c6ef5" radius={[10, 10, 0, 0]} barSize={60} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4 mb-4">
                    <div className="bg-surface rounded-custom-xl shadow-custom-sm p-4 border border-light h-100">
                        <h5 className="fw-bold text-dark ls-tight mb-4">Category Analysis</h5>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statsData.categoryStats || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="_id"
                                    >
                                        {(statsData.categoryStats || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#339af0', '#51cf66', '#fcc419', '#ff6b6b'][index % 4]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Status Section */}
            <div className="mt-2">
                <div className="bg-surface rounded-custom-xl shadow-custom-sm p-5 border border-light text-center py-5">
                    <img src="https://illustrations.popsy.co/amber/success.svg" alt="All caught up" height="200" className="mb-4 opacity-75" />
                    <h5 className="text-muted fw-bold">System Status: Optimal</h5>
                    <p className="text-secondary max-w-sm mx-auto">AI Model v2.1 running. Average latency: 45ms. Confidence metrics are within expected range.</p>
                </div>
            </div>

        </div>
    );
};

export default AuthorityDashboard;

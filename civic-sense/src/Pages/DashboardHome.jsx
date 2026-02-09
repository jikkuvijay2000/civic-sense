import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaBell, FaUserCircle, FaHeart, FaComment, FaShare, FaHandsHelping, FaImage } from 'react-icons/fa';
import Calendar from '../components/Calendar';
import { notify } from '../utils/notify';

import api from '../api/axios';

const DashboardHome = () => {
    // State for feed
    const [feedPosts, setFeedPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);

    // Fetch posts on mount
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await api.get('/community-post');
                setFeedPosts(response.data);
            } catch (error) {
                console.error("Error fetching posts:", error);
                notify("error", "Could not load feed");
            } finally {
                setLoadingPosts(false);
            }
        };

        fetchPosts();
    }, []);

    const timeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            setUser(storedUser);
        }
    }, []);

    const handleFeatureClick = (feature) => {
        notify("info", `${feature} feature coming soon!`);
    };

    const handleLike = (postUser) => {
        notify("success", `You liked ${postUser}'s post!`);
    };

    return (
        <div className="row m-0 bg-body min-vh-100">
            {/* Center Feed */}
            <div className="col-lg-9 col-md-12 p-0 position-relative">
                {/* Top Bar - Sticky & Blurred */}
                <div className="d-flex justify-content-between align-items-center px-5 py-3 sticky-top top-0 z-2"
                    style={{ background: 'rgba(248, 250, 252, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>

                    <div>
                        <h4 className="fw-bold mb-0 text-dark ls-tight">Dashboard</h4>
                        <small className="text-muted">Welcome back, {user?.userName || 'User'}!</small>
                    </div>

                    <div className="d-flex align-items-center gap-4">
                        <div className="input-group d-none d-md-flex align-items-center bg-white rounded-pill border px-3 py-2 shadow-sm" style={{ width: '300px' }}>
                            <FaSearch className="text-muted me-2" />
                            <input type="text" className="form-control border-0 p-0 shadow-none bg-transparent" placeholder="Search issues, places..." />
                        </div>
                        <div className="position-relative cursor-pointer hover-scale p-2 bg-white rounded-circle shadow-sm">
                            <FaBell size={20} className="text-secondary" />
                            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                                <span className="visually-hidden">New alerts</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4 mx-auto" style={{ maxWidth: '900px' }}>

                    {/* Create Post Widget */}
                    <div
                        className="bg-surface rounded-custom-xl shadow-custom-sm p-4 mb-5 d-flex gap-4 align-items-center cursor-pointer hover-scale border border-light"
                        onClick={() => handleFeatureClick('Create Post')}
                    >
                        <div className="position-relative">
                            <img src={`https://ui-avatars.com/api/?name=${user?.userName || 'User'}&background=random`} className="rounded-circle shadow-sm" width="50" height="50" alt="Me" />
                            <div className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle p-1"></div>
                        </div>
                        <div className="flex-grow-1 bg-body rounded-pill px-4 py-3 text-muted shadow-inner border-0">
                            Spot a civic issue? Share it here...
                        </div>
                        <div className="text-secondary hover-text-primary transition-fast">
                            <FaImage size={24} />
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-3 mb-4">
                        <h6 className="fw-bold text-secondary text-uppercase ls-wide" style={{ fontSize: '0.8rem' }}>Community Feed</h6>
                        <div className="flex-grow-1 border-bottom"></div>
                    </div>

                    {/* Feed Posts */}
                    <div className="d-flex flex-column gap-4 pb-5">
                        {loadingPosts ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : feedPosts.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <p>No updates from authorities yet.</p>
                            </div>
                        ) : (
                            feedPosts.map((post, index) => (
                                <motion.div
                                    key={post._id || index}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-surface rounded-custom-xl shadow-custom-md overflow-hidden border border-light"
                                >
                                    <div className="p-4 d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-3">
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${post.author}&background=random&color=fff`}
                                                alt="User"
                                                className="rounded-circle shadow-sm"
                                                width="48"
                                                height="48"
                                            />
                                            <div>
                                                <h6 className="mb-0 fw-bold text-dark">{post.author} <span className="badge bg-primary-subtle text-primary border border-primary-subtle ms-2" style={{ fontSize: '0.65rem' }}>{post.role}</span></h6>
                                                <small className="text-muted d-block" style={{ fontSize: '0.85rem' }}>{timeAgo(post.createdAt)}</small>
                                            </div>
                                        </div>
                                        <span className={`badge rounded-pill px-3 py-2 fw-normal ${post.tag === 'Alert' ? 'bg-danger-subtle text-danger' : post.tag === 'Event' ? 'bg-success-subtle text-success' : 'bg-light text-secondary'}`}>
                                            {post.tag}
                                        </span>
                                    </div>

                                    <div className="px-4 pb-2 mb-3">
                                        <h5 className="fw-bold text-dark mb-2">{post.title}</h5>
                                        <p className="mb-3 text-secondary" style={{ fontSize: '1rem', lineHeight: '1.6' }}>{post.content}</p>
                                        {post.image && (
                                            <div className="rounded-custom-xl overflow-hidden mb-3 shadow-sm position-relative">
                                                <img src={post.image} alt="Post Content" className="w-100 object-fit-cover transition-fast hover-scale-img" style={{ maxHeight: '450px' }} />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Right Calendar Column - Sticky */}
            <div className="col-lg-3 d-none d-lg-block bg-body p-4 border-start vh-100 sticky-top top-0 overflow-auto z-1">
                <Calendar />

                <div className="mt-5">
                    <h6 className="fw-bold text-secondary mb-4 text-uppercase ls-wide" style={{ fontSize: '0.8rem' }}>Suggested Groups</h6>

                    <div className="bg-surface rounded-custom shadow-custom-sm p-3 mb-3 d-flex gap-3 align-items-center hover-scale border border-light cursor-pointer transition-fast">
                        <div className="rounded-circle bg-primary-light text-primary-custom p-3 d-flex align-items-center justify-content-center">
                            <FaHandsHelping size={18} />
                        </div>
                        <div>
                            <h6 className="mb-0 text-dark small fw-bold">Volunteer Corps</h6>
                            <p className="mb-0 text-muted extra-small" style={{ fontSize: '11px' }}>Join 500+ locals</p>
                        </div>
                        <button className="btn btn-sm btn-outline-primary ms-auto rounded-pill px-3" style={{ fontSize: '10px' }}>Join</button>
                    </div>

                    <div className="bg-surface rounded-custom shadow-custom-sm p-3 mb-3 d-flex gap-3 align-items-center hover-scale border border-light cursor-pointer transition-fast">
                        <div className="rounded-circle bg-success-subtle text-success p-3 d-flex align-items-center justify-content-center">
                            <FaSearch size={18} />
                        </div>
                        <div>
                            <h6 className="mb-0 text-dark small fw-bold">Safety Watch</h6>
                            <p className="mb-0 text-muted extra-small" style={{ fontSize: '11px' }}>Nighborhood patrol</p>
                        </div>
                        <button className="btn btn-sm btn-outline-success ms-auto rounded-pill px-3" style={{ fontSize: '10px' }}>Join</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;

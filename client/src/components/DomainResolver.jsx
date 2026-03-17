// src/components/DomainResolver.jsx
// When a salon owner points royalsalon.com to our Vercel app,
// this component detects the custom domain and redirects to /book/:slug
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const KNOWN_DOMAINS = [
  'salon-saas-one.vercel.app',
  'salon-saas-git-main-spartan2.vercel.app',
  'localhost',
  '127.0.0.1',
];

const isOwnDomain = (hostname) => {
  return KNOWN_DOMAINS.some(d => hostname.includes(d));
};

export default function DomainResolver({ children }) {
  const navigate = useNavigate();
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;

    // If on our own domain, no resolution needed
    if (isOwnDomain(hostname)) {
      setResolved(true);
      return;
    }

    // Custom domain detected — look up which salon owns it
    const resolve = async () => {
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/public/resolve-domain`,
          { params: { domain: hostname } }
        );
        if (data.slug) {
          navigate(`/book/${data.slug}`, { replace: true });
        } else {
          setResolved(true);
        }
      } catch {
        setResolved(true);
      }
    };

    resolve();
  }, []);

  if (!resolved && !isOwnDomain(window.location.hostname)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FDFAF5',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid #B8860B',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 14px',
          }} />
          <div style={{ color: '#9C8660', fontSize: 13 }}>Loading...</div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return children;
}
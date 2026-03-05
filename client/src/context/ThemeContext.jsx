import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/services/api';

const ThemeContext = createContext(null);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState({
    primaryColor: '#C9A96E',
    accentColor: '#2C2C2C',
    backgroundColor: '#FAF7F2',
    salonName: 'Glamour Salon',
    tagline: 'Premium Salon Experience',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const { data } = await api.get('/settings');
        const s = data.settings;
        const newTheme = {
          primaryColor: s.theme?.primaryColor || '#C9A96E',
          accentColor: s.theme?.accentColor || '#2C2C2C',
          backgroundColor: s.theme?.backgroundColor || '#FAF7F2',
          salonName: s.salonName || 'Glamour Salon',
          tagline: s.tagline || 'Premium Salon Experience',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || {},
        };
        setTheme(newTheme);
        applyTheme(newTheme);
      } catch (err) {
        console.error('Failed to load theme');
      } finally {
        setLoading(false);
      }
    };
    fetchTheme();
  }, []);

  const applyTheme = (t) => {
    const root = document.documentElement;
    root.style.setProperty('--color-gold', t.primaryColor);
    root.style.setProperty('--color-charcoal', t.accentColor);
    root.style.setProperty('--color-cream', t.backgroundColor);

    // Generate lighter/darker variants
    root.style.setProperty('--color-gold-light', lightenColor(t.primaryColor, 20));
    root.style.setProperty('--color-gold-dark', darkenColor(t.primaryColor, 20));
  };

  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    try {
      await api.put('/settings', { theme: newTheme });
    } catch (err) {
      console.error('Failed to save theme');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Helper: Lighten hex color
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

export default ThemeContext;
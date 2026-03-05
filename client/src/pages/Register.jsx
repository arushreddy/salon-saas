import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      await register(form.name, form.email, form.phone, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-cream">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-40 w-80 h-80 rounded-full bg-gold/5 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-rose-light/8 blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-2xl font-bold text-charcoal">
            Glamour<span className="text-gold">.</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold mt-6 mb-2">Create Account</h1>
          <p className="text-charcoal-muted text-sm">Join the premium salon experience</p>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-card">
          {error && (
            <motion.div
              className="mb-6 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/80 text-charcoal placeholder-charcoal-muted/50 text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/80 text-charcoal placeholder-charcoal-muted/50 text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Phone Number <span className="text-charcoal-muted font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/80 text-charcoal placeholder-charcoal-muted/50 text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/80 text-charcoal placeholder-charcoal-muted/50 text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 rounded-xl border border-charcoal/10 bg-white/80 text-charcoal placeholder-charcoal-muted/50 text-sm focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/10 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full luxury-gradient text-white py-3 rounded-xl font-medium text-sm tracking-wide hover:opacity-90 transition-opacity shadow-gold flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <UserPlus size={18} />
              )}
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-charcoal-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-gold font-medium hover:text-gold-dark transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;

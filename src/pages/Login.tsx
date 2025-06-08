import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Gamepad2, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(true); // Bileşen mount durumu
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const intl = useIntl();
  
  // Bileşen unmount olduğunda state güncellemelerini önle
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError(intl.formatMessage({ id: 'error.fillAllFields', defaultMessage: 'Please fill in all fields' }));
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      await loginWithEmail(email, password);
      
      // Sadece bileşen hala mounted ise navigate et
      if (isMounted) {
        setTimeout(() => navigate('/'), 100); // Animasyonun tamamlanması için küçük gecikme
      }
    } catch (error) {
      if (isMounted) {
        setError(intl.formatMessage({ id: 'error.invalidCredentials', defaultMessage: 'Invalid email or password' }));
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };
  
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle();
      
      if (isMounted) {
        setTimeout(() => navigate('/'), 100);
      }
    } catch (error) {
      if (isMounted) {
        setError(intl.formatMessage({ id: 'error.googleSignInFailed', defaultMessage: 'Failed to sign in with Google' }));
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };
  
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <AnimatePresence>
        <motion.div 
          key="login-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`w-full max-w-md p-8 rounded-xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <div className="flex flex-col items-center mb-8">
            <Gamepad2 size={48} className="text-purple-500 mb-2" />
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
              ssocieyt
            </h1>
            <p className={`mt-2 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {intl.formatMessage({ id: 'login.title', defaultMessage: 'Sign in to connect with gamers worldwide' })}
            </p>
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="p-3 rounded-md bg-red-100 border border-red-300 text-red-800 flex items-start">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {intl.formatMessage({ id: 'login.email', defaultMessage: 'Email Address' })}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 focus:ring-purple-500 text-white' 
                      : 'bg-gray-100 border-gray-200 focus:ring-purple-500 text-gray-900'
                  }`}
                  placeholder="your.email@example.com"
                />
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">
                  {intl.formatMessage({ id: 'login.password', defaultMessage: 'Password' })}
                </label>
                <Link 
                  to="/reset-password"
                  className="text-xs text-purple-500 hover:text-purple-700 transition"
                >
                  {intl.formatMessage({ id: 'login.forgotPassword', defaultMessage: 'Forgot Password?' })}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 focus:ring-purple-500 text-white' 
                      : 'bg-gray-100 border-gray-200 focus:ring-purple-500 text-gray-900'
                  }`}
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 
                    <EyeOff className="w-5 h-5 text-gray-400" /> : 
                    <Eye className="w-5 h-5 text-gray-400" />
                  }
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg flex justify-center items-center ${
                loading 
                  ? 'bg-purple-400 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              } text-white font-medium transition`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} className="mr-2" />
                  {intl.formatMessage({ id: 'login.signIn', defaultMessage: 'Sign In' })}
                </>
              )}
            </button>
          </form>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} text-gray-500`}>
                {intl.formatMessage({ id: 'login.or', defaultMessage: 'Or continue with' })}
              </span>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-2.5 rounded-lg flex justify-center items-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} font-medium transition`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" className="mr-2">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"></path>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"></path>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"></path>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"></path>
              </g>
            </svg>
            {intl.formatMessage({ id: 'login.googleSignIn', defaultMessage: 'Sign in with Google' })}
          </button>
          
          <p className="mt-6 text-center text-sm">
            {intl.formatMessage({ id: 'login.noAccount', defaultMessage: "Don't have an account?" })}{' '}
            <Link to="/register" className="text-purple-500 hover:text-purple-700 font-medium">
              {intl.formatMessage({ id: 'login.register', defaultMessage: 'Register' })}
            </Link>
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Global Loading Indicator */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
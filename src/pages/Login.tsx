import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import authService from '../services/auth.service';
import './Login.css';

interface FormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  submit?: string;
}

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!isForgotPassword && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isForgotPassword && !validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isForgotPassword) {
        const data = await authService.forgotPassword({ email: formData.email });
        setMessage(data.message || 'OTP sent to your email. Please check your inbox.');
      } else {
        const data = await authService.login({
          email: formData.email,
          password: formData.password,
          remember_me: formData.rememberMe
        });
        
        authService.saveToken(data.access_token);
        authService.saveUser(data.user);
        navigate('/dashboard');
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
    if (errors[name as keyof FormErrors]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="brand-container">
          <div className="brand">
            <h1>docucr</h1>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrapper">
          <h2>
            {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="subtitle">
            {isForgotPassword
              ? 'Enter your email to receive reset instructions'
              : isSignUp
                ? 'Sign up to get started'
                : 'Enter your credentials to continue'}
          </p>

          <form onSubmit={handleSubmit}>
            {!isForgotPassword && isSignUp && (
              <div className="form-row">
                <div className="form-group">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                required
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            {!isForgotPassword && (
              <div className="form-group">
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'error' : ''}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>
            )}

            {errors.submit && <div className="error-message">{errors.submit}</div>}
            {message && <div className="success-message">{message}</div>}

            {!isForgotPassword && !isSignUp && (
              <div className="form-options">
                <label className="checkbox">
                  <input 
                    type="checkbox" 
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#"
                  className="forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsForgotPassword(true);
                  }}
                >
                  Forgot Password?
                </a>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Please wait...' : (isForgotPassword ? 'Send Reset Link' : 'Sign In')}
            </button>
          </form>

          {isForgotPassword && (
            <p className="toggle-text">
              Remember your password?
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsSignUp(false);
                }}
                className="toggle-btn"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

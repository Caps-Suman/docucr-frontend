import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Shield, ChevronRight } from 'lucide-react';
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
  otp?: string;
  confirmPassword?: string;
}

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [tempToken, setTempToken] = useState<string>('');
  const [formData, setFormData] = useState<FormData & { otp?: string; confirmPassword?: string }>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    rememberMe: false,
    otp: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors & { otp?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as any;
    if (state?.showRoleSelection) {
      const user = authService.getUser();
      const token = authService.getToken();
      if (user && token) {
        setUserInfo(user);
        setTempToken(token);
        fetchUserRoles(user.email);
        setShowRoleSelection(true);
      }
    }
  }, [location]);

  const fetchUserRoles = async (email: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/users/email/${email}`);
      if (!response.ok) throw new Error('Failed to fetch user roles');
      const userData = await response.json();
      setRoles(userData.roles || []);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to load roles' });
    }
  };

  const formatRoleName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

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

    if (isForgotPassword && isOtpSent) {
      if (!formData.otp) newErrors.otp = 'OTP is required';

      if (!formData.password) {
        newErrors.password = 'New Password is required';
      } else if (!validatePassword(formData.password)) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
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
        if (isOtpSent) {
          // Verify OTP and Reset Password
          const data = await authService.resetPassword({
            email: formData.email,
            otp: formData.otp || '',
            new_password: formData.password
          });
          setMessage(data.message || 'Password reset successfully');
          // Reset State after success
          setTimeout(() => {
            setIsForgotPassword(false);
            setIsOtpSent(false);
            // Clear form
            setFormData(prev => ({ ...prev, password: '', otp: '', confirmPassword: '' }));
          }, 2000);
        } else {
          // Send OTP
          const data = await authService.forgotPassword({ email: formData.email });
          setMessage(data.message || 'OTP sent to your email. Please check your inbox.');
          setIsOtpSent(true);
        }
      } else {
        const data = await authService.login({
          email: formData.email,
          password: formData.password,
          remember_me: formData.rememberMe
        });

        // Check if role selection is required
        if (data.requires_role_selection && data.roles) {
          setRoles(data.roles);
          setUserInfo(data.user);
          setTempToken(data.temp_token || '');
          setShowRoleSelection(true);
        } else {
          authService.saveToken(data.access_token!);
          if (data.refresh_token) {
            authService.saveRefreshToken(data.refresh_token);
          }
          authService.saveUser(data.user);
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async () => {
    if (!selectedRole) {
      setErrors({ submit: 'Please select a role' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const data = await authService.selectRole({
        email: userInfo?.email || formData.email,
        role_id: selectedRole,
        remember_me: formData.rememberMe
      }, tempToken);

      if (!data.access_token) {
        throw new Error('No access token received');
      }

      authService.saveToken(data.access_token);
      if (data.refresh_token) {
        authService.saveRefreshToken(data.refresh_token);
      }
      authService.saveUser(data.user);
      navigate('/dashboard');
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to select role' });
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
            <h1 className="brand-font">docucr</h1>
          </div>
        </div>
      </div>

      <div className="login-right">
        {showRoleSelection ? (
          <div className="login-form-wrapper">
            <div className="role-selection-header">
              <Shield size={40} className="role-icon" style={{ color: '#83cee4', marginBottom: '12px' }} />
              <h2>Select Your Role</h2>
              <p className="subtitle">
                Welcome, {userInfo?.first_name} {userInfo?.last_name}
              </p>
              <p className="subtitle" style={{ marginTop: '0', marginBottom: '24px' }}>
                Choose the role you want to use for this session
              </p>
            </div>

            <div className="roles-list">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`role-card ${selectedRole === role.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRole(role.id)}
                >
                  <div className="role-card-content">
                    <Shield size={16} />
                    <span className="role-name">{formatRoleName(role.name)}</span>
                  </div>
                  {selectedRole === role.id && (
                    <ChevronRight size={16} className="selected-icon" />
                  )}
                </div>
              ))}
            </div>

            {errors.submit && <div className="error-message">{errors.submit}</div>}

            <button
              className="btn-primary"
              onClick={handleRoleSelect}
              disabled={!selectedRole || loading}
            >
              {loading ? 'Please wait...' : 'Continue'}
            </button>

            <p className="toggle-text" style={{ marginTop: '16px' }}>
              <button
                className="forgot-link"
                onClick={() => {
                  setShowRoleSelection(false);
                  setSelectedRole('');
                  setRoles([]);
                  setUserInfo(null);
                }}
                disabled={loading}
              >
                Login?
              </button>
            </p>
          </div>
        ) : (
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
                  disabled={isOtpSent} // Disable email when entering OTP
                  style={isOtpSent ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              {isForgotPassword && isOtpSent && (
                <>
                  <div className="form-group">
                    <input
                      type="text"
                      name="otp"
                      placeholder="Enter OTP"
                      value={formData.otp}
                      onChange={handleChange}
                      className={errors.otp ? 'error' : ''}
                      required
                    />
                    {errors.otp && <span className="error-text">{errors.otp}</span>}
                  </div>

                  <div className="form-group">
                    <input
                      type="password"
                      name="password"
                      placeholder="New Password"
                      value={formData.password}
                      onChange={handleChange}
                      className={errors.password ? 'error' : ''}
                      required
                    />
                    {errors.password && <span className="error-text">{errors.password}</span>}
                  </div>

                  <div className="form-group">
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm New Password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={errors.confirmPassword ? 'error' : ''}
                      required
                    />
                    {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                  </div>
                </>
              )}

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
                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => setIsForgotPassword(true)}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Please wait...' : (isForgotPassword ? (isOtpSent ? 'Reset Password' : 'Send Reset Link') : 'Sign In')}
              </button>
            </form>

            {isForgotPassword && (
              <p className="toggle-text">
                Remember your password?
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsOtpSent(false);
                    setIsSignUp(false);
                    setMessage('');
                  }}
                  className="toggle-btn"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

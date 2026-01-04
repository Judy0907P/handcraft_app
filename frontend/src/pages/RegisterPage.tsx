import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateUsername = (value: string) => {
    if (value.length < 3) return false;
    if (value.length > 50) return false;
    return /^[a-zA-Z0-9_]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate username (required)
    if (!username) {
      setError('Username is required.');
      setLoading(false);
      return;
    }

    if (!validateUsername(username)) {
      setError('Username must be 3-50 characters and can only contain letters, numbers, and underscores.');
      setLoading(false);
      return;
    }

    try {
      await register(email, password, username);
      navigate('/orgs');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/craftflow_wide.png" 
              alt="CraftFlow" 
              className="h-12"
            />
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Create Account</h1>
          <p className="text-center text-gray-600 mb-8">Sign up to get started</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={50}
                pattern="[a-zA-Z0-9_]+"
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  username && !validateUsername(username) ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="johndoe"
              />
              <div className="mt-1 text-xs text-gray-500">
                <p>Username requirements:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li className={username.length >= 3 ? 'text-green-600' : 'text-red-600'}>
                    At least 3 characters
                  </li>
                  <li className={username.length <= 50 ? 'text-green-600' : 'text-red-600'}>
                    Maximum 50 characters
                  </li>
                  <li className={username.length === 0 || /^[a-zA-Z0-9_]+$/.test(username) ? 'text-green-600' : 'text-red-600'}>
                    Only letters, numbers, and underscores allowed
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={72}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <div className="mt-1 text-xs text-gray-500">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li className={password.length >= 6 ? 'text-green-600' : ''}>
                    At least 6 characters
                  </li>
                  <li className={password.length <= 72 ? 'text-green-600' : 'text-red-600'}>
                    Maximum 72 characters
                  </li>
                </ul>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;


import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useClientAuth } from '../context/ClientAuthContext';
import { Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ClientLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, agency } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/client-portal';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      toast.success('Welcome to Client Portal');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {agency?.logo ? (
            <div className="flex items-center justify-center p-3 rounded-2xl bg-white border border-slate-200 shadow-md max-h-16">
              <img src={agency.logo} alt={agency.name || 'Agency Logo'} className="h-10 max-w-[160px] object-contain" />
            </div>
          ) : (
            <div 
              className="flex items-center justify-center h-14 w-14 rounded-2xl text-white shadow-lg"
              style={{ backgroundColor: agency?.themeColor || '#4f46e5' }}
            >
              <Building2 className="h-8 w-8" />
            </div>
          )}
        </div>
        <h2 className="mt-5 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          {agency?.name ? `${agency.name} Client Portal` : 'Client Recruitment Portal'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to review candidates, manage interviews, and track requisition progress.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Work Email</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link
                  to="/client-portal/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-500">
              Need access? Contact your agency recruitment partner to receive an invite.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;

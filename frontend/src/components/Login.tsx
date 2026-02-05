import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header'

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Accept any input and redirect to transactinos
    console.log('Login attempt:', { email, password });
    navigate('/transactions');
  };

  return (
    <Header currentPage="" hideNav>
      <div className="flex justify-center">
        <div className="flex p-8">
          <div className="flex flex-col p-4">
            <div>
              <h1 className="lg:text-4xl font-bold">Soraban Bookkeeping</h1>
              <p className="lg:text-xl">
                Sign in to access your account and access your transactions.
              </p>
            </div>

            <div className="my-auto">
              <div className="p-2">
                <h3 className="text-lg font-semibold">Record & Import Transactions</h3>
                <p className="text-sm">Users can manually add transactions or import a CSV.</p>
              </div>

              <div className="p-2">
                <h3 className="text-lg font-semibold">Bulk Actions & Automated Categorization</h3>
                <p className="text-sm">Users can categorize multiple transactions at once, and automatically assign category</p>
              </div>

              <div className="p-2">
                <h3 className="text-lg font-semibold">Anomaly Detection</h3>
                <p className="text-sm">Identify and flag unusual/suspicous transactions (e.g., large amounts, duplicates, missing metadata).
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              © 2026 Soraban Engineering Project Bookkeeping. All rights reserved.
            </div>
          </div>

          <div className="flex flex-col p-4">
            <div>
              <div className="mb-10">
                <h1 className="lg:text-4xl font-bold">Sign In</h1>
                <p className="lg:text-xl">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="text-sm font-semibold">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl "
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="text-sm font-semibold">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center">
                    <input
                      id="remember"
                      type="checkbox"
                    />
                    <label htmlFor="remember" className="px-2">
                      Remember me
                    </label>
                  </div>
                  <a href="#" className="text-sm font-semibold text-blue-600">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 cursor-pointer rounded-full"
                >
                  Sign In
                </button>
              </form>
              <p className="mt-8 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <a href="#" className="text-sm font-semibold text-blue-600">
                  Sign up for free
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Header>
  );
};

export default Login;

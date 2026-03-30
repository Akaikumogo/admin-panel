import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const Navigator = () => {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const token = localStorage.getItem('accessToken');
  const { pathname } = useLocation();
  
  useEffect(() => {
    if (pathname === '/' || pathname === '/dashboard') {
      if (isLoggedIn && token) {
        navigate('/dashboard/home');
      } else {
        navigate('/login');
      }
    }
  }, [isLoggedIn, token, navigate, pathname]);

  return (
    <div className="w-screen h-screen">
      <Outlet />
    </div>
  );
};

export default Navigator;

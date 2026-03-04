import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
export default function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => { setTimeout(() => navigate('/pos', { replace: true }), 1000); }, [navigate]);
  return <div className="min-h-screen flex items-center justify-center"><p>Completing sign in...</p></div>;
}

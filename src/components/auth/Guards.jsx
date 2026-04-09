import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function AdminRoute({ children }) {
  const { isLoggedIn, isAdmin } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/forbidden" replace />;
  return children;
}

export function RootRoute({ children }) {
  const { isLoggedIn, isRoot } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isRoot) return <Navigate to="/forbidden" replace />;
  return children;
}

export function AuthRedirect({ children }) {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) return <Navigate to="/console" replace />;
  return children;
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      // Listen for real-time notifications
      newSocket.on('vulnerability_detected', (data) => {
        toast.warning(`New vulnerability detected: ${data.title}`, {
          autoClose: 8000
        });
      });

      newSocket.on('threat_predicted', (data) => {
        toast.error(`Threat predicted: ${data.threatType}`, {
          autoClose: 10000
        });
      });

      newSocket.on('scan_completed', (data) => {
        toast.success(`Scan completed for project: ${data.projectName}`);
      });

      newSocket.on('pipeline_status', (data) => {
        if (data.status === 'failed') {
          toast.error(`Pipeline failed: ${data.message}`);
        } else if (data.status === 'completed') {
          toast.success(`Pipeline completed successfully`);
        }
      });

      newSocket.on('mitigation_executed', (data) => {
        toast.info(`Mitigation action executed: ${data.title}`);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket when user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const joinProject = (projectId) => {
    if (socket && connected) {
      socket.emit('join-project', projectId);
    }
  };

  const leaveProject = (projectId) => {
    if (socket && connected) {
      socket.emit('leave-project', projectId);
    }
  };

  const value = {
    socket,
    connected,
    joinProject,
    leaveProject
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
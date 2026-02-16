import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Terminal as TerminalIcon
} from '@mui/icons-material';
import axios from 'axios';

const LogsMonitoring = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const logsEndRef = useRef(null);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Handle both array of objects and array of strings
      const parsedLogs = response.data.logs.map(log => {
        if (typeof log === 'string') {
          try {
            return JSON.parse(log);
          } catch (e) {
            return { message: log, timestamp: new Date(), level: 'info' };
          }
        }
        return log;
      });

      setLogs(parsedLogs);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to connect to log stream. Ensure you are logged in as admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 3000); // Poll every 3 seconds
    }

    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    // Scroll to bottom on new logs if near bottom? 
    // For now, let's just keep it simple.
  }, [logs]);

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return '#ff5252';
      case 'warn': return '#ffca28';
      case 'info': return '#4caf50';
      case 'http': return '#2196f3';
      default: return '#e0e0e0';
    }
  };

  return (
    <Box sx={{ p: 3, height: '85vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TerminalIcon fontSize="large" color="primary" />
          <div>
            <Typography variant="h4" component="h1" fontWeight="bold">
              System Logs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time server activity monitoring
            </Typography>
          </div>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={autoRefresh ? "Pause Auto-refresh" : "Resume Auto-refresh"}>
            <IconButton onClick={() => setAutoRefresh(!autoRefresh)} color={autoRefresh ? "primary" : "default"}>
              {autoRefresh ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh Now">
            <IconButton onClick={fetchLogs} disabled={loading}>
              <RefreshIcon spin={loading.toString()} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#ffebee', color: '#c62828' }}>
          <Typography variant="h6">{error}</Typography>
        </Paper>
      ) : (
        <Paper
          elevation={3}
          sx={{
            flexGrow: 1,
            bgcolor: '#1e1e1e',
            color: '#e0e0e0',
            p: 2,
            overflow: 'auto',
            fontFamily: 'monospace',
            borderRadius: 2,
            position: 'relative'
          }}
        >
          {loading && logs.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {logs.length === 0 && (
                <Typography sx={{ color: 'grey.500', textAlign: 'center', mt: 4 }}>
                  No logs available or connection established.
                </Typography>
              )}

              {logs.map((log, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 0.5,
                    display: 'flex',
                    gap: 2,
                    borderBottom: '1px solid #333',
                    pb: 0.5,
                    '&:hover': { bgcolor: '#2a2a2a' }
                  }}
                >
                  <span style={{ color: '#888', minWidth: '160px' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--:--'}
                  </span>
                  <span style={{
                    color: getLevelColor(log.level),
                    fontWeight: 'bold',
                    minWidth: '60px',
                    textTransform: 'uppercase'
                  }}>
                    {log.level || 'INFO'}
                  </span>
                  <span style={{
                    wordBreak: 'break-all',
                    flexGrow: 1
                  }}>
                    {log.message}
                  </span>
                  {/* JSON Metadata dump if exists */}
                  {Object.keys(log).filter(k => !['message', 'level', 'timestamp', 'service'].includes(k)).length > 0 && (
                    <span style={{ color: '#555', fontSize: '0.8rem' }}>
                      {JSON.stringify(log, (key, value) => {
                        if (['message', 'level', 'timestamp', 'service'].includes(key)) return undefined;
                        return value;
                      })}
                    </span>
                  )}
                </Box>
              ))}
              <div ref={logsEndRef} />
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default LogsMonitoring;
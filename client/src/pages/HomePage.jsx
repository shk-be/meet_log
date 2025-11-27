import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { meetingAPI, actionItemAPI } from '../services/api';
import { Add as AddIcon, Event, CheckCircle, TrendingUp } from '@mui/icons-material';

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMeetings: 0,
    recentMeetings: [],
    actionItemSummary: {},
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [meetingsRes, actionItemsRes] = await Promise.all([
        meetingAPI.getAll({ page: 1, limit: 5 }),
        actionItemAPI.getSummary(),
      ]);

      setStats({
        totalMeetings: meetingsRes.data.pagination?.total || 0,
        recentMeetings: meetingsRes.data.meetings || [],
        actionItemSummary: actionItemsRes.data,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          대시보드
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/meetings/new')}
        >
          새 미팅 생성
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Event color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">총 미팅</Typography>
              </Box>
              <Typography variant="h3">{stats.totalMeetings}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">미완료 액션</Typography>
              </Box>
              <Typography variant="h3">
                {(stats.actionItemSummary.pending || 0) + (stats.actionItemSummary.inProgress || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUp color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">기한 초과</Typography>
              </Box>
              <Typography variant="h3" color="error">
                {stats.actionItemSummary.overdue || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 미팅
              </Typography>
              {stats.recentMeetings.length === 0 ? (
                <Typography color="text.secondary">미팅이 없습니다</Typography>
              ) : (
                stats.recentMeetings.map((meeting) => (
                  <Box
                    key={meeting.id}
                    p={2}
                    mb={1}
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f5f5f5' },
                    }}
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    <Typography variant="subtitle1">{meeting.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {meeting.date}
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

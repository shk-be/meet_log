import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMeetings } from '../context/MeetingContext';
import { format } from 'date-fns';

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { meetings, loading, fetchMeetings } = useMeetings();

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">미팅 목록</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/meetings/new')}
        >
          새 미팅 생성
        </Button>
      </Box>

      {meetings.length === 0 ? (
        <Card>
          <CardContent>
            <Typography align="center" color="text.secondary">
              저장된 미팅이 없습니다
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {meetings.map((meeting) => (
            <Grid item xs={12} md={6} lg={4} key={meeting.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {meeting.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {meeting.date}
                  </Typography>
                  <Box mt={2}>
                    {meeting.participantCount > 0 && (
                      <Chip
                        label={`참석자 ${meeting.participantCount}`}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                    {meeting.actionItemCount > 0 && (
                      <Chip
                        label={`액션 ${meeting.actionItemCount}`}
                        size="small"
                        color="primary"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                    {meeting.tagCount > 0 && (
                      <Chip
                        label={`태그 ${meeting.tagCount}`}
                        size="small"
                        color="secondary"
                        sx={{ mb: 1 }}
                      />
                    )}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    상세보기
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

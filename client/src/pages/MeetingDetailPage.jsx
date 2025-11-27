import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Button,
  Grid,
  Divider,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeetings } from '../context/MeetingContext';
import ReactMarkdown from 'react-markdown';

export default function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentMeeting, loading, fetchMeetingById } = useMeetings();

  useEffect(() => {
    fetchMeetingById(id);
  }, [id, fetchMeetingById]);

  if (loading || !currentMeeting) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Button onClick={() => navigate('/meetings')}>← 목록으로</Button>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {currentMeeting.title}
        </Typography>

        <Box mb={3}>
          <Chip label={currentMeeting.date} sx={{ mr: 1 }} />
          {currentMeeting.meeting_type && (
            <Chip label={currentMeeting.meeting_type} color="primary" sx={{ mr: 1 }} />
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {currentMeeting.participants && currentMeeting.participants.length > 0 && (
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              참석자
            </Typography>
            {currentMeeting.participants.map((p) => (
              <Chip key={p.id} label={p.name} sx={{ mr: 1, mb: 1 }} />
            ))}
          </Box>
        )}

        {currentMeeting.tags && currentMeeting.tags.length > 0 && (
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              태그
            </Typography>
            {currentMeeting.tags.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.name}
                color="secondary"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            미팅 요약
          </Typography>
          <Box
            sx={{
              '& h2': { fontSize: '1.5rem', mt: 2, mb: 1 },
              '& ul': { pl: 3 },
              '& p': { mb: 1 },
            }}
          >
            <ReactMarkdown>{currentMeeting.summary || currentMeeting.raw_content}</ReactMarkdown>
          </Box>
        </Box>

        {currentMeeting.actionItems && currentMeeting.actionItems.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              액션 아이템
            </Typography>
            <Grid container spacing={2}>
              {currentMeeting.actionItems.map((item) => (
                <Grid item xs={12} key={item.id}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body1">{item.description}</Typography>
                    {item.assignee_name && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        담당자: {item.assignee_name}
                      </Typography>
                    )}
                    <Chip
                      label={item.status}
                      size="small"
                      color={item.status === 'completed' ? 'success' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

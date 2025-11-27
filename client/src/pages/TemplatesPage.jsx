import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as TemplateIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    meetingType: '',
    templateContent: '',
    isDefault: false
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/templates`);
      setTemplates(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        meetingType: template.meeting_type || '',
        templateContent: template.template_content,
        isDefault: template.is_default
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        meetingType: '',
        templateContent: '',
        isDefault: false
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await axios.put(`${API_URL}/templates/${editingTemplate.id}`, formData);
      } else {
        await axios.post(`${API_URL}/templates`, formData);
      }
      fetchTemplates();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('이 템플릿을 삭제하시겠습니까?')) {
      try {
        await axios.delete(`${API_URL}/templates/${id}`);
        fetchTemplates();
      } catch (error) {
        console.error('Failed to delete template:', error);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">미팅 템플릿</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          새 템플릿
        </Button>
      </Box>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TemplateIcon />
                    <Typography variant="h6">{template.name}</Typography>
                  </Box>
                  {template.is_default && (
                    <Chip label="기본" size="small" color="primary" />
                  )}
                </Box>
                {template.description && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {template.description}
                  </Typography>
                )}
                {template.meeting_type && (
                  <Chip label={template.meeting_type} size="small" variant="outlined" />
                )}
              </CardContent>
              <CardActions>
                <IconButton size="small" onClick={() => handleOpenDialog(template)}>
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(template.id)}
                  disabled={template.is_default}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate ? '템플릿 수정' : '새 템플릿 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="템플릿 이름"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="설명"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label="미팅 유형"
              fullWidth
              value={formData.meetingType}
              onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
              placeholder="예: standup, retrospective, one_on_one"
            />
            <TextField
              label="템플릿 내용"
              fullWidth
              multiline
              rows={15}
              value={formData.templateContent}
              onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
              required
              placeholder="# 미팅 제목

## 주요 논의 사항
-

## 결정 사항
-

## 액션 아이템
- [ ]"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
              }
              label="기본 템플릿으로 설정"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSave} variant="contained">
            {editingTemplate ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

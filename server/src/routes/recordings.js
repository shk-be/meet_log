const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const recordingService = require('../services/recordingService');
const aiService = require('../services/aiService');

// 업로드 디렉토리 설정
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// 업로드 디렉토리가 없으면 생성
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|m4a|webm|mp4|mpeg|mpga|ogg|flac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('지원되지 않는 오디오 형식입니다. (mp3, wav, m4a, webm, mp4, mpeg, mpga, ogg, flac만 허용)'));
    }
  }
});

// 녹음 파일 업로드 및 전사
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '오디오 파일이 필요합니다.' });
    }

    const { meetingId, language } = req.body;

    if (!meetingId) {
      // 파일 삭제
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '미팅 ID가 필요합니다.' });
    }

    const filePath = '/uploads/' + path.basename(req.file.path);
    const fileSize = req.file.size;
    const format = path.extname(req.file.originalname).substring(1);

    // 1. 녹음 파일 정보 DB 저장
    const recordingId = await recordingService.createRecording({
      meetingId: parseInt(meetingId),
      filePath,
      fileSize,
      duration: null, // Whisper API에서 받아올 예정
      format,
      source: 'upload'
    });

    // 2. 음성 전사 (비동기)
    const transcriptionResult = await aiService.transcribeAudio(req.file.path, {
      language: language || 'ko',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });

    // 3. 전사 결과 저장
    const transcriptionId = await recordingService.createTranscription({
      recordingId,
      fullText: transcriptionResult.text,
      language: transcriptionResult.language || language || 'ko',
      transcriptionService: 'whisper'
    });

    // 4. 세그먼트 저장 (타임스탬프가 있는 경우)
    if (transcriptionResult.segments && transcriptionResult.segments.length > 0) {
      const segments = transcriptionResult.segments.map(seg => ({
        transcriptionId,
        speakerId: null,
        speakerName: null,
        startTime: seg.start,
        endTime: seg.end,
        text: seg.text,
        confidence: null
      }));

      await recordingService.createTranscriptionSegments(segments);
    }

    res.json({
      success: true,
      recordingId,
      transcriptionId,
      text: transcriptionResult.text,
      duration: transcriptionResult.duration,
      language: transcriptionResult.language
    });
  } catch (error) {
    // 에러 발생 시 업로드된 파일 삭제
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Recording upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 미팅별 녹음 파일 목록 조회
router.get('/meeting/:meetingId', async (req, res) => {
  try {
    const recordings = await recordingService.getRecordingsByMeetingId(req.params.meetingId);
    res.json(recordings);
  } catch (error) {
    console.error('Error getting recordings:', error);
    res.status(500).json({ error: error.message });
  }
});

// 녹음 파일 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const recording = await recordingService.getRecordingById(req.params.id);

    if (!recording) {
      return res.status(404).json({ error: '녹음 파일을 찾을 수 없습니다.' });
    }

    res.json(recording);
  } catch (error) {
    console.error('Error getting recording:', error);
    res.status(500).json({ error: error.message });
  }
});

// 전사 텍스트 조회
router.get('/:id/transcription', async (req, res) => {
  try {
    const transcription = await recordingService.getTranscriptionByRecordingId(req.params.id);

    if (!transcription) {
      return res.status(404).json({ error: '전사 텍스트를 찾을 수 없습니다.' });
    }

    res.json(transcription);
  } catch (error) {
    console.error('Error getting transcription:', error);
    res.status(500).json({ error: error.message });
  }
});

// 녹음 파일 삭제
router.delete('/:id', async (req, res) => {
  try {
    await recordingService.deleteRecording(req.params.id);
    res.json({ success: true, message: '녹음 파일이 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

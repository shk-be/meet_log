const { getDatabase } = require('../database/db');
const fs = require('fs');
const path = require('path');

class RecordingService {
  /**
   * 녹음 파일 정보를 DB에 저장
   */
  async createRecording(recordingData) {
    const db = getDatabase();
    const { meetingId, filePath, fileSize, duration, format, source } = recordingData;

    try {
      const result = await db.query(`
        INSERT INTO recordings (
          meeting_id, file_path, file_size, duration, format, source
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [meetingId, filePath, fileSize, duration, format, source]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating recording:', error);
      throw error;
    }
  }

  /**
   * 전사 텍스트를 DB에 저장
   */
  async createTranscription(transcriptionData) {
    const db = getDatabase();
    const { recordingId, fullText, language, transcriptionService } = transcriptionData;

    try {
      const result = await db.query(`
        INSERT INTO transcriptions (
          recording_id, full_text, language, transcription_service
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [recordingId, fullText, language, transcriptionService]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating transcription:', error);
      throw error;
    }
  }

  /**
   * 전사 세그먼트 저장 (타임스탬프, 화자별)
   */
  async createTranscriptionSegments(segments) {
    const db = getDatabase();

    try {
      for (const segment of segments) {
        const { transcriptionId, speakerId, speakerName, startTime, endTime, text, confidence } = segment;

        await db.query(`
          INSERT INTO transcription_segments (
            transcription_id, speaker_id, speaker_name,
            start_time, end_time, text, confidence
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [transcriptionId, speakerId, speakerName, startTime, endTime, text, confidence]);
      }
    } catch (error) {
      console.error('Error creating transcription segments:', error);
      throw error;
    }
  }

  /**
   * 녹음 파일 조회
   */
  async getRecordingById(id) {
    const db = getDatabase();

    try {
      const result = await db.query(
        'SELECT * FROM recordings WHERE id = $1',
        [id]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error getting recording:', error);
      throw error;
    }
  }

  /**
   * 미팅별 녹음 파일 조회
   */
  async getRecordingsByMeetingId(meetingId) {
    const db = getDatabase();

    try {
      const result = await db.query(
        'SELECT * FROM recordings WHERE meeting_id = $1 ORDER BY uploaded_at DESC',
        [meetingId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting recordings by meeting:', error);
      throw error;
    }
  }

  /**
   * 전사 텍스트 조회
   */
  async getTranscriptionByRecordingId(recordingId) {
    const db = getDatabase();

    try {
      const result = await db.query(
        'SELECT * FROM transcriptions WHERE recording_id = $1',
        [recordingId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const transcription = result.rows[0];

      // 세그먼트 조회
      const segmentsResult = await db.query(
        'SELECT * FROM transcription_segments WHERE transcription_id = $1 ORDER BY start_time',
        [transcription.id]
      );

      transcription.segments = segmentsResult.rows;

      return transcription;
    } catch (error) {
      console.error('Error getting transcription:', error);
      throw error;
    }
  }

  /**
   * 녹음 파일 삭제
   */
  async deleteRecording(id) {
    const db = getDatabase();

    try {
      // 파일 경로 조회
      const recording = await this.getRecordingById(id);

      if (recording && recording.file_path) {
        // 실제 파일 삭제
        const fullPath = path.join(__dirname, '../..', recording.file_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      // DB에서 삭제 (CASCADE로 transcriptions도 자동 삭제됨)
      await db.query('DELETE FROM recordings WHERE id = $1', [id]);
    } catch (error) {
      console.error('Error deleting recording:', error);
      throw error;
    }
  }
}

module.exports = new RecordingService();

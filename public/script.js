const API_URL = 'http://localhost:3000/api';

// DOM 요소
const meetingForm = document.getElementById('meetingForm');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');
const questionInput = document.getElementById('questionInput');
const searchResults = document.getElementById('searchResults');
const answerContent = document.getElementById('answerContent');
const relatedMeetings = document.getElementById('relatedMeetings');
const meetingsList = document.getElementById('meetingsList');

// 페이지 로드 시 미팅 목록 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadMeetings();
    // 오늘 날짜를 기본값으로 설정
    document.getElementById('meetingDate').valueAsDate = new Date();

    // 섹션 접기/펼치기 기능 초기화
    initializeCollapsibleSections();
});

// 섹션 접기/펼치기 기능
function initializeCollapsibleSections() {
    const sectionHeaders = document.querySelectorAll('.section-header');

    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;

            // 토글
            header.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
        });
    });
}

// 미팅 폼 제출
meetingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = meetingForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const meetingData = {
        title: document.getElementById('meetingTitle').value,
        date: document.getElementById('meetingDate').value,
        participants: document.getElementById('participants').value,
        content: document.getElementById('meetingContent').value
    };

    try {
        const response = await fetch(`${API_URL}/meetings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(meetingData)
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('미팅로그가 성공적으로 저장되었습니다!', 'success');
            meetingForm.reset();
            document.getElementById('meetingDate').valueAsDate = new Date();
            loadMeetings();
        } else {
            showAlert(`오류: ${result.error}`, 'error');
        }
    } catch (error) {
        showAlert('서버 연결에 실패했습니다. 서버가 실행 중인지 확인하세요.', 'error');
        console.error('Error:', error);
    } finally {
        submitBtn.disabled = false;
    }
});

// 검색 및 답변 생성
searchBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();

    if (!question) {
        showAlert('질문을 입력해주세요.', 'error');
        return;
    }

    searchBtn.disabled = true;
    searchResults.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });

        const result = await response.json();

        if (response.ok) {
            displaySearchResults(result);
        } else {
            showAlert(`오류: ${result.error}`, 'error');
        }
    } catch (error) {
        showAlert('검색 중 오류가 발생했습니다.', 'error');
        console.error('Error:', error);
    } finally {
        searchBtn.disabled = false;
    }
});

// 검색 결과 표시
function displaySearchResults(result) {
    answerContent.textContent = result.answer;

    relatedMeetings.innerHTML = '';
    if (result.relatedMeetings && result.relatedMeetings.length > 0) {
        result.relatedMeetings.forEach(meeting => {
            const card = createMeetingCard(meeting);
            relatedMeetings.appendChild(card);
        });
    } else {
        relatedMeetings.innerHTML = '<p class="empty-state">관련된 미팅로그를 찾을 수 없습니다.</p>';
    }

    searchResults.style.display = 'block';
}

// 미팅 목록 불러오기
async function loadMeetings() {
    try {
        const response = await fetch(`${API_URL}/meetings`);
        const meetings = await response.json();

        meetingsList.innerHTML = '';

        if (meetings.length === 0) {
            meetingsList.innerHTML = '<p class="empty-state">저장된 미팅로그가 없습니다.</p>';
            return;
        }

        meetings.forEach(meeting => {
            const card = createMeetingCard(meeting, true);
            meetingsList.appendChild(card);
        });
    } catch (error) {
        meetingsList.innerHTML = '<p class="empty-state">미팅로그를 불러올 수 없습니다.</p>';
        console.error('Error:', error);
    }
}

// 미팅 카드 생성
function createMeetingCard(meeting, showFullContent = false) {
    const card = document.createElement('div');
    card.className = 'meeting-card';

    const title = document.createElement('h4');
    title.textContent = meeting.title || meeting.filename;

    const date = document.createElement('div');
    date.className = 'date';
    date.textContent = meeting.date || '';

    const excerpt = document.createElement('div');
    excerpt.className = 'excerpt';

    if (showFullContent) {
        excerpt.textContent = meeting.content
            ? meeting.content.substring(0, 150) + '...'
            : meeting.excerpt || '';
    } else {
        excerpt.textContent = meeting.excerpt || meeting.content?.substring(0, 150) + '...' || '';
    }

    card.appendChild(title);
    card.appendChild(date);
    card.appendChild(excerpt);

    // 클릭 시 상세 내용 표시
    card.addEventListener('click', () => {
        showMeetingDetail(meeting);
    });

    return card;
}

// 미팅 상세 내용 표시
function showMeetingDetail(meeting) {
    const content = meeting.content || '내용이 없습니다.';
    const title = meeting.title || meeting.filename || '제목 없음';
    const date = meeting.date || '';

    // 간단한 모달 형태로 표시
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
    `;

    modalContent.innerHTML = `
        <h2 style="margin-bottom: 10px;">${title}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">${date}</p>
        <div style="white-space: pre-wrap; line-height: 1.8;">${content}</div>
        <button onclick="this.closest('div[style*=fixed]').remove()"
                style="margin-top: 20px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer;">
            닫기
        </button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 배경 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 알림 표시
function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// 새로고침 버튼
refreshBtn.addEventListener('click', loadMeetings);

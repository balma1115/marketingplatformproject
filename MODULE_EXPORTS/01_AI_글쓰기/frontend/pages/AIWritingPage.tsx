import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, GripVertical, Copy, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import TitleRecommendModal from '../components/modals/TitleRecommendModal';
import KeywordRecommendModal from '../components/modals/KeywordRecommendModal';
import LoadingOverlay from '../components/LoadingOverlay';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AIWritingPage.css';

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

const AIWritingPage: React.FC = () => {
  const location = useLocation();
  const { user, updateCoinBalance } = useAuth();
  const [author, setAuthor] = useState('');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isTitleEnabled, setIsTitleEnabled] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [tocGenerated, setTocGenerated] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isTocLoading, setIsTocLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [showContentEditor, setShowContentEditor] = useState(false);
  
  // GPT 타입 가져오기
  const getGPTType = () => {
    const pathname = location.pathname;
    if (pathname.includes('english-branch')) return 'english-branch';
    if (pathname.includes('math-branch')) return 'math-branch';
    if (pathname.includes('english-director')) return 'english-director';
    if (pathname.includes('math-director')) return 'math-director';
    return 'english-branch'; // 기본값
  };
  
  const gptType = getGPTType();
  
  // GPT 타입에 따른 제목 설정
  const getGPTTitle = () => {
    return 'AI 글쓰기';
  };
  
  // 작성자 플레이스홀더 설정
  const getAuthorPlaceholder = () => {
    if (gptType === 'english-branch') return '미래엔영어 성남이천지사';
    if (gptType === 'math-branch') return '미래엔수학 성남지사';
    if (gptType === 'english-director') return '미래엔영어 성남학원';
    if (gptType === 'math-director') return '미래엔수학 성남학원';
    return '미래엔 성남지사';
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTopic(value);
    setIsTitleEnabled(value.length > 0);
  };

  const handleGenerateTOC = async () => {
    setIsTocLoading(true);
    try {
      const generatedTOC = await api.generateTableOfContents(topic, title, gptType);
      setTableOfContents(generatedTOC);
      setTocGenerated(true);
      setCurrentStep(2);
    } catch (error) {
      console.error('Error generating TOC:', error);
      // Use fallback if API fails
      const fallbackTOC: TableOfContentsItem[] = [
        { id: '1', title: '머릿말', level: 0 },
        { id: '2', title: '시작글', level: 1 },
        { id: '3', title: '본문', level: 0 },
        { id: '4', title: `${topic}이(가) 무엇인가요?`, level: 1 },
        { id: '5', title: `${topic}의 주요 효능과 이점`, level: 1 },
        { id: '6', title: `${topic} 사용 시 주의사항`, level: 1 },
        { id: '7', title: `${topic} 선택 가이드`, level: 1 },
        { id: '8', title: '자주 묻는 질문', level: 1 },
        { id: '9', title: '맺음말', level: 0 },
        { id: '10', title: '마무리', level: 1 },
      ];
      setTableOfContents(fallbackTOC);
      setTocGenerated(true);
      setCurrentStep(2);
    } finally {
      setIsTocLoading(false);
    }
  };

  const handleAddSubItem = (parentId: string) => {
    const parentIndex = tableOfContents.findIndex(item => item.id === parentId);
    if (parentIndex !== -1) {
      const newItem: TableOfContentsItem = {
        id: Date.now().toString(),
        title: '새 항목',
        level: tableOfContents[parentIndex].level + 1
      };
      const newTOC = [...tableOfContents];
      newTOC.splice(parentIndex + 1, 0, newItem);
      setTableOfContents(newTOC);
    }
  };

  const handleRemoveItem = (id: string) => {
    setTableOfContents(tableOfContents.filter(item => item.id !== id));
  };

  const handleEditStart = (id: string, title: string) => {
    setEditingId(id);
    setEditingText(title);
  };

  const handleEditSave = () => {
    if (editingId && editingText.trim()) {
      setTableOfContents(tableOfContents.map(item => 
        item.id === editingId ? { ...item, title: editingText.trim() } : item
      ));
    }
    setEditingId(null);
    setEditingText('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    e.dataTransfer.setData('index', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('index'));
    
    if (dragIndex !== dropIndex) {
      const draggedItem = tableOfContents[dragIndex];
      const newTOC = [...tableOfContents];
      newTOC.splice(dragIndex, 1);
      newTOC.splice(dropIndex, 0, draggedItem);
      setTableOfContents(newTOC);
    }
  };

  const handleGenerateContent = async () => {
    setIsContentLoading(true);
    try {
      console.log('=== GENERATING CONTENT ===');
      console.log('Author:', author);
      console.log('Topic:', topic);
      console.log('Title:', title);
      console.log('Keywords:', keywords);
      console.log('Table of Contents:', tableOfContents);
      
      const result = await api.generateContent({ 
        author, 
        topic, 
        title, 
        keywords, 
        tableOfContents,
        gptType 
      });
      
      console.log('Content generated successfully, length:', result.content.length);
      setGeneratedContent(result.content);
      
      // 코인 잔액 업데이트
      if (result.newBalance !== undefined) {
        updateCoinBalance(result.newBalance);
      }
      
      setShowContentEditor(true);
      setCurrentStep(3);
    } catch (error: any) {
      console.error('Error generating content:', error);
      alert(error.message || '컨텐츠 생성 중 오류가 발생했습니다.');
    } finally {
      setIsContentLoading(false);
    }
  };

  const calculateWordCount = (text: string) => {
    const withSpaces = text.length;
    const withoutSpaces = text.replace(/\s/g, '').length;
    return { withSpaces, withoutSpaces };
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(generatedContent);
    alert('내용이 클립보드에 복사되었습니다.');
  };

  const isFormValid = author && topic && title && keywords && tocGenerated;

  return (
    <>
      <LoadingOverlay 
        isLoading={isTocLoading} 
        message="목차를 불러오는 중입니다" 
      />
      <LoadingOverlay 
        isLoading={isContentLoading} 
        message="글을 생성하는 중입니다" 
      />
      
      <div className="page-container">
        <h1 className="page-title">{getGPTTitle()}</h1>
        <p className="page-subtitle">미래엔영어 지사장님들을 위한 블로그 작성기입니다</p>

        <div className="content-card">
          <div className={`ai-writing-content ${tocGenerated ? 'with-toc' : ''}`}>
        <div className="ai-writing-left">
          <div className="ai-writing-header">
            <div className="step-indicator">
              <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                <span>1</span>
                <label>주제 설정</label>
              </div>
              <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                <span>2</span>
                <label>아웃라인 구성</label>
              </div>
              <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
                <span>3</span>
                <label>글쓰기 완성</label>
              </div>
            </div>
          </div>

          <div className="ai-writing-form">
          <div className="form-group">
            <label>작성자 <span className="required">*</span></label>
            <input
              type="text"
              placeholder={getAuthorPlaceholder()}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>주제 <span className="required">*</span></label>
            <input
              type="text"
              placeholder="ex) 영어학원창업"
              value={topic}
              onChange={handleTopicChange}
            />
          </div>

          <div className="form-group">
            <label>블로그 제목 <span className="required">*</span></label>
            <div className="input-with-button">
              <input
                type="text"
                placeholder="ex) 영어학원창업 미래엔영어가 답입니다."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isTitleEnabled}
              />
              <button 
                className="ai-recommend-btn"
                onClick={() => setShowTitleModal(true)}
                disabled={!isTitleEnabled}
              >
                AI 추천 제목
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>핵심 키워드 <span className="info-icon">ⓘ</span></label>
            <div className="input-with-button">
              <input
                type="text"
                placeholder="키워드 입력 후 엔터 및 스페이스"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <button 
                className="ai-recommend-btn"
                onClick={() => setShowKeywordModal(true)}
              >
                AI 추천 키워드
              </button>
            </div>
          </div>



          {!tocGenerated && (
            <div className="form-actions">
              
              <button 
                className="generate-toc-btn"
                onClick={handleGenerateTOC}
                disabled={!author || !topic || !title || isTocLoading}
              >
                {isTocLoading ? '목차 생성중...' : '목차생성 ➜'}
              </button>
            </div>
          )}

          {tocGenerated && (
            <div className="form-actions">
              <button 
                className="generate-content-btn"
                onClick={handleGenerateContent}
                disabled={!isFormValid || isContentLoading}
              >
                {isContentLoading ? '글 생성중...' : '글 생성 (3냥)'}
              </button>
            </div>
          )}
          </div>
        </div>

        {tocGenerated && (
          <div className="table-of-contents">
            <div className="toc-header">
              <h3>목차 생성 결과</h3>
              <button 
                className="regenerate-toc-btn"
                onClick={handleGenerateTOC}
                disabled={isTocLoading}
              >
                {isTocLoading ? '목차 재생성중...' : '목차 재생성'}
              </button>
            </div>
            <div className="toc-container">
              <div className="toc-section">
                <div className="toc-label">목차 </div>
                {tableOfContents.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="toc-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <GripVertical size={16} className="drag-handle" />
                    {editingId === item.id ? (
                      <input
                        type="text"
                        className="toc-edit-input"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleEditSave();
                          if (e.key === 'Escape') handleEditCancel();
                        }}
                        onBlur={handleEditSave}
                        autoFocus
                      />
                    ) : (
                      <span 
                        className="toc-title" 
                        onClick={() => handleEditStart(item.id, item.title)}
                      >
                        {item.title}
                      </span>
                    )}
                    <button className="toc-action" onClick={() => handleAddSubItem(item.id)}>
                      <Plus size={16} />
                    </button>
                    <button className="toc-action" onClick={() => handleRemoveItem(item.id)}>
                      <Minus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {showTitleModal && (
        <TitleRecommendModal
          topic={topic}
          gptType={gptType}
          onClose={() => setShowTitleModal(false)}
          onSelect={(selectedTitle) => {
            setTitle(selectedTitle);
            setShowTitleModal(false);
          }}
        />
      )}

      {showKeywordModal && (
        <KeywordRecommendModal
          topic={topic}
          onClose={() => setShowKeywordModal(false)}
          onSelect={(selectedKeywords) => {
            setKeywords(selectedKeywords.join(', '));
            setShowKeywordModal(false);
          }}
        />
      )}

      {showContentEditor && (
        <div className="content-editor-overlay">
          <div className="content-editor">
            <div className="editor-header">
              <h2>{title}</h2>
              <button className="editor-close" onClick={() => setShowContentEditor(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="editor-toolbar">
              <button className="toolbar-btn" onClick={handleCopyContent}>
                <Copy size={18} />
                <span>복사</span>
              </button>
            </div>

            <div className="editor-body">
              <textarea
                className="content-textarea"
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                placeholder="생성된 내용이 여기에 표시됩니다..."
              />
            </div>

            <div className="editor-footer">
              <div className="word-count">
                {(() => {
                  const count = calculateWordCount(generatedContent);
                  return (
                    <>
                      <span>공백 포함: {count.withSpaces.toLocaleString()}자</span>
                      <span className="separator">|</span>
                      <span>공백 제외: {count.withoutSpaces.toLocaleString()}자</span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIWritingPage;
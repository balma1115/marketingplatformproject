import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, TrendingUp, AlertCircle, Globe, BookOpen, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react';
import './FocusKeywordUnified.css';

interface UnifiedKeyword {
  keyword: string;
  smartplace: {
    id: number;
    projectName: string;
    projectId: string;
    addedDate: string;
    currentRank: number | null;
    overallRank: number | null;
    rankingType: string;
    lastTracked: string;
  } | null;
  blog: {
    id: number;
    projectName: string;
    projectId: string;
    addedDate: string;
    mainTabRank: number | null;
    blogTabRank: number | null;
    viewTabRank: number | null;
    lastTracked: string;
  } | null;
}

interface Stats {
  totalKeywords: number;
  smartplaceOnly: number;
  blogOnly: number;
  both: number;
}

const FocusKeywordUnified: React.FC = () => {
  const [keywords, setKeywords] = useState<UnifiedKeyword[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalKeywords: 0,
    smartplaceOnly: 0,
    blogOnly: 0,
    both: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTarget, setAddTarget] = useState<'smartplace' | 'blog' | null>(null);
  const [newKeywords, setNewKeywords] = useState('');
  const [filter, setFilter] = useState<'all' | 'smartplace' | 'blog' | 'both'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/focus-keywords/unified`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setKeywords(data.keywords);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch keywords:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeywords = async () => {
    if (!addTarget || !newKeywords.trim()) return;

    const keywordList = newKeywords.split('\n').filter(k => k.trim());
    if (keywordList.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const endpoint = addTarget === 'smartplace' 
        ? '/api/focus-keywords/add-to-smartplace'
        : '/api/focus-keywords/add-to-blog';

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ keywords: keywordList })
      });

      if (response.ok) {
        await fetchKeywords();
        setShowAddModal(false);
        setNewKeywords('');
        setAddTarget(null);
        setError(null);
      } else {
        const data = await response.json();
        setError(data.error || '키워드 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to add keywords:', error);
      setError('키워드 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveKeyword = async (source: 'smartplace' | 'blog', keywordId: number) => {
    if (!confirm('이 키워드를 제거하시겠습니까?')) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/focus-keywords/${source}/${keywordId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchKeywords();
      }
    } catch (error) {
      console.error('Failed to remove keyword:', error);
    }
  };

  const getRankClass = (rank: number | null): string => {
    if (!rank) return '';
    if (rank <= 5) return 'rank-top5';
    if (rank <= 10) return 'rank-top10';
    if (rank <= 20) return 'rank-top20';
    return 'rank-low';
  };

  const filteredKeywords = keywords.filter(k => {
    if (filter === 'smartplace' && !k.smartplace) return false;
    if (filter === 'blog' && !k.blog) return false;
    if (filter === 'both' && (!k.smartplace || !k.blog)) return false;
    
    if (searchTerm) {
      return k.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  const exportToCSV = () => {
    const csvContent = [
      ['키워드', '스마트플레이스 순위', '스마트플레이스 전체순위', '블로그 통합검색', '블로그탭', 'VIEW탭'],
      ...filteredKeywords.map(k => [
        k.keyword,
        k.smartplace?.currentRank || '-',
        k.smartplace?.overallRank || '-',
        k.blog?.mainTabRank || '-',
        k.blog?.blogTabRank || '-',
        k.blog?.viewTabRank || '-'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `focus-keywords-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="focus-keyword-unified">
      <div className="page-header">
        <h1>
          <TrendingUp size={24} />
          중점키워드 통합 관리
        </h1>
        <div className="header-actions">
          <button className="btn-refresh" onClick={fetchKeywords}>
            <RefreshCw size={18} />
            새로고침
          </button>
          <button className="btn-export" onClick={exportToCSV}>
            <Download size={18} />
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp />
          </div>
          <div className="stat-content">
            <h3>전체 키워드</h3>
            <p className="stat-value">{stats.totalKeywords}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Globe />
          </div>
          <div className="stat-content">
            <h3>스마트플레이스</h3>
            <p className="stat-value">{stats.smartplaceOnly}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <BookOpen />
          </div>
          <div className="stat-content">
            <h3>블로그</h3>
            <p className="stat-value">{stats.blogOnly}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle />
          </div>
          <div className="stat-content">
            <h3>중복 등록</h3>
            <p className="stat-value">{stats.both}</p>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="controls-section">
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            전체 ({stats.totalKeywords})
          </button>
          <button 
            className={filter === 'smartplace' ? 'active' : ''}
            onClick={() => setFilter('smartplace')}
          >
            <Globe size={16} />
            스마트플레이스만
          </button>
          <button 
            className={filter === 'blog' ? 'active' : ''}
            onClick={() => setFilter('blog')}
          >
            <BookOpen size={16} />
            블로그만
          </button>
          <button 
            className={filter === 'both' ? 'active' : ''}
            onClick={() => setFilter('both')}
          >
            <CheckCircle size={16} />
            중복 등록
          </button>
        </div>

        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text"
            placeholder="키워드 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 키워드 추가 버튼 */}
      <div className="action-buttons">
        <button 
          className="btn-add smartplace"
          onClick={() => {
            setAddTarget('smartplace');
            setShowAddModal(true);
          }}
        >
          <Plus size={18} />
          스마트플레이스 키워드 추가
        </button>
        <button 
          className="btn-add blog"
          onClick={() => {
            setAddTarget('blog');
            setShowAddModal(true);
          }}
        >
          <Plus size={18} />
          블로그 키워드 추가
        </button>
      </div>

      {/* 키워드 테이블 */}
      <div className="keywords-table">
        <table>
          <thead>
            <tr>
              <th>키워드</th>
              <th>스마트플레이스</th>
              <th>블로그</th>
              <th>등록일</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="loading-cell">
                  데이터를 불러오는 중...
                </td>
              </tr>
            ) : filteredKeywords.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  등록된 키워드가 없습니다.
                </td>
              </tr>
            ) : (
              filteredKeywords.map((keyword, index) => (
                <tr key={index}>
                  <td className="keyword-cell">
                    <strong>{keyword.keyword}</strong>
                  </td>
                  <td className="smartplace-cell">
                    {keyword.smartplace ? (
                      <div className="rank-info">
                        <span className={`rank ${getRankClass(keyword.smartplace.currentRank)}`}>
                          {keyword.smartplace.currentRank || '-'}위
                        </span>
                        <span className="project-name">{keyword.smartplace.projectName}</span>
                        <span className="last-tracked">
                          {keyword.smartplace.lastTracked ? 
                            new Date(keyword.smartplace.lastTracked).toLocaleDateString() : 
                            '미측정'}
                        </span>
                      </div>
                    ) : (
                      <span className="not-registered">미등록</span>
                    )}
                  </td>
                  <td className="blog-cell">
                    {keyword.blog ? (
                      <div className="rank-info">
                        <div className="rank-badges">
                          <span className={`rank-badge ${getRankClass(keyword.blog.mainTabRank)}`}>
                            통합 {keyword.blog.mainTabRank || '-'}
                          </span>
                          <span className={`rank-badge ${getRankClass(keyword.blog.blogTabRank)}`}>
                            블로그 {keyword.blog.blogTabRank || '-'}
                          </span>
                          <span className={`rank-badge ${getRankClass(keyword.blog.viewTabRank)}`}>
                            VIEW {keyword.blog.viewTabRank || '-'}
                          </span>
                        </div>
                        <span className="project-name">{keyword.blog.projectName}</span>
                      </div>
                    ) : (
                      <span className="not-registered">미등록</span>
                    )}
                  </td>
                  <td className="date-cell">
                    {keyword.smartplace?.addedDate || keyword.blog?.addedDate ? 
                      new Date(keyword.smartplace?.addedDate || keyword.blog?.addedDate || '').toLocaleDateString() :
                      '-'}
                  </td>
                  <td className="action-cell">
                    {keyword.smartplace && (
                      <button 
                        className="btn-remove"
                        onClick={() => handleRemoveKeyword('smartplace', keyword.smartplace!.id)}
                        title="스마트플레이스에서 제거"
                      >
                        <Globe size={16} />
                        <XCircle size={16} />
                      </button>
                    )}
                    {keyword.blog && (
                      <button 
                        className="btn-remove"
                        onClick={() => handleRemoveKeyword('blog', keyword.blog!.id)}
                        title="블로그에서 제거"
                      >
                        <BookOpen size={16} />
                        <XCircle size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 키워드 추가 모달 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {addTarget === 'smartplace' ? (
                  <>
                    <Globe size={20} />
                    스마트플레이스 키워드 추가
                  </>
                ) : (
                  <>
                    <BookOpen size={20} />
                    블로그 키워드 추가
                  </>
                )}
              </h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {error && (
                <div className="error-message">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              
              <div className="form-group">
                <label>키워드 입력 (한 줄에 하나씩)</label>
                <textarea
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="키워드1&#10;키워드2&#10;키워드3"
                  rows={10}
                />
                <div className="help-text">
                  {addTarget === 'smartplace' 
                    ? '최대 30개까지 등록 가능합니다.'
                    : '최대 50개까지 등록 가능합니다.'}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
                취소
              </button>
              <button 
                className="btn-submit"
                onClick={handleAddKeywords}
                disabled={loading || !newKeywords.trim()}
              >
                {loading ? '추가 중...' : '키워드 추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusKeywordUnified;
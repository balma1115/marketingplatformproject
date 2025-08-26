import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  TrendingUp, 
  Search, 
  Target,
  Calendar,
  User,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BarChart
} from 'lucide-react';
import '../styles/AIKeywordRecommend.css';

interface KeywordRecommendation {
  keyword: string;
  reason: string;
  searchVolume: number;
  difficulty: string;
  contentIdeas: string[];
}

interface Props {
  analyzedKeywords?: string[];
  blogUrl?: string;
  category?: string;
}

const AIKeywordRecommend: React.FC<Props> = ({ 
  analyzedKeywords = [], 
  blogUrl, 
  category 
}) => {
  const [recommendations, setRecommendations] = useState<KeywordRecommendation[]>([]);
  const [educationTrends, setEducationTrends] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ai' | 'seasonal' | 'personalized'>('ai');
  const [loading, setLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // AI 추천 가져오기
  const fetchAIRecommendations = async () => {
    if (analyzedKeywords.length === 0) return;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/datalab/ai-recommendations', {
        analyzedKeywords,
        blogUrl,
        category
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 시즌별 추천 가져오기
  const fetchSeasonalRecommendations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/datalab/seasonal-recommendations', {
        withCredentials: true
      });
      
      if (response.data.success) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching seasonal recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 개인화 추천 가져오기
  const fetchPersonalizedRecommendations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/datalab/personalized-recommendations', {
        withCredentials: true
      });
      
      if (response.data.success) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 교육 트렌드 가져오기
  const fetchEducationTrends = async () => {
    try {
      const response = await axios.get('/api/datalab/education-trends', {
        withCredentials: true
      });
      
      if (response.data.success) {
        setEducationTrends(response.data.keywords);
      }
    } catch (error) {
      console.error('Error fetching education trends:', error);
    }
  };

  useEffect(() => {
    fetchEducationTrends();
    if (analyzedKeywords.length > 0) {
      fetchAIRecommendations();
    }
  }, [analyzedKeywords]);

  const handleTabChange = (tab: 'ai' | 'seasonal' | 'personalized') => {
    setActiveTab(tab);
    setExpandedCard(null);
    
    switch (tab) {
      case 'ai':
        fetchAIRecommendations();
        break;
      case 'seasonal':
        fetchSeasonalRecommendations();
        break;
      case 'personalized':
        fetchPersonalizedRecommendations();
        break;
    }
  };

  const formatSearchVolume = (volume: number): string => {
    if (volume >= 10000) {
      return `${(volume / 1000).toFixed(0)}K`;
    }
    return volume.toLocaleString();
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case '낮음': return 'difficulty-low';
      case '보통': return 'difficulty-medium';
      case '높음': return 'difficulty-high';
      default: return 'difficulty-unknown';
    }
  };

  const toggleCard = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  return (
    <div className="ai-keyword-recommend">
      {/* 교육 트렌드 배너 */}
      {educationTrends.length > 0 && (
        <div className="education-trends-banner">
          <div className="trends-header">
            <TrendingUp className="trends-icon" />
            <h3>지금 뜨는 교육 키워드</h3>
          </div>
          <div className="trends-scroll">
            {educationTrends.slice(0, 10).map((trend, idx) => (
              <div key={idx} className="trend-chip">
                <span className="trend-keyword">{trend.keyword}</span>
                <span className="trend-volume">
                  <Search size={14} />
                  {formatSearchVolume(trend.searchVolume)}
                </span>
                {trend.trend && (
                  <span className={`trend-badge ${trend.trend.startsWith('+') ? 'up' : 'down'}`}>
                    {trend.trend}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 탭 메뉴 */}
      <div className="recommend-tabs">
        <button 
          className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => handleTabChange('ai')}
        >
          <Sparkles size={18} />
          AI 추천
        </button>
        <button 
          className={`tab-btn ${activeTab === 'seasonal' ? 'active' : ''}`}
          onClick={() => handleTabChange('seasonal')}
        >
          <Calendar size={18} />
          시즌별 추천
        </button>
        <button 
          className={`tab-btn ${activeTab === 'personalized' ? 'active' : ''}`}
          onClick={() => handleTabChange('personalized')}
        >
          <User size={18} />
          맞춤 추천
        </button>
      </div>

      {/* 추천 키워드 리스트 */}
      <div className="recommendations-container">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="spin" size={48} />
            <p>AI가 키워드를 분석하고 있습니다...</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="recommendation-cards">
            {recommendations.map((rec, index) => (
              <div key={index} className="recommendation-card">
                <div className="card-header" onClick={() => toggleCard(index)}>
                  <div className="card-title">
                    <Target className="card-icon" />
                    <h4>{rec.keyword}</h4>
                  </div>
                  <div className="card-meta">
                    <span className="search-volume">
                      <BarChart size={16} />
                      {formatSearchVolume(rec.searchVolume)}
                    </span>
                    <span className={`difficulty ${getDifficultyColor(rec.difficulty)}`}>
                      {rec.difficulty}
                    </span>
                    {expandedCard === index ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>
                
                {expandedCard === index && (
                  <div className="card-content">
                    <div className="recommendation-reason">
                      <p>{rec.reason}</p>
                    </div>
                    
                    {rec.contentIdeas.length > 0 && (
                      <div className="content-ideas">
                        <h5>
                          <Lightbulb size={16} />
                          콘텐츠 아이디어
                        </h5>
                        <ul>
                          {rec.contentIdeas.map((idea, idx) => (
                            <li key={idx}>{idea}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="card-actions">
                      <button className="action-btn primary">
                        이 키워드로 글쓰기
                      </button>
                      <button className="action-btn secondary">
                        검색량 상세보기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Sparkles size={48} />
            <p>
              {activeTab === 'ai' 
                ? '블로그를 먼저 분석하면 AI가 맞춤 키워드를 추천해드립니다.'
                : '추천 키워드를 불러오는 중 오류가 발생했습니다.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIKeywordRecommend;
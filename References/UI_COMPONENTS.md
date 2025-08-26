# MarketingPlat UI 컴포넌트 가이드

## 디자인 시스템 개요

### 디자인 철학
- **다크 테마 기반**: 사용자 눈의 피로 최소화
- **Ultrathink 스타일**: 단색 네이비 배경과 강렬한 액센트 컬러
- **직관적 UX**: 최소한의 클릭으로 목표 달성
- **반응형 디자인**: 모든 디바이스에서 일관된 경험

### 컬러 시스템
```css
:root {
  /* 배경 색상 */
  --bg-primary: #0f0e24;      /* 메인 배경 */
  --bg-secondary: #1a1a2e;    /* 카드 배경 */
  --bg-tertiary: #0b0a1a;     /* 더 어두운 배경 */
  --bg-card: #1a1a2e;        /* 카드 컨테이너 */
  --bg-hover: #13122f;       /* 호버 상태 */
  
  /* 텍스트 색상 */
  --text-primary: #ffffff;    /* 메인 텍스트 */
  --text-secondary: #9ca3af;  /* 보조 텍스트 */
  --text-muted: #6b7280;      /* 비활성 텍스트 */
  
  /* 브랜드 색상 */
  --color-primary: #2B52A1;   /* 메인 브랜드 */
  --color-accent: #7ba7ff;    /* 액센트 색상 */
  --color-success: #10b981;   /* 성공 */
  --color-warning: #f59e0b;   /* 경고 */
  --color-danger: #ef4444;    /* 위험 */
  
  /* 그라데이션 */
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-dark: linear-gradient(135deg, #1a1a2e 0%, #0f0e24 100%);
}
```

## 1. 레이아웃 컴포넌트

### Layout.tsx
메인 애플리케이션 레이아웃 컨테이너

```typescript
interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-layout">
      <Header onMenuClick={toggleSidebar} />
      <div className="layout-content">
        <Sidebar isOpen={sidebarOpen} />
        <MainContent>{children}</MainContent>
      </div>
    </div>
  );
};
```

**특징:**
- 반응형 레이아웃 (모바일/데스크톱)
- 사이드바 토글 기능
- 헤더 고정 배치
- 다크 테마 적용

### Header.tsx
상단 네비게이션 헤더

```typescript
interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  return (
    <header className="header">
      <div className="header-left">
        <Button variant="ghost" onClick={onMenuClick}>
          <Menu size={20} />
        </Button>
        <img src="/logo.png" alt="MarketingPlat" className="header-logo" />
      </div>
      
      <div className="header-center">
        <SearchBar />
      </div>
      
      <div className="header-right">
        <NotificationCenter 
          notifications={notifications}
          unreadCount={unreadCount}
        />
        <UserMenu user={user} onLogout={logout} />
        <CoinDisplay balance={user?.coin} />
      </div>
    </header>
  );
};
```

**기능:**
- 사용자 정보 표시
- 알림 센터
- 냥 코인 잔액 표시
- 로그아웃 기능
- 반응형 모바일 메뉴

### Sidebar.tsx
좌측 네비게이션 사이드바

```typescript
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  const menuItems = useMemo(() => {
    return getMenuItemsByRole(user?.role);
  }, [user?.role]);
  
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <nav className="sidebar-nav">
        {menuItems.map((category) => (
          <MenuCategory 
            key={category.title}
            category={category}
            currentPath={location.pathname}
          />
        ))}
      </nav>
    </aside>
  );
};
```

**특징:**
- 역할별 메뉴 표시
- 현재 경로 하이라이트
- 카테고리별 그룹화
- 모바일 오버레이 지원

## 2. 공통 컴포넌트

### Button.tsx
재사용 가능한 버튼 컴포넌트

```typescript
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'medium', loading, ...props }, ref) => {
    return (
      <button 
        ref={ref}
        className={`btn btn-${variant} btn-${size}`}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Loader className="btn-spinner" />}
        {icon && iconPosition === 'left' && <span className="btn-icon">{icon}</span>}
        {children && <span className="btn-text">{children}</span>}
        {icon && iconPosition === 'right' && <span className="btn-icon">{icon}</span>}
      </button>
    );
  }
);
```

**스타일 variants:**
- `primary`: 메인 액션 버튼
- `secondary`: 보조 액션 버튼
- `danger`: 삭제/위험한 액션
- `success`: 성공/완료 액션
- `ghost`: 투명 배경 버튼
- `outline`: 테두리만 있는 버튼

### Modal.tsx
모달 다이얼로그 컴포넌트

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  closable?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, children, size = 'medium', closable = true
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-container modal-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            {closable && (
              <Button variant="ghost" size="small" onClick={onClose}>
                <X size={20} />
              </Button>
            )}
          </div>
        )}
        
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};
```

### Skeleton.tsx
로딩 스켈레톤 컴포넌트

```typescript
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  variant = 'text',
  animation = 'pulse'
}) => {
  return (
    <div 
      className={`skeleton skeleton-${variant} skeleton-${animation}`}
      style={{ width, height }}
    />
  );
};
```

## 3. 서비스별 컴포넌트

### ServiceCard.tsx
메인 페이지 서비스 카드

```typescript
interface ServiceCardProps {
  number: string;
  title: string;
  description: string;
  category: string;
  categoryColor: string;
  link: string;
  icon?: React.ReactNode;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  number, title, description, category, categoryColor, link, icon
}) => {
  return (
    <Link to={link} className="service-card">
      <div className="service-card-number">{number}</div>
      <div className="service-card-content">
        <div className="service-card-header">
          <div className={`service-card-category ${categoryColor}`}>
            {category}
          </div>
          {icon && <div className="service-card-icon">{icon}</div>}
        </div>
        <h3 className="service-card-title">{title}</h3>
        <p className="service-card-description">{description}</p>
      </div>
    </Link>
  );
};
```

**스타일 특징:**
- 단색 네이비 배경 (#2c4b8a)
- 카드 번호 크게 표시 (56px)
- 카테고리 태그 (노란색/주황색)
- 2열 그리드 레이아웃

### LoadingOverlay.tsx
전체 화면 로딩 오버레이

```typescript
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading, message, progress
}) => {
  if (!isLoading) return null;
  
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner">
          <Loader size={48} className="animate-spin" />
        </div>
        
        {message && (
          <p className="loading-message">{message}</p>
        )}
        
        {typeof progress === 'number' && (
          <div className="loading-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

## 4. 폼 컴포넌트

### Input.tsx
재사용 가능한 인풋 컴포넌트

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'outlined' | 'filled';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, variant = 'default', className, ...props }, ref) => {
    return (
      <div className="input-group">
        {label && <label className="input-label">{label}</label>}
        
        <div className={`input-wrapper input-${variant} ${error ? 'input-error' : ''}`}>
          {leftIcon && <div className="input-icon input-icon-left">{leftIcon}</div>}
          
          <input
            ref={ref}
            className={`input ${className || ''}`}
            {...props}
          />
          
          {rightIcon && <div className="input-icon input-icon-right">{rightIcon}</div>}
        </div>
        
        {(error || helperText) && (
          <div className={`input-help ${error ? 'input-help-error' : ''}`}>
            {error || helperText}
          </div>
        )}
      </div>
    );
  }
);
```

### Select.tsx
커스텀 셀렉트 컴포넌트

```typescript
interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | number;
  placeholder?: string;
  onChange: (value: string | number) => void;
  error?: string;
  label?: string;
  multiple?: boolean;
}

const Select: React.FC<SelectProps> = ({
  options, value, placeholder, onChange, error, label, multiple
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="select-group">
      {label && <label className="select-label">{label}</label>}
      
      <div className="select-wrapper">
        <button
          className={`select-trigger ${error ? 'select-error' : ''} ${isOpen ? 'select-open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="select-value">
            {value ? options.find(opt => opt.value === value)?.label : placeholder}
          </span>
          <ChevronDown size={16} className="select-icon" />
        </button>
        
        {isOpen && (
          <div className="select-dropdown">
            {options.map((option) => (
              <button
                key={option.value}
                className={`select-option ${value === option.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                disabled={option.disabled}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {error && <div className="select-help-error">{error}</div>}
    </div>
  );
};
```

## 5. 분석 컴포넌트

### KeywordCloud.tsx
키워드 클라우드 시각화

```typescript
interface KeywordCloudProps {
  keywords: Array<{
    text: string;
    value: number;
    color?: string;
  }>;
  width?: number;
  height?: number;
}

const KeywordCloud: React.FC<KeywordCloudProps> = ({
  keywords, width = 800, height = 400
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!keywords.length) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const layout = cloud()
      .size([width, height])
      .words(keywords.map(k => ({ text: k.text, size: k.value * 20 })))
      .padding(5)
      .rotate(() => ~~(Math.random() * 2) * 90)
      .font('Impact')
      .fontSize(d => d.size);
    
    layout.on('end', (words) => {
      svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`)
        .selectAll('text')
        .data(words)
        .enter().append('text')
        .style('font-size', d => `${d.size}px`)
        .style('font-family', 'Impact')
        .style('fill', (_, i) => d3.schemeCategory10[i % 10])
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text(d => d.text);
    });
    
    layout.start();
  }, [keywords, width, height]);
  
  return <svg ref={svgRef} className="keyword-cloud" />;
};
```

### Chart.tsx
차트 컴포넌트 (Chart.js 기반)

```typescript
interface ChartProps {
  type: 'line' | 'bar' | 'doughnut' | 'pie';
  data: ChartData;
  options?: ChartOptions;
  height?: number;
}

const Chart: React.FC<ChartProps> = ({ type, data, options, height = 300 }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    const chart = new ChartJS(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'var(--text-primary)'
            }
          }
        },
        scales: type !== 'doughnut' && type !== 'pie' ? {
          x: {
            grid: { color: 'var(--border-light)' },
            ticks: { color: 'var(--text-secondary)' }
          },
          y: {
            grid: { color: 'var(--border-light)' },
            ticks: { color: 'var(--text-secondary)' }
          }
        } : undefined,
        ...options
      }
    });
    
    return () => chart.destroy();
  }, [type, data, options]);
  
  return (
    <div className="chart-container" style={{ height }}>
      <canvas ref={chartRef} />
    </div>
  );
};
```

## 6. 특화 컴포넌트

### RankingProgressOverlay.tsx
순위 체크 진행 상황 오버레이

```typescript
interface RankingProgressProps {
  isVisible: boolean;
  progress: number;
  currentKeyword: string;
  completedCount: number;
  totalCount: number;
  results: RankingResult[];
}

const RankingProgressOverlay: React.FC<RankingProgressProps> = ({
  isVisible, progress, currentKeyword, completedCount, totalCount, results
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="ranking-progress-overlay">
      <div className="progress-modal">
        <div className="progress-header">
          <h3>순위 확인 진행중...</h3>
          <div className="progress-stats">
            {completedCount} / {totalCount} 완료
          </div>
        </div>
        
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-percentage">{Math.round(progress)}%</span>
        </div>
        
        <div className="current-keyword">
          현재 확인중: <strong>{currentKeyword}</strong>
        </div>
        
        <div className="results-preview">
          {results.slice(-5).map((result, index) => (
            <div key={index} className="result-item">
              <span className="keyword">{result.keyword}</span>
              <span className={`rank ${result.found ? 'found' : 'not-found'}`}>
                {result.found ? `${result.rank}위` : '미발견'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### RollingBanner.tsx
자동 롤링 배너

```typescript
interface BannerItem {
  id: number;
  title: string;
  imageUrl: string;
  link?: string;
}

interface RollingBannerProps {
  banners: BannerItem[];
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
}

const RollingBanner: React.FC<RollingBannerProps> = ({
  banners, autoPlay = true, interval = 3000, showDots = true, showArrows = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (!autoPlay || banners.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [autoPlay, interval, banners.length]);
  
  return (
    <div className="rolling-banner">
      <div className="banner-container">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`banner-slide ${index === currentIndex ? 'active' : ''}`}
            style={{ transform: `translateX(${(index - currentIndex) * 100}%)` }}
          >
            {banner.link ? (
              <Link to={banner.link}>
                <img src={banner.imageUrl} alt={banner.title} />
              </Link>
            ) : (
              <img src={banner.imageUrl} alt={banner.title} />
            )}
          </div>
        ))}
      </div>
      
      {showDots && banners.length > 1 && (
        <div className="banner-dots">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
      
      {showArrows && banners.length > 1 && (
        <>
          <button className="banner-arrow banner-arrow-left" onClick={goToPrevious}>
            <ChevronLeft size={24} />
          </button>
          <button className="banner-arrow banner-arrow-right" onClick={goToNext}>
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
};
```

## 7. 반응형 디자인

### 브레이크포인트 시스템
```css
/* Breakpoints */
:root {
  --breakpoint-sm: 640px;   /* Mobile */
  --breakpoint-md: 768px;   /* Tablet */
  --breakpoint-lg: 1024px;  /* Desktop */
  --breakpoint-xl: 1280px;  /* Large Desktop */
}

/* Media Query Mixins */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
    z-index: 1000;
  }
  
  .sidebar-open {
    transform: translateX(0);
  }
  
  .service-card-grid {
    grid-template-columns: 1fr;
  }
  
  .header-center {
    display: none;
  }
}
```

### 모바일 최적화
- 터치 친화적인 버튼 크기 (최소 44px)
- 스와이프 제스처 지원
- 모바일 네비게이션 패턴
- 적절한 폰트 크기 및 라인 높이

## 8. 접근성 (Accessibility)

### ARIA 지원
```typescript
// 모든 인터랙티브 요소에 적절한 ARIA 속성 추가
<button
  aria-label="메뉴 열기"
  aria-expanded={isOpen}
  aria-haspopup="true"
>
  <Menu size={20} />
</button>

// 상태 변화 알림
<div 
  role="alert" 
  aria-live="polite"
  aria-atomic="true"
>
  {statusMessage}
</div>
```

### 키보드 네비게이션
- Tab 순서 논리적 구성
- Focus 표시 명확히
- Escape 키로 모달 닫기
- Enter/Space로 버튼 활성화

## 9. 성능 최적화

### 컴포넌트 최적화
```typescript
// React.memo를 사용한 불필요한 리렌더링 방지
const OptimizedCard = React.memo<CardProps>(({ data }) => {
  return <Card {...data} />;
});

// useMemo로 비용이 큰 계산 최적화
const expensiveValue = useMemo(() => {
  return heavyCalculation(props.data);
}, [props.data]);

// useCallback으로 함수 재생성 방지
const handleClick = useCallback(() => {
  onAction(item.id);
}, [item.id, onAction]);
```

### 이미지 최적화
```typescript
// 지연 로딩 이미지 컴포넌트
const OptimizedImage: React.FC<ImageProps> = ({ src, alt, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef} className="optimized-image-container">
      {loaded ? (
        <img src={src} alt={alt} {...props} />
      ) : (
        <Skeleton variant="rectangular" width="100%" height="100%" />
      )}
    </div>
  );
};
```

이러한 UI 컴포넌트들이 MarketingPlat의 일관되고 사용자 친화적인 인터페이스를 구성하며, 재사용 가능하고 확장 가능한 디자인 시스템을 제공합니다.
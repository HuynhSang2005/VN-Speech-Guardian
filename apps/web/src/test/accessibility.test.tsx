/**
 * Accessibility Tests - VN Speech Guardian
 * Comprehensive a11y testing cho WCAG compliance và screen reader support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend expect với axe matchers
expect.extend(toHaveNoViolations);

// Mock components for accessibility testing
const Button = ({ children, ...props }: any) => (
  <button {...props}>{children}</button>
);

const Input = ({ label, ...props }: any) => (
  <div>
    <label htmlFor={props.id}>{label}</label>
    <input {...props} />
  </div>
);

const Card = ({ children, ...props }: any) => (
  <div role="region" {...props}>{children}</div>
);

const Dialog = ({ children, isOpen, onClose, title, ...props }: any) => (
  isOpen ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      {...props}
    >
      <h2 id="dialog-title">{title}</h2>
      {children}
      <button onClick={onClose} aria-label="Close dialog">×</button>
    </div>
  ) : null
);

const Alert = ({ children, type = 'info', ...props }: any) => (
  <div
    role="alert"
    aria-live="polite"
    className={`alert alert-${type}`}
    {...props}
  >
    {children}
  </div>
);

const Form = ({ children, onSubmit, ...props }: any) => (
  <form onSubmit={onSubmit} {...props}>
    {children}
  </form>
);

// =============================================================================
// Basic Accessibility Tests
// =============================================================================

describe('Basic Accessibility Compliance', () => {
  it('has no accessibility violations in button component', async () => {
    const { container } = render(
      <Button>Click me</Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in form components', async () => {
    const { container } = render(
      <Form>
        <Input
          id="email"
          type="email"
          label="Email Address"
          required
          aria-describedby="email-help"
        />
        <div id="email-help">Enter your email address</div>
        
        <Input
          id="password"
          type="password"
          label="Password"
          required
          aria-describedby="password-help"
        />
        <div id="password-help">Password must be at least 8 characters</div>
        
        <Button type="submit">Submit</Button>
      </Form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in dialog component', async () => {
    const { container } = render(
      <div>
        <Button>Open Dialog</Button>
        <Dialog
          isOpen={true}
          title="Confirmation Dialog"
          onClose={() => {}}
        >
          <p>Are you sure you want to delete this item?</p>
          <div>
            <Button>Cancel</Button>
            <Button>Delete</Button>
          </div>
        </Dialog>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in complex layout', async () => {
    const { container } = render(
      <div>
        <header role="banner">
          <h1>VN Speech Guardian</h1>
          <nav role="navigation" aria-label="Main navigation">
            <ul>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/sessions">Sessions</a></li>
              <li><a href="/settings">Settings</a></li>
            </ul>
          </nav>
        </header>
        
        <main role="main">
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading">Overview</h2>
            <Card>
              <p>Welcome to your dashboard</p>
            </Card>
          </section>
          
          <section aria-labelledby="actions-heading">
            <h2 id="actions-heading">Quick Actions</h2>
            <div role="group" aria-labelledby="actions-heading">
              <Button>Start Recording</Button>
              <Button>View Reports</Button>
            </div>
          </section>
        </main>
        
        <footer role="contentinfo">
          <p>&copy; 2025 VN Speech Guardian</p>
        </footer>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// =============================================================================
// Keyboard Navigation Tests
// =============================================================================

describe('Keyboard Navigation', () => {
  it('supports tab navigation through interactive elements', async () => {
    const user = userEvent.setup();
    
    render(
      <div>
        <Button data-testid="button1">First Button</Button>
        <Input id="input1" label="Input Field" data-testid="input1" />
        <Button data-testid="button2">Second Button</Button>
        <a href="#" data-testid="link1">Link</a>
      </div>
    );

    // Tab through elements
    await user.tab();
    expect(screen.getByTestId('button1')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('input1')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('button2')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('link1')).toHaveFocus();

    // Shift+Tab should go backwards
    await user.tab({ shift: true });
    expect(screen.getByTestId('button2')).toHaveFocus();
  });

  it('supports Enter and Space key activation for buttons', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Test Button</Button>);

    const button = screen.getByRole('button');
    button.focus();

    // Enter key should activate button
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Space key should activate button
    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('supports Escape key for closing dialogs', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    
    render(
      <Dialog
        isOpen={true}
        title="Test Dialog"
        onClose={handleClose}
      >
        <p>Dialog content</p>
        <Button>Action</Button>
      </Dialog>
    );

    // Escape key should close dialog
    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('manages focus trap in modal dialogs', async () => {
    const user = userEvent.setup();
    
    render(
      <div>
        <Button data-testid="outside-button">Outside Button</Button>
        <Dialog
          isOpen={true}
          title="Focus Trap Dialog"
          onClose={() => {}}
        >
          <p>Dialog content</p>
          <Button data-testid="dialog-button1">Button 1</Button>
          <Button data-testid="dialog-button2">Button 2</Button>
        </Dialog>
      </div>
    );

    // Focus should be trapped within dialog
    const dialogButton1 = screen.getByTestId('dialog-button1');
    const dialogButton2 = screen.getByTestId('dialog-button2');
    const closeButton = screen.getByLabelText('Close dialog');

    // Tab through dialog elements
    await user.tab();
    expect(dialogButton1).toHaveFocus();

    await user.tab();
    expect(dialogButton2).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    // Next tab should wrap back to first element
    await user.tab();
    expect(dialogButton1).toHaveFocus();
  });
});

// =============================================================================
// Screen Reader Support Tests
// =============================================================================

describe('Screen Reader Support', () => {
  it('provides proper labels and descriptions', () => {
    render(
      <div>
        <Input
          id="username"
          label="Username"
          aria-describedby="username-help username-error"
          required
        />
        <div id="username-help">Enter your username (3-20 characters)</div>
        <div id="username-error" role="alert">Username is required</div>
        
        <Button
          aria-label="Submit form"
          aria-describedby="submit-help"
        >
          Submit
        </Button>
        <div id="submit-help">Click to submit the form</div>
      </div>
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'username-help username-error');
    expect(input).toHaveAttribute('required');

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Submit form');
    expect(button).toHaveAttribute('aria-describedby', 'submit-help');

    expect(screen.getByRole('alert')).toHaveTextContent('Username is required');
  });

  it('announces live region updates', async () => {
    function TestLiveRegion() {
      const [message, setMessage] = React.useState('');
      const [count, setCount] = React.useState(0);

      return (
        <div>
          <Button
            onClick={() => {
              setCount(c => c + 1);
              setMessage(`Button clicked ${count + 1} times`);
            }}
          >
            Click me ({count})
          </Button>
          
          <div
            aria-live="polite"
            aria-atomic="true"
            data-testid="live-region"
          >
            {message}
          </div>
          
          <Alert type="error">
            This is an error message that should be announced immediately
          </Alert>
        </div>
      );
    }

    const user = userEvent.setup();
    render(<TestLiveRegion />);

    const button = screen.getByRole('button');
    const liveRegion = screen.getByTestId('live-region');

    await user.click(button);

    expect(liveRegion).toHaveTextContent('Button clicked 1 times');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('provides proper headings hierarchy', () => {
    render(
      <div>
        <h1>Main Page Title</h1>
        <section>
          <h2>Section Title</h2>
          <article>
            <h3>Article Title</h3>
            <h4>Subsection</h4>
          </article>
        </section>
        <section>
          <h2>Another Section</h2>
          <h3>Subsection Title</h3>
        </section>
      </div>
    );

    // Check heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(6);

    expect(headings[0]).toHaveProperty('tagName', 'H1');
    expect(headings[1]).toHaveProperty('tagName', 'H2');
    expect(headings[2]).toHaveProperty('tagName', 'H3');
    expect(headings[3]).toHaveProperty('tagName', 'H4');
    expect(headings[4]).toHaveProperty('tagName', 'H2');
    expect(headings[5]).toHaveProperty('tagName', 'H3');
  });

  it('supports landmark navigation', () => {
    render(
      <div>
        <header role="banner">
          <h1>Site Header</h1>
        </header>
        
        <nav role="navigation" aria-label="Main navigation">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
          </ul>
        </nav>
        
        <main role="main">
          <h1>Main Content</h1>
        </main>
        
        <aside role="complementary" aria-label="Sidebar">
          <h2>Related Links</h2>
        </aside>
        
        <footer role="contentinfo">
          <p>Footer content</p>
        </footer>
      </div>
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});

// =============================================================================
// Color Contrast and Visual Accessibility Tests
// =============================================================================

describe('Visual Accessibility', () => {
  it('maintains focus visibility', async () => {
    const user = userEvent.setup();
    
    render(
      <div>
        <Button
          data-testid="button"
          style={{
            ':focus': {
              outline: '2px solid #007acc',
              outlineOffset: '2px',
            }
          }}
        >
          Focusable Button
        </Button>
        <Input
          id="input"
          label="Input Field"
          data-testid="input"
        />
      </div>
    );

    // Focus button
    const button = screen.getByTestId('button');
    await user.tab();
    expect(button).toHaveFocus();

    // Focus input
    const input = screen.getByTestId('input');
    await user.tab();
    expect(input).toHaveFocus();
  });

  it('provides text alternatives for images and icons', () => {
    render(
      <div>
        <img
          src="/logo.png"
          alt="VN Speech Guardian Logo"
          width="100"
          height="50"
        />
        
        <button aria-label="Close dialog">
          <span aria-hidden="true">×</span>
        </button>
        
        <div role="img" aria-label="Audio waveform visualization">
          <svg viewBox="0 0 100 50">
            <path d="M0,25 Q25,5 50,25 T100,25" stroke="currentColor" fill="none" />
          </svg>
        </div>
      </div>
    );

    const logo = screen.getByAltText('VN Speech Guardian Logo');
    expect(logo).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close dialog' });
    expect(closeButton).toBeInTheDocument();

    const waveform = screen.getByRole('img', { name: 'Audio waveform visualization' });
    expect(waveform).toBeInTheDocument();
  });

  it('supports reduced motion preferences', () => {
    // Mock prefers-reduced-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    function TestMotionPreference() {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      return (
        <div
          data-testid="animated-element"
          className={prefersReducedMotion ? 'no-animation' : 'with-animation'}
          style={{
            transition: prefersReducedMotion ? 'none' : 'transform 0.3s ease',
          }}
        >
          Animated Content
        </div>
      );
    }

    render(<TestMotionPreference />);

    const element = screen.getByTestId('animated-element');
    expect(element).toHaveClass('no-animation');
    expect(element).toHaveStyle({ transition: 'none' });
  });
});

// =============================================================================
// Form Accessibility Tests
// =============================================================================

describe('Form Accessibility', () => {
  it('provides proper form validation feedback', async () => {
    const user = userEvent.setup();
    
    function TestForm() {
      const [errors, setErrors] = React.useState<Record<string, string>>({});

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const email = formData.get('email') as string;
        
        const newErrors: Record<string, string> = {};
        if (!email) {
          newErrors.email = 'Email is required';
        } else if (!email.includes('@')) {
          newErrors.email = 'Please enter a valid email';
        }
        
        setErrors(newErrors);
      };

      return (
        <Form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <div
                id="email-error"
                role="alert"
                aria-live="polite"
              >
                {errors.email}
              </div>
            )}
          </div>
          
          <Button type="submit">Submit</Button>
        </Form>
      );
    }

    render(<TestForm />);

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await user.click(submitButton);

    // Error should be announced
    const errorMessage = await screen.findByRole('alert');
    expect(errorMessage).toHaveTextContent('Email is required');

    const emailInput = screen.getByRole('textbox');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
  });

  it('groups related form controls', () => {
    render(
      <Form>
        <fieldset>
          <legend>Contact Information</legend>
          
          <Input id="firstName" label="First Name" required />
          <Input id="lastName" label="Last Name" required />
          <Input id="email" label="Email" type="email" required />
        </fieldset>
        
        <fieldset>
          <legend>Preferences</legend>
          
          <div role="group" aria-labelledby="notification-legend">
            <div id="notification-legend">Notification Settings</div>
            
            <label>
              <input type="checkbox" name="notifications" value="email" />
              Email notifications
            </label>
            
            <label>
              <input type="checkbox" name="notifications" value="sms" />
              SMS notifications
            </label>
          </div>
        </fieldset>
      </Form>
    );

    const fieldsets = screen.getAllByRole('group');
    expect(fieldsets).toHaveLength(3); // 2 fieldsets + 1 checkbox group

    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Notification Settings')).toBeInTheDocument();
  });
});

// =============================================================================
// Speech Guardian Specific Accessibility Tests
// =============================================================================

describe('VN Speech Guardian Accessibility', () => {
  it('provides accessible audio controls', async () => {
    const user = userEvent.setup();
    
    function AudioControls() {
      const [isRecording, setIsRecording] = React.useState(false);
      const [volume, setVolume] = React.useState(50);

      return (
        <div role="region" aria-labelledby="audio-controls-heading">
          <h2 id="audio-controls-heading">Audio Controls</h2>
          
          <button
            onClick={() => setIsRecording(!isRecording)}
            aria-pressed={isRecording}
            aria-describedby="record-status"
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          
          <div
            id="record-status"
            aria-live="polite"
            aria-atomic="true"
          >
            Status: {isRecording ? 'Recording' : 'Stopped'}
          </div>
          
          <div>
            <label htmlFor="volume-slider">Volume</label>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-valuetext={`${volume} percent`}
            />
            <output htmlFor="volume-slider" aria-live="polite">
              {volume}%
            </output>
          </div>
        </div>
      );
    }

    render(<AudioControls />);

    const recordButton = screen.getByRole('button');
    expect(recordButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(recordButton);
    expect(recordButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Status: Recording')).toBeInTheDocument();

    const volumeSlider = screen.getByRole('slider');
    expect(volumeSlider).toHaveAttribute('aria-valuetext', '50 percent');
  });

  it('provides accessible transcript display', () => {
    const transcriptData = [
      {
        id: '1',
        text: 'Hello, this is a test transcript.',
        timestamp: '00:00:01',
        confidence: 0.95,
        detection: null,
      },
      {
        id: '2',
        text: 'This contains harmful content.',
        timestamp: '00:00:05',
        confidence: 0.87,
        detection: {
          type: 'offensive',
          severity: 'high',
          confidence: 0.92,
        },
      },
    ];

    render(
      <div role="region" aria-labelledby="transcript-heading">
        <h2 id="transcript-heading">Live Transcript</h2>
        
        <div
          role="log"
          aria-live="polite"
          aria-label="Speech transcript"
          data-testid="transcript-container"
        >
          {transcriptData.map(segment => (
            <div
              key={segment.id}
              className={segment.detection ? 'highlighted-content' : ''}
              aria-describedby={segment.detection ? `detection-${segment.id}` : undefined}
            >
              <span className="timestamp" aria-label={`Timestamp ${segment.timestamp}`}>
                {segment.timestamp}
              </span>
              <span className="text">{segment.text}</span>
              
              {segment.detection && (
                <div
                  id={`detection-${segment.id}`}
                  role="alert"
                  aria-label={`Content warning: ${segment.detection.type} content detected`}
                >
                  ⚠️ {segment.detection.type} content detected
                  (confidence: {Math.round(segment.detection.confidence * 100)}%)
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );

    const transcript = screen.getByTestId('transcript-container');
    expect(transcript).toHaveAttribute('role', 'log');
    expect(transcript).toHaveAttribute('aria-live', 'polite');
    expect(transcript).toHaveAttribute('aria-label', 'Speech transcript');

    const detectionAlert = screen.getByRole('alert');
    expect(detectionAlert).toHaveTextContent('offensive content detected');
    expect(detectionAlert).toHaveAttribute('aria-label', 'Content warning: offensive content detected');
  });

  it('provides accessible dashboard with stats', () => {
    const statsData = {
      totalSessions: 150,
      totalMinutes: 2400,
      safetyScore: 95,
      activeUsers: 12,
    };

    render(
      <div role="main" aria-labelledby="dashboard-heading">
        <h1 id="dashboard-heading">Dashboard</h1>
        
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading">Statistics Overview</h2>
          
          <div role="group" aria-labelledby="stats-heading">
            <div role="text" aria-label={`Total sessions: ${statsData.totalSessions}`}>
              <span aria-hidden="true">📊</span>
              <span>Total Sessions</span>
              <span>{statsData.totalSessions}</span>
            </div>
            
            <div role="text" aria-label={`Total minutes: ${statsData.totalMinutes}`}>
              <span aria-hidden="true">⏱️</span>
              <span>Total Minutes</span>
              <span>{statsData.totalMinutes.toLocaleString()}</span>
            </div>
            
            <div role="text" aria-label={`Safety score: ${statsData.safetyScore} percent`}>
              <span aria-hidden="true">🛡️</span>
              <span>Safety Score</span>
              <span>{statsData.safetyScore}%</span>
            </div>
            
            <div role="text" aria-label={`Active users: ${statsData.activeUsers}`}>
              <span aria-hidden="true">👥</span>
              <span>Active Users</span>
              <span>{statsData.activeUsers}</span>
            </div>
          </div>
        </section>
        
        <section aria-labelledby="actions-heading">
          <h2 id="actions-heading">Quick Actions</h2>
          
          <div role="group" aria-labelledby="actions-heading">
            <Button aria-describedby="start-recording-help">
              Start New Recording
            </Button>
            <div id="start-recording-help" className="sr-only">
              Begin a new speech recording session
            </div>
            
            <Button aria-describedby="view-reports-help">
              View Reports
            </Button>
            <div id="view-reports-help" className="sr-only">
              Access detailed analytics and reports
            </div>
          </div>
        </section>
      </div>
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('text', { name: 'Total sessions: 150' })).toBeInTheDocument();
    expect(screen.getByRole('text', { name: 'Safety score: 95 percent' })).toBeInTheDocument();
    
    const startButton = screen.getByRole('button', { name: 'Start New Recording' });
    expect(startButton).toHaveAttribute('aria-describedby', 'start-recording-help');
  });
});
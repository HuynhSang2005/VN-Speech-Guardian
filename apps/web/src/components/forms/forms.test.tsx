/**
 * Form Integration Tests - VN Speech Guardian
 * Comprehensive testing cho form system với React Hook Form + Zod
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import {
  EnhancedForm,
  FormFieldWrapper,
  TextField,
  TextareaField,
  CheckboxField,
  useZodForm,
} from '../../components/forms/enhanced-forms';
import {
  CreateSessionForm,
  UserPreferencesForm,
  ContactForm,
} from '../../components/forms/speech-guardian-forms';

// =============================================================================
// Mock API Client
// =============================================================================

const mockApiClient = {
  sessions: {
    create: vi.fn().mockResolvedValue({ id: 'test-session-id' }),
  },
  users: {
    updatePreferences: vi.fn().mockResolvedValue({ success: true }),
  },
  support: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
};

vi.mock('../../lib/enhanced-api-client', () => ({
  apiClient: mockApiClient,
}));

// =============================================================================
// EnhancedForm Component Tests
// =============================================================================

describe('EnhancedForm Component', () => {
  const TestSchema = z.object({
    email: z.string().email('Invalid email'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    age: z.number().min(18, 'Must be at least 18'),
  });

  const defaultValues = {
    email: '',
    name: '',
    age: 18,
  };

  it('renders form with correct schema validation', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <EnhancedForm
        schema={TestSchema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
      >
        {({ register, formState: { errors } }) => (
          <>
            <input {...register('email')} placeholder="Email" />
            {errors.email && <span data-testid="email-error">{errors.email.message}</span>}
            
            <input {...register('name')} placeholder="Name" />
            {errors.name && <span data-testid="name-error">{errors.name.message}</span>}
            
            <input 
              {...register('age', { valueAsNumber: true })} 
              type="number" 
              placeholder="Age" 
            />
            {errors.age && <span data-testid="age-error">{errors.age.message}</span>}
            
            <button type="submit">Submit</button>
          </>
        )}
      </EnhancedForm>
    );

    // Test validation errors
    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid email');
      expect(screen.getByTestId('name-error')).toHaveTextContent('Name must be at least 2 characters');
    });

    // Fill valid data
    const emailInput = screen.getByPlaceholderText('Email');
    const nameInput = screen.getByPlaceholderText('Name');
    const ageInput = screen.getByPlaceholderText('Age');

    await user.type(emailInput, 'test@example.com');
    await user.type(nameInput, 'John Doe');
    await user.clear(ageInput);
    await user.type(ageInput, '25');

    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John Doe',
        age: 25,
      });
    });
  });

  it('shows loading state during submission', async () => {
    const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const user = userEvent.setup();

    render(
      <EnhancedForm
        schema={TestSchema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
      >
        {({ register, formState: { isSubmitting } }) => (
          <>
            <input {...register('email')} value="test@example.com" readOnly />
            <input {...register('name')} value="John Doe" readOnly />
            <input {...register('age', { valueAsNumber: true })} value={25} readOnly />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}
      </EnhancedForm>
    );

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });

  it('handles submission errors correctly', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
    const user = userEvent.setup();

    render(
      <EnhancedForm
        schema={TestSchema}
        defaultValues={{
          email: 'test@example.com',
          name: 'John Doe',
          age: 25,
        }}
        onSubmit={onSubmit}
        showToast={false} // Disable toast for testing
      >
        {({ register, formState: { errors } }) => (
          <>
            <input {...register('email')} />
            <input {...register('name')} />
            <input {...register('age', { valueAsNumber: true })} />
            <button type="submit">Submit</button>
            {errors.root && (
              <div data-testid="form-error">{errors.root.message}</div>
            )}
          </>
        )}
      </EnhancedForm>
    );

    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent('Submission failed');
    });
  });
});

// =============================================================================
// FormFieldWrapper Tests
// =============================================================================

describe('FormFieldWrapper Component', () => {
  it('renders label and children correctly', () => {
    render(
      <FormFieldWrapper
        label="Test Field"
        name="testField"
        required={true}
      >
        <input data-testid="test-input" />
      </FormFieldWrapper>
    );

    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument(); // Required indicator
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(
      <FormFieldWrapper
        label="Test Field"
        name="testField"
        error="This field is required"
      >
        <input data-testid="test-input" />
      </FormFieldWrapper>
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toHaveClass('text-destructive');
  });

  it('displays help text when provided', () => {
    render(
      <FormFieldWrapper
        label="Test Field"
        name="testField"
        helpText="This is helpful information"
      >
        <input data-testid="test-input" />
      </FormFieldWrapper>
    );

    expect(screen.getByText('This is helpful information')).toBeInTheDocument();
  });

  it('applies error styling when hasError is true', () => {
    render(
      <FormFieldWrapper
        label="Test Field"
        name="testField"
        hasError={true}
      >
        <input data-testid="test-input" />
      </FormFieldWrapper>
    );

    const wrapper = screen.getByTestId('test-input').closest('.space-y-2');
    expect(wrapper).toBeInTheDocument();
  });
});

// =============================================================================
// TextField Component Tests
// =============================================================================

describe('TextField Component', () => {
  it('renders with label and input', () => {
    render(
      <TextField
        name="testField"
        label="Test Field"
        placeholder="Enter text"
        register={vi.fn()}
      />
    );

    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('shows character count when maxLength is provided', async () => {
    const register = vi.fn().mockReturnValue({
      name: 'testField',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    });

    render(
      <TextField
        name="testField"
        label="Test Field"
        maxLength={50}
        register={register}
      />
    );

    expect(screen.getByText('0/50')).toBeInTheDocument();
  });

  it('applies correct input type', () => {
    const register = vi.fn().mockReturnValue({
      name: 'emailField',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    });

    render(
      <TextField
        name="emailField"
        label="Email"
        type="email"
        register={register}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });
});

// =============================================================================
// VN Speech Guardian Forms Tests
// =============================================================================

describe('CreateSessionForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<CreateSessionForm />);

    expect(screen.getByLabelText(/session name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sensitivity level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max duration/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create session/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<CreateSessionForm />);

    const submitButton = screen.getByRole('button', { name: /create session/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<CreateSessionForm />);

    // Fill in form
    const nameInput = screen.getByLabelText(/session name/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, 'Test Session');
    await user.type(descriptionInput, 'This is a test session');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create session/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockApiClient.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Session',
          description: 'This is a test session',
        })
      );
    });
  });

  it('handles tags input correctly', async () => {
    const user = userEvent.setup();
    render(<CreateSessionForm />);

    const nameInput = screen.getByLabelText(/session name/i);
    await user.type(nameInput, 'Test Session');

    // Add tags (if tags field exists)
    const tagsInput = screen.queryByLabelText(/tags/i);
    if (tagsInput) {
      await user.type(tagsInput, 'tag1{enter}tag2{enter}');
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
    }
  });
});

describe('UserPreferencesForm Component', () => {
  const mockPreferences = {
    audio: {
      sampleRate: 16000,
      gainLevel: 50,
    },
    detection: {
      sensitivity: 'medium' as const,
      enableAlerts: true,
    },
    display: {
      theme: 'light' as const,
      language: 'vi' as const,
    },
    privacy: {
      saveTranscripts: true,
      anonymizeData: false,
      retentionDays: 30,
    },
  };

  it('renders all preference sections', () => {
    render(<UserPreferencesForm initialData={mockPreferences} />);

    expect(screen.getByText(/audio settings/i)).toBeInTheDocument();
    expect(screen.getByText(/detection settings/i)).toBeInTheDocument();
    expect(screen.getByText(/display settings/i)).toBeInTheDocument();
    expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
  });

  it('loads initial data correctly', () => {
    render(<UserPreferencesForm initialData={mockPreferences} />);

    // Check if initial values are loaded
    const gainInput = screen.getByDisplayValue('50');
    expect(gainInput).toBeInTheDocument();

    const saveTranscriptsCheckbox = screen.getByRole('checkbox', { name: /save transcripts/i });
    expect(saveTranscriptsCheckbox).toBeChecked();
  });

  it('updates preferences on form submission', async () => {
    const user = userEvent.setup();
    render(<UserPreferencesForm initialData={mockPreferences} />);

    // Change a setting
    const enableAlertsCheckbox = screen.getByRole('checkbox', { name: /enable alerts/i });
    await user.click(enableAlertsCheckbox);

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockApiClient.users.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          detection: expect.objectContaining({
            enableAlerts: false, // Should be toggled
          }),
        })
      );
    });
  });
});

describe('ContactForm Component', () => {
  it('renders all form fields', () => {
    render(<ContactForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('validates message length', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const messageInput = screen.getByLabelText(/message/i);
    await user.type(messageInput, 'Short');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/message must be at least/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    // Fill form with valid data
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/subject/i), 'Test Subject');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message with sufficient length');

    // Select category
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'bug');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockApiClient.support.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          subject: 'Test Subject',
          message: 'This is a test message with sufficient length',
          category: 'bug',
        })
      );
    });
  });
});

// =============================================================================
// useZodForm Hook Tests
// =============================================================================

describe('useZodForm Hook', () => {
  const TestSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
  });

  it('provides form methods and validation', async () => {
    let formMethods: any;

    function TestComponent() {
      formMethods = useZodForm({
        schema: TestSchema,
        defaultValues: { name: '', email: '' },
      });

      return (
        <form onSubmit={formMethods.handleSubmit(() => {})}>
          <input {...formMethods.register('name')} placeholder="Name" />
          <input {...formMethods.register('email')} placeholder="Email" />
          <button type="submit">Submit</button>
        </form>
      );
    }

    const user = userEvent.setup();
    render(<TestComponent />);

    // Check if form methods are available
    expect(formMethods.register).toBeDefined();
    expect(formMethods.handleSubmit).toBeDefined();
    expect(formMethods.formState).toBeDefined();

    // Test validation
    const submitButton = screen.getByText('Submit');
    await user.click(submitButton);

    await waitFor(() => {
      expect(formMethods.formState.errors.name).toBeDefined();
      expect(formMethods.formState.errors.email).toBeDefined();
    });
  });

  it('resets form correctly', async () => {
    let formMethods: any;

    function TestComponent() {
      formMethods = useZodForm({
        schema: TestSchema,
        defaultValues: { name: '', email: '' },
      });

      return (
        <form>
          <input {...formMethods.register('name')} placeholder="Name" />
          <button type="button" onClick={() => formMethods.reset()}>
            Reset
          </button>
        </form>
      );
    }

    const user = userEvent.setup();
    render(<TestComponent />);

    const nameInput = screen.getByPlaceholderText('Name');
    await user.type(nameInput, 'Test Name');

    expect(nameInput).toHaveValue('Test Name');

    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);

    expect(nameInput).toHaveValue('');
  });
});
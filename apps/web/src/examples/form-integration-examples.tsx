/**
 * Form Integration System Examples - VN Speech Guardian
 * Comprehensive examples showcasing form system capabilities
 */

import React from 'react';
import { 
  CreateSessionForm,
  UserPreferencesForm,
  ContactForm,
  EnhancedForm,
  TextField,
  TextareaField,
  CheckboxField,
  useZodForm
} from '../forms/forms-index';
import { CreateSessionSchema } from '../../schemas/forms';
import type { CreateSessionFormData } from '../../schemas/forms';
import { toast } from 'sonner';

// =============================================================================
// Example 1: Create Session Form Usage
// =============================================================================

export function CreateSessionExample() {
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (data: CreateSessionFormData) => {
    setLoading(true);
    try {
      // Simulate API call
      console.log('Creating session with data:', data);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Session "${data.name}" created successfully!`);
      
      // Navigate to session or update state
      // router.push(`/sessions/${newSessionId}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error: any) => {
    console.error('Form validation error:', error);
    toast.error('Please fix the form errors and try again.');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-4 mb-8">
        <h1 className="text-2xl font-bold">Create New Session</h1>
        <p className="text-muted-foreground">
          Set up a new speech monitoring session with your preferred settings.
        </p>
      </div>

      <CreateSessionForm
        onSubmit={handleSubmit}
        onError={handleError}
        loading={loading}
      />
    </div>
  );
}

// =============================================================================
// Example 2: User Preferences Form Usage
// =============================================================================

export function UserPreferencesExample() {
  const [loading, setLoading] = React.useState(false);
  
  // Simulate loading current user preferences
  const [initialData, setInitialData] = React.useState(null);
  
  React.useEffect(() => {
    // Load user preferences from API
    const loadPreferences = async () => {
      try {
        // const preferences = await api.getUserPreferences();
        // setInitialData(preferences);
        
        // Mock data for example
        setInitialData({
          audioSampleRate: '16000',
          audioGainLevel: 75,
          defaultSensitivity: 'high',
          enableRealTimeAlerts: true,
          alertSoundEnabled: false,
          theme: 'dark',
          language: 'vi',
          showConfidenceScores: true,
          saveTranscripts: true,
          anonymizeData: true,
          dataRetentionDays: 90,
        });
      } catch (error) {
        console.error('Failed to load preferences:', error);
        toast.error('Failed to load current preferences');
      }
    };
    
    loadPreferences();
  }, []);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      console.log('Updating user preferences:', data);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Preferences updated successfully!');
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!initialData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-4 mb-8">
        <h1 className="text-2xl font-bold">User Preferences</h1>
        <p className="text-muted-foreground">
          Customize your VN Speech Guardian experience with these settings.
        </p>
      </div>

      <UserPreferencesForm
        onSubmit={handleSubmit}
        initialData={initialData}
        loading={loading}
      />
    </div>
  );
}

// =============================================================================
// Example 3: Contact Form Usage  
// =============================================================================

export function ContactFormExample() {
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      console.log('Sending contact form:', data);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Message sent successfully! We\'ll get back to you soon.');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-4 mb-8">
        <h1 className="text-2xl font-bold">Contact Us</h1>
        <p className="text-muted-foreground">
          Have questions or feedback? We'd love to hear from you!
        </p>
      </div>

      <ContactForm
        onSubmit={handleSubmit}
        loading={loading}
      />
      
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Other ways to reach us:</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Email: support@vnspeechguardian.com</li>
          <li>• Documentation: docs.vnspeechguardian.com</li>
          <li>• Community: github.com/vn-speech-guardian/discussions</li>
        </ul>
      </div>
    </div>
  );
}

// =============================================================================
// Example 4: Custom Form với EnhancedForm
// =============================================================================

export function CustomFormExample() {
  // Custom form với direct EnhancedForm usage
  const handleSubmit = async (data: CreateSessionFormData) => {
    console.log('Custom form data:', data);
    toast.success('Custom form submitted!');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-4 mb-8">
        <h1 className="text-2xl font-bold">Custom Form Example</h1>
        <p className="text-muted-foreground">
          Example of building custom forms với EnhancedForm component.
        </p>
      </div>

      <EnhancedForm
        schema={CreateSessionSchema}
        onSubmit={handleSubmit}
        resetOnSuccess={true}
        variant="card"
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <TextField
              name="name"
              label="Session Name"
              placeholder="Enter session name..."
              required
            />
            
            <TextareaField
              name="description"
              label="Description"
              placeholder="Optional description..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Settings</h3>
            
            <CheckboxField
              name="autoStartRecording"
              label="Auto-start recording"
              description="Begin recording automatically when session starts"
            />
          </div>
        </div>
      </EnhancedForm>
    </div>
  );
}

// =============================================================================
// Example 5: Form với useZodForm hook
// =============================================================================

export function ZodFormHookExample() {
  const form = useZodForm(CreateSessionSchema, {
    name: '',
    autoStartRecording: false,
    maxDurationMinutes: 30,
    sensitivity: 'medium',
  });

  const handleSubmit = async (data: CreateSessionFormData) => {
    console.log('Zod form data:', data);
    toast.success('Form submitted with useZodForm hook!');
    form.reset();
  };

  const { formState: { errors, isSubmitting } } = form;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-4 mb-8">
        <h1 className="text-2xl font-bold">useZodForm Hook Example</h1>
        <p className="text-muted-foreground">
          Direct usage of useZodForm hook for complete control.
        </p>
      </div>

      <form 
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 bg-card p-6 rounded-lg border"
      >
        <div>
          <label className="block text-sm font-medium mb-2">
            Session Name *
          </label>
          <input
            {...form.register('name')}
            type="text"
            placeholder="Enter session name..."
            className="w-full px-3 py-2 border border-input rounded-md"
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              {...form.register('autoStartRecording')}
              type="checkbox"
              className="rounded"
            />
            <span className="text-sm">Auto-start recording</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

// =============================================================================
// Example 6: Form Integration Demo Page
// =============================================================================

export function FormIntegrationDemo() {
  const [activeExample, setActiveExample] = React.useState('create-session');

  const examples = [
    { id: 'create-session', title: 'Create Session Form', component: CreateSessionExample },
    { id: 'user-preferences', title: 'User Preferences', component: UserPreferencesExample },
    { id: 'contact', title: 'Contact Form', component: ContactFormExample },
    { id: 'custom', title: 'Custom Form', component: CustomFormExample },
    { id: 'hook', title: 'useZodForm Hook', component: ZodFormHookExample },
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component || CreateSessionExample;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-4">
          <h1 className="text-3xl font-bold mb-4">Form Integration System Demo</h1>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example.id}
                onClick={() => setActiveExample(example.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeExample === example.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {example.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        <ActiveComponent />
      </div>
    </div>
  );
}
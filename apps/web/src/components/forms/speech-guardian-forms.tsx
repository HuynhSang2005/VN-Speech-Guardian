/**
 * VN Speech Guardian Specific Form Components
 * Production-ready forms với Zod validation và modern UX patterns
 */

import React from 'react';
import { EnhancedForm, TextField, TextareaField, CheckboxField } from './enhanced-forms';
import { CreateSessionSchema, UserPreferencesSchema, ContactFormSchema } from '../../schemas/forms';
import type { CreateSessionFormData, UserPreferencesFormData, ContactFormData } from '../../schemas/forms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FormFieldWrapper } from './enhanced-forms';
import { useFormContext } from 'react-hook-form';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

// =============================================================================
// Create Session Form
// =============================================================================

interface CreateSessionFormProps {
  onSubmit: (data: CreateSessionFormData) => Promise<void>;
  onError?: (error: any) => void;
  loading?: boolean;
  className?: string;
}

export function CreateSessionForm({
  onSubmit,
  onError,
  loading = false,
  className
}: CreateSessionFormProps) {
  const defaultValues: Partial<CreateSessionFormData> = {
    autoStartRecording: false,
    maxDurationMinutes: 30,
    sensitivity: 'medium',
    tags: [],
  };

  return (
    <EnhancedForm
      schema={CreateSessionSchema}
      onSubmit={onSubmit}
      onError={onError}
      defaultValues={defaultValues}
      resetOnSuccess={true}
      loading={loading}
      variant="card"
      size="md"
      className={className}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Session Details</h3>
          
          <TextField
            name="name"
            label="Session Name"
            placeholder="Enter session name..."
            description="A unique name to identify this session"
            required
          />
          
          <TextareaField
            name="description"
            label="Description"
            placeholder="Optional session description..."
            description="Describe the purpose or context of this session"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configuration</h3>
          
          <SensitivitySelectField />
          
          <DurationSelectField />
          
          <CheckboxField
            name="autoStartRecording"
            label="Auto-start recording"
            description="Automatically begin recording when the session starts"
          />
        </div>

        <TagsInputField />
      </div>
    </EnhancedForm>
  );
}

// Supporting field components for CreateSessionForm
function SensitivitySelectField() {
  const { setValue, watch } = useFormContext<CreateSessionFormData>();
  const value = watch('sensitivity');

  const sensitivityOptions = [
    { value: 'low', label: 'Low - Less sensitive detection', badge: 'Low' },
    { value: 'medium', label: 'Medium - Balanced detection', badge: 'Med' },
    { value: 'high', label: 'High - More sensitive detection', badge: 'High' },
  ];

  return (
    <FormFieldWrapper
      name="sensitivity"
      label="Detection Sensitivity"
      description="How sensitive the speech detection should be"
    >
      <Select value={value} onValueChange={(val: string) => setValue('sensitivity', val as any)}>
        <SelectTrigger>
          <SelectValue placeholder="Select sensitivity level..." />
        </SelectTrigger>
        <SelectContent>
          {sensitivityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center justify-between w-full">
                <span>{option.label}</span>
                <Badge variant="outline" className="ml-2">
                  {option.badge}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  );
}

function DurationSelectField() {
  const { setValue, watch } = useFormContext<CreateSessionFormData>();
  const value = watch('maxDurationMinutes');

  const durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
  ];

  return (
    <FormFieldWrapper
      name="maxDurationMinutes"
      label="Maximum Duration"
      description="Automatic session timeout duration"
    >
      <Select 
        value={String(value)} 
        onValueChange={(val: string) => setValue('maxDurationMinutes', parseInt(val))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select duration..." />
        </SelectTrigger>
        <SelectContent>
          {durationOptions.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  );
}

function TagsInputField() {
  const { setValue, watch } = useFormContext<CreateSessionFormData>();
  const tags = watch('tags') || [];

  const [inputValue, setInputValue] = React.useState('');

  const addTag = () => {
    if (inputValue.trim() && !tags.includes(inputValue.trim()) && tags.length < 10) {
      setValue('tags', [...tags, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <FormFieldWrapper
      name="tags"
      label="Tags"
      description="Add tags to categorize this session (max 10)"
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
            maxLength={20}
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!inputValue.trim() || tags.length >= 10}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
        
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-xs hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          {tags.length}/10 tags used
        </div>
      </div>
    </FormFieldWrapper>
  );
}

// =============================================================================
// User Preferences Form
// =============================================================================

interface UserPreferencesFormProps {
  onSubmit: (data: UserPreferencesFormData) => Promise<void>;
  onError?: (error: any) => void;
  initialData?: Partial<UserPreferencesFormData>;
  loading?: boolean;
  className?: string;
}

export function UserPreferencesForm({
  onSubmit,
  onError,
  initialData,
  loading = false,
  className
}: UserPreferencesFormProps) {
  const defaultValues: Partial<UserPreferencesFormData> = {
    audioSampleRate: '16000',
    audioGainLevel: 50,
    defaultSensitivity: 'medium',
    enableRealTimeAlerts: true,
    alertSoundEnabled: true,
    theme: 'system',
    language: 'vi',
    showConfidenceScores: false,
    saveTranscripts: true,
    anonymizeData: false,
    dataRetentionDays: 30,
    ...initialData,
  };

  return (
    <EnhancedForm
      schema={UserPreferencesSchema}
      onSubmit={onSubmit}
      onError={onError}
      defaultValues={defaultValues}
      loading={loading}
      variant="card"
      size="lg"
      className={className}
    >
      <div className="space-y-8">
        {/* Audio Settings */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Audio Settings</h3>
          
          <AudioSampleRateField />
          <AudioGainField />
        </section>

        {/* Detection Settings */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Detection Settings</h3>
          
          <DefaultSensitivityField />
          
          <CheckboxField
            name="enableRealTimeAlerts"
            label="Enable real-time alerts"
            description="Show alerts immediately when problematic content is detected"
          />
          
          <CheckboxField
            name="alertSoundEnabled"
            label="Alert sound"
            description="Play sound notifications for alerts"
          />
        </section>

        {/* Display Settings */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Display Settings</h3>
          
          <ThemeSelectField />
          <LanguageSelectField />
          
          <CheckboxField
            name="showConfidenceScores"
            label="Show confidence scores"
            description="Display detection confidence percentages"
          />
        </section>

        {/* Privacy Settings */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Privacy Settings</h3>
          
          <CheckboxField
            name="saveTranscripts"
            label="Save transcripts"
            description="Keep transcripts for review and analysis"
          />
          
          <CheckboxField
            name="anonymizeData"
            label="Anonymize data"
            description="Remove identifying information from saved data"
          />
          
          <DataRetentionField />
        </section>
      </div>
    </EnhancedForm>
  );
}

// Supporting components for UserPreferencesForm
function AudioSampleRateField() {
  const { setValue, watch } = useFormContext<UserPreferencesFormData>();
  const value = watch('audioSampleRate');

  const options = [
    { value: '16000', label: '16 kHz - Standard quality, faster processing' },
    { value: '44100', label: '44.1 kHz - High quality' },
    { value: '48000', label: '48 kHz - Professional quality' },
  ];

  return (
    <FormFieldWrapper
      name="audioSampleRate"
      label="Audio Sample Rate"
      description="Higher rates provide better quality but use more resources"
    >
      <Select value={value} onValueChange={(val: string) => setValue('audioSampleRate', val as any)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  );
}

function AudioGainField() {
  const { setValue, watch } = useFormContext<UserPreferencesFormData>();
  const value = watch('audioGainLevel');

  return (
    <FormFieldWrapper
      name="audioGainLevel"
      label="Audio Gain Level"
      description="Adjust microphone sensitivity (0-100%)"
    >
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => setValue('audioGainLevel', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>0%</span>
          <span className="font-medium">{value}%</span>
          <span>100%</span>
        </div>
      </div>
    </FormFieldWrapper>
  );
}

function DefaultSensitivityField() {
  const { setValue, watch } = useFormContext<UserPreferencesFormData>();
  const value = watch('defaultSensitivity');

  const options = [
    { value: 'low', label: 'Low - Fewer false positives' },
    { value: 'medium', label: 'Medium - Balanced detection' },
    { value: 'high', label: 'High - More comprehensive detection' },
  ];

  return (
    <FormFieldWrapper
      name="defaultSensitivity"
      label="Default Detection Sensitivity"
      description="Default sensitivity level for new sessions"
    >
      <Select value={value} onValueChange={(val: string) => setValue('defaultSensitivity', val as any)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  );
}

function ThemeSelectField() {
  const { setValue, watch } = useFormContext<UserPreferencesFormData>();
  const value = watch('theme');

  const options = [
    { value: 'light', label: 'Light theme' },
    { value: 'dark', label: 'Dark theme' },
    { value: 'system', label: 'Follow system theme' },
  ];

  return (
    <FormFieldWrapper
      name="theme"
      label="Theme"
      description="Choose your preferred appearance"
    >
      <Select value={value} onValueChange={(val: string) => setValue('theme', val as any)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  );
}

function LanguageSelectField() {
  const { setValue, watch } = useFormContext<UserPreferencesFormData>();
  const value = watch('language');

  const options = [
    { value: 'vi', label: '🇻🇳 Tiếng Việt' },
    { value: 'en', label: '🇺🇸 English' },
  ];

  return (
    <FormFieldWrapper
      name="language"
      label="Language"
      description="Interface language"
    >
      <Select value={value} onValueChange={(val: string) => setValue('language', val as any)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  );
}

function DataRetentionField() {
  const { setValue, watch } = useFormContext<UserPreferencesFormData>();
  const value = watch('dataRetentionDays');

  const options = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 365, label: '1 year' },
  ];

  return (
    <FormFieldWrapper
      name="dataRetentionDays"
      label="Data Retention Period"
      description="How long to keep session data and transcripts"
    >
      <Select 
        value={String(value)} 
        onValueChange={(val: string) => setValue('dataRetentionDays', parseInt(val))}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  );
}

// =============================================================================
// Contact Form
// =============================================================================

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
  onError?: (error: any) => void;
  loading?: boolean;
  className?: string;
}

export function ContactForm({
  onSubmit,
  onError,
  loading = false,
  className
}: ContactFormProps) {
  const defaultValues: Partial<ContactFormData> = {
    category: 'question',
  };

  return (
    <EnhancedForm
      schema={ContactFormSchema}
      onSubmit={onSubmit}
      onError={onError}
      defaultValues={defaultValues}
      resetOnSuccess={true}
      loading={loading}
      variant="card"
      size="md"
      className={className}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contact Information</h3>
          
          <TextField
            name="name"
            label="Your Name"
            placeholder="Enter your full name..."
            required
          />
          
          <TextField
            name="email"
            label="Email Address"
            type="email"
            placeholder="your.email@example.com"
            required
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Message Details</h3>
          
          <ContactCategoryField />
          
          <TextField
            name="subject"
            label="Subject"
            placeholder="Brief description of your inquiry..."
            required
          />
          
          <TextareaField
            name="message"
            label="Message"
            placeholder="Please provide details about your question or feedback..."
            description="The more details you provide, the better we can help you"
            rows={6}
            maxLength={1000}
            required
          />
        </div>
      </div>
    </EnhancedForm>
  );
}

function ContactCategoryField() {
  const { setValue, watch } = useFormContext<ContactFormData>();
  const value = watch('category');

  const options = [
    { value: 'question', label: 'General Question', description: 'Questions about features or usage' },
    { value: 'bug', label: 'Bug Report', description: 'Report a problem or error' },
    { value: 'feature', label: 'Feature Request', description: 'Suggest a new feature' },
    { value: 'other', label: 'Other', description: 'Something else' },
  ];

  return (
    <FormFieldWrapper
      name="category"
      label="Category"
      description="What type of inquiry is this?"
    >
      <Select value={value} onValueChange={(val: string) => setValue('category', val as any)}>
        <SelectTrigger>
          <SelectValue placeholder="Select category..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  );
}
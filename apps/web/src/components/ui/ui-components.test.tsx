/**
 * UI Component Tests - VN Speech Guardian
 * Comprehensive testing cho core UI components với accessibility và interaction patterns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Button,
  Input,
  Card, CardHeader, CardTitle, CardContent,
  Badge,
  Alert, AlertDescription,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui';

// =============================================================================
// Button Component Tests
// =============================================================================

describe('Button Component', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('applies variant classes correctly', () => {
    const variants = [
      { variant: 'default', expectedClass: 'bg-primary' },
      { variant: 'destructive', expectedClass: 'bg-destructive' },
      { variant: 'outline', expectedClass: 'border' },
      { variant: 'secondary', expectedClass: 'bg-secondary' },
      { variant: 'ghost', expectedClass: 'hover:bg-accent' },
      { variant: 'link', expectedClass: 'underline-offset-4' },
    ] as const;

    variants.forEach(({ variant, expectedClass }) => {
      const { unmount } = render(<Button variant={variant}>Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass(expectedClass);
      unmount();
    });
  });

  it('applies size classes correctly', () => {
    const sizes = [
      { size: 'default', expectedClass: 'h-9' },
      { size: 'sm', expectedClass: 'h-8' },
      { size: 'lg', expectedClass: 'h-10' },
      { size: 'icon', expectedClass: 'h-9', width: 'w-9' },
    ] as const;

    sizes.forEach(({ size, expectedClass, width }) => {
      const { unmount } = render(<Button size={size}>Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass(expectedClass);
      if (width) {
        expect(button).toHaveClass(width);
      }
      unmount();
    });
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
  });

  it('supports asChild functionality', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: 'Link Button' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('bg-primary');
  });

  it('has proper accessibility attributes', () => {
    render(<Button aria-label="Custom label">Icon Only</Button>);
    
    const button = screen.getByRole('button', { name: 'Custom label' });
    expect(button).toHaveAttribute('aria-label', 'Custom label');
  });
});

// =============================================================================
// Input Component Tests
// =============================================================================

describe('Input Component', () => {
  it('renders input with correct attributes', () => {
    render(
      <Input
        type="email"
        placeholder="Enter email"
        value=""
        onChange={() => {}}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
  });

  it('handles value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test');
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies focus styles on focus', async () => {
    const user = userEvent.setup();
    render(<Input />);
    
    const input = screen.getByRole('textbox');
    await user.click(input);
    
    expect(input).toHaveFocus();
    expect(input).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-1');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });
});

// =============================================================================
// Card Component Tests
// =============================================================================

describe('Card Components', () => {
  it('renders Card with children', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Test content</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle data-testid="title">Title</CardTitle>
        </CardHeader>
        <CardContent data-testid="content">Content</CardContent>
      </Card>
    );

    expect(screen.getByTestId('card')).toHaveClass('rounded-lg', 'border', 'bg-card');
    expect(screen.getByTestId('header')).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    expect(screen.getByTestId('title')).toHaveClass('font-semibold', 'leading-none');
    expect(screen.getByTestId('content')).toHaveClass('p-6', 'pt-0');
  });

  it('supports custom className', () => {
    render(
      <Card className="custom-card" data-testid="card">
        <CardContent className="custom-content" data-testid="content">
          Content
        </CardContent>
      </Card>
    );

    expect(screen.getByTestId('card')).toHaveClass('custom-card');
    expect(screen.getByTestId('content')).toHaveClass('custom-content');
  });
});

// =============================================================================
// Badge Component Tests
// =============================================================================

describe('Badge Component', () => {
  it('renders with default variant', () => {
    render(<Badge>Default Badge</Badge>);
    
    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('applies variant classes correctly', () => {
    const variants = [
      { variant: 'default', expectedClass: 'bg-primary' },
      { variant: 'secondary', expectedClass: 'bg-secondary' },
      { variant: 'destructive', expectedClass: 'bg-destructive' },
      { variant: 'outline', expectedClass: 'text-foreground' },
    ] as const;

    variants.forEach(({ variant, expectedClass }) => {
      const { unmount } = render(<Badge variant={variant}>Test</Badge>);
      const badge = screen.getByText('Test');
      expect(badge).toHaveClass(expectedClass);
      unmount();
    });
  });

  it('supports custom className', () => {
    render(<Badge className="custom-badge">Test</Badge>);
    
    const badge = screen.getByText('Test');
    expect(badge).toHaveClass('custom-badge');
  });
});

// =============================================================================
// Alert Component Tests
// =============================================================================

describe('Alert Component', () => {
  it('renders alert with description', () => {
    render(
      <Alert>
        <AlertDescription>This is an alert message</AlertDescription>
      </Alert>
    );

    expect(screen.getByText('This is an alert message')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const variants = [
      { variant: 'default', expectedClass: 'bg-background' },
      { variant: 'destructive', expectedClass: 'border-destructive/50' },
    ] as const;

    variants.forEach(({ variant, expectedClass }) => {
      const { unmount } = render(
        <Alert variant={variant} data-testid="alert">
          <AlertDescription>Test</AlertDescription>
        </Alert>
      );
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass(expectedClass);
      unmount();
    });
  });

  it('has proper ARIA role', () => {
    render(
      <Alert data-testid="alert">
        <AlertDescription>Alert content</AlertDescription>
      </Alert>
    );

    const alert = screen.getByTestId('alert');
    expect(alert).toHaveAttribute('role', 'alert');
  });
});

// =============================================================================
// Table Component Tests
// =============================================================================

describe('Table Components', () => {
  it('renders complete table structure', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John</TableCell>
            <TableCell>30</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('applies correct semantic roles', () => {
    render(
      <Table data-testid="table">
        <TableHeader data-testid="header">
          <TableRow data-testid="header-row">
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody data-testid="body">
          <TableRow data-testid="body-row">
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByTestId('table')).toHaveClass('w-full', 'caption-bottom');
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });

  it('supports hover effects on rows', () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-testid="row">
            <TableCell>Hoverable</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const row = screen.getByTestId('row');
    expect(row).toHaveClass('hover:bg-muted/50');
  });
});

// =============================================================================
// Dialog Component Tests
// =============================================================================

describe('Dialog Component', () => {
  it('opens and closes dialog', async () => {
    const user = userEvent.setup();
    
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
          <p>Dialog content</p>
        </DialogContent>
      </Dialog>
    );

    // Dialog should not be visible initially
    expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();

    // Open dialog
    const trigger = screen.getByRole('button', { name: 'Open Dialog' });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
      expect(screen.getByText('Dialog content')).toBeInTheDocument();
    });

    // Close dialog with Escape key
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    const user = userEvent.setup();
    
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle>Accessible Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      const dialog = screen.getByTestId('dialog-content');
      expect(dialog).toHaveAttribute('role', 'dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  it('traps focus within dialog', async () => {
    const user = userEvent.setup();
    
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Focus Trap Test</DialogTitle>
          </DialogHeader>
          <Button>First Button</Button>
          <Button>Second Button</Button>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => {
      expect(screen.getByText('Focus Trap Test')).toBeInTheDocument();
    });

    // Focus should be trapped within dialog
    await user.tab();
    expect(screen.getByRole('button', { name: 'First Button' })).toHaveFocus();
    
    await user.tab();
    expect(screen.getByRole('button', { name: 'Second Button' })).toHaveFocus();
  });
});

// =============================================================================
// Tabs Component Tests
// =============================================================================

describe('Tabs Component', () => {
  it('renders tabs and switches content', async () => {
    const user = userEvent.setup();
    
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );

    // First tab should be active by default
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

    // Switch to second tab
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    await user.click(tab2);

    await waitFor(() => {
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });
  });

  it('has proper ARIA attributes', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="tab1" data-testid="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" data-testid="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" data-testid="content1">Content 1</TabsContent>
      </Tabs>
    );

    const tabList = screen.getByTestId('tabs-list');
    const tab1 = screen.getByTestId('tab1');
    const content1 = screen.getByTestId('content1');

    expect(tabList).toHaveAttribute('role', 'tablist');
    expect(tab1).toHaveAttribute('role', 'tab');
    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(content1).toHaveAttribute('role', 'tabpanel');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    );

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    tab1.focus();

    // Arrow right should move to next tab
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();

    // Arrow left should move to previous tab
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveFocus();
  });
});

// =============================================================================
// Select Component Tests
// =============================================================================

describe('Select Component', () => {
  it('renders select with options', async () => {
    const user = userEvent.setup();
    
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('Select option')).toBeInTheDocument();

    // Open select
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  it('selects option and updates value', async () => {
    const handleValueChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <Select onValueChange={handleValueChange}>
        <SelectTrigger data-testid="select-trigger">
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByTestId('select-trigger');
    await user.click(trigger);

    const option1 = screen.getByText('Option 1');
    await user.click(option1);

    expect(handleValueChange).toHaveBeenCalledWith('option1');
  });

  it('has proper accessibility attributes', async () => {
    const user = userEvent.setup();
    
    render(
      <Select>
        <SelectTrigger data-testid="trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent data-testid="content">
          <SelectItem value="test" data-testid="item">Test</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('role', 'combobox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const item = screen.getByTestId('item');
      expect(item).toHaveAttribute('role', 'option');
    });
  });

  it('closes on outside click', async () => {
    const user = userEvent.setup();
    
    render(
      <div>
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
        <div data-testid="outside">Outside</div>
      </div>
    );

    // Open select
    const trigger = screen.getByTestId('trigger');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    // Click outside
    const outside = screen.getByTestId('outside');
    await user.click(outside);

    await waitFor(() => {
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Component Integration', () => {
  it('combines multiple components correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <Card>
        <CardHeader>
          <CardTitle>User Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="default">Primary Action</Button>
            <Button variant="outline">Secondary Action</Button>
          </div>
          
          <Alert>
            <AlertDescription>
              This is an informational message.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <label htmlFor="test-input">Test Input</label>
            <Input id="test-input" placeholder="Enter text" />
          </div>
          
          <div className="flex gap-2">
            <Badge variant="default">Active</Badge>
            <Badge variant="secondary">Pending</Badge>
          </div>
        </CardContent>
      </Card>
    );

    // All components should render
    expect(screen.getByText('User Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Primary Action' })).toBeInTheDocument();
    expect(screen.getByText('This is an informational message.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Interactions should work
    const input = screen.getByPlaceholderText('Enter text');
    await user.type(input, 'test');
    expect(input).toHaveValue('test');

    const primaryButton = screen.getByRole('button', { name: 'Primary Action' });
    await user.click(primaryButton);
    // Button click should work without errors
  });
});
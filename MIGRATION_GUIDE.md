# CSS Migration Guide - Step by Step

## Quick Start: Migrating Your First Component

### Step 1: Convert CSS to CSS Module
```bash
# Rename your CSS file
mv ComponentName.css ComponentName.module.css
```

### Step 2: Update Component Import
```typescript
// Before
import './ComponentName.css';

// After  
import styles from './ComponentName.module.css';
```

### Step 3: Update Class Names in JSX
```typescript
// Before
<div className="modal-overlay">
  <div className="modal-content">
    <button className="btn-primary">Save</button>
  </div>
</div>

// After
<div className={styles.modalOverlay}>
  <div className={styles.modalContent}>
    <button className={styles.saveButton}>Save</button>
  </div>
</div>
```

### Step 4: Use Standardized Components
```css
/* In your ComponentName.module.css */
@import '../../styles/components/modals.module.css';
@import '../../styles/components/buttons.module.css';

.modalOverlay {
  composes: overlay from '../../styles/components/modals.module.css';
}

.saveButton {
  composes: button primary medium from '../../styles/components/buttons.module.css';
}
```

## Component-Specific Migration Examples

### Modal Components (ConfirmModal, ClientModal, etc.)

#### Before:
```css
/* ConfirmModal.css */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
}
```

#### After:
```css
/* ConfirmModal.module.css */
@import '../../styles/components/modals.module.css';

.overlay {
  composes: overlay from '../../styles/components/modals.module.css';
}
```

### Button Migration

#### Before:
```css
.btn-primary {
  background: #83cee4;
  color: #011926;
  padding: 10px 20px;
  border-radius: 8px;
}
```

#### After:
```css
.primaryButton {
  composes: button primary medium from '../../styles/components/buttons.module.css';
}
```

### Form Migration

#### Before:
```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
}
```

#### After:
```css
.formGroup {
  composes: formGroup from '../../styles/components/forms.module.css';
}

.input {
  composes: input medium from '../../styles/components/forms.module.css';
}
```

## Migration Checklist

### For Each Component:
- [ ] Backup original CSS file
- [ ] Rename to `.module.css`
- [ ] Update component import
- [ ] Convert class names to camelCase
- [ ] Replace hardcoded values with CSS variables
- [ ] Use `composes` for standardized components
- [ ] Update JSX class references
- [ ] Test component functionality
- [ ] Test dark mode
- [ ] Remove old CSS file

### Common Patterns:

#### Class Name Conversion:
```
modal-overlay → modalOverlay
btn-primary → primaryButton  
form-group → formGroup
nav-item → navItem
```

#### CSS Variable Usage:
```css
/* Before */
color: #64748b;
padding: 16px;
border-radius: 8px;

/* After */
color: var(--text-secondary);
padding: var(--space-4);
border-radius: var(--radius-md);
```

#### Compose Pattern:
```css
.button {
  composes: button from '../../styles/components/buttons.module.css';
  composes: primary from '../../styles/components/buttons.module.css';
  composes: medium from '../../styles/components/buttons.module.css';
}

/* Or shorthand */
.button {
  composes: button primary medium from '../../styles/components/buttons.module.css';
}
```

## Testing Your Migration

### Visual Testing:
1. Compare before/after screenshots
2. Test all component states (hover, active, disabled)
3. Verify dark mode functionality
4. Check responsive behavior

### Functional Testing:
1. Ensure all interactions work
2. Verify form submissions
3. Test modal open/close
4. Check button click handlers

## Troubleshooting

### Common Issues:

#### 1. Styles Not Applied
```typescript
// Wrong - missing styles object
<div className="modalOverlay">

// Correct
<div className={styles.modalOverlay}>
```

#### 2. CSS Variables Not Working
```css
/* Make sure to import tokens */
@import '../../styles/tokens/colors.css';

.button {
  background-color: var(--color-primary);
}
```

#### 3. Compose Not Working
```css
/* Wrong - missing 'from' keyword */
.button {
  composes: button primary;
}

/* Correct */
.button {
  composes: button primary from '../../styles/components/buttons.module.css';
}
```

## Next Steps

After migrating a component:
1. Update the migration tracking sheet
2. Create a PR for review
3. Test in staging environment
4. Document any component-specific patterns
5. Help team members with similar components

## Need Help?

- Check existing migrated components for examples
- Review the standardization plan
- Ask in team chat for guidance
- Refer to CSS Modules documentation
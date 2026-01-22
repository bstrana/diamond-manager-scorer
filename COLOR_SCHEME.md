# Baseball Scoreboard App - Color Scheme

This document outlines the complete color palette used in the Baseball Scoreboard application. Use these colors to create a matching Keycloak theme.

## Primary Brand Colors

### Yellow (Primary Accent)
- **Hex**: `#FCD34D` (Tailwind `yellow-300`)
- **RGB**: `rgb(252, 211, 77)`
- **Usage**: Primary brand color, headings, section titles, focus states, highlights
- **Keycloak Usage**: Primary button color, active links, brand elements

### Yellow (Secondary Accent)
- **Hex**: `#FBBF24` (Tailwind `yellow-400`)
- **RGB**: `rgb(251, 191, 36)`
- **Usage**: Hover states, secondary highlights
- **Keycloak Usage**: Hover states for primary buttons

### Yellow (Tertiary Accent)
- **Hex**: `#EAB308` (Tailwind `yellow-500`)
- **RGB**: `rgb(234, 179, 8)`
- **Usage**: Active states, borders, drag-and-drop indicators
- **Keycloak Usage**: Active form fields, selected items

## Background Colors

### Primary Background (Dark)
- **Hex**: `#111827` (Tailwind `gray-900`)
- **RGB**: `rgb(17, 24, 39)`
- **Usage**: Main application background
- **Keycloak Usage**: Main page background

### Secondary Background (Card/Modal)
- **Hex**: `#1F2937` (Tailwind `gray-800`)
- **RGB**: `rgb(31, 41, 55)`
- **Usage**: Cards, modals, sections, panels
- **Keycloak Usage**: Card backgrounds, modal backgrounds

### Tertiary Background (Input Fields)
- **Hex**: `#374151` (Tailwind `gray-700`)
- **RGB**: `rgb(55, 65, 81)`
- **Usage**: Input fields, table cells, nested containers
- **Keycloak Usage**: Input field backgrounds, dropdown backgrounds

### Lower Thirds Background (Default)
- **Hex/RGBA**: `rgba(0, 0, 0, 0.9)` (Black with 90% opacity)
- **RGB**: `rgb(0, 0, 0)` with 90% opacity
- **Usage**: Lower thirds overlay background (configurable)
- **Keycloak Usage**: Overlay backgrounds, tooltips

### Overlay Background
- **Hex/RGBA**: `rgba(0, 0, 0, 0.75)` (Black with 75% opacity)
- **RGB**: `rgb(0, 0, 0)` with 75% opacity
- **Usage**: Modal overlays, confirmation dialogs
- **Keycloak Usage**: Modal backdrops

## Text Colors

### Primary Text (White)
- **Hex**: `#FFFFFF`
- **RGB**: `rgb(255, 255, 255)`
- **Usage**: Primary text, headings, labels
- **Keycloak Usage**: Primary text color

### Secondary Text (Light Gray)
- **Hex**: `#D1D5DB` (Tailwind `gray-300`)
- **RGB**: `rgb(209, 213, 219)`
- **Usage**: Secondary text, labels, descriptions
- **Keycloak Usage**: Secondary text, helper text

### Tertiary Text (Medium Gray)
- **Hex**: `#9CA3AF` (Tailwind `gray-400`)
- **RGB**: `rgb(156, 163, 175)`
- **Usage**: Placeholder text, disabled text, hints
- **Keycloak Usage**: Placeholder text, disabled states

### Quaternary Text (Dark Gray)
- **Hex**: `#6B7280` (Tailwind `gray-500`)
- **RGB**: `rgb(107, 114, 128)`
- **Usage**: Very subtle text, inactive elements
- **Keycloak Usage**: Inactive labels, muted text

### Lower Thirds Text (Default)
- **Hex**: `#FFFFFF` (White)
- **RGB**: `rgb(255, 255, 255)`
- **Usage**: Lower thirds text (configurable)
- **Keycloak Usage**: Overlay text

## Border Colors

### Primary Border
- **Hex**: `#4B5563` (Tailwind `gray-600`)
- **RGB**: `rgb(75, 85, 99)`
- **Usage**: Default borders, dividers
- **Keycloak Usage**: Default borders, dividers

### Secondary Border
- **Hex**: `#374151` (Tailwind `gray-700`)
- **RGB**: `rgb(55, 65, 81)`
- **Usage**: Card borders, section dividers
- **Keycloak Usage**: Card borders, section dividers

### Accent Border (Yellow)
- **Hex**: `#EAB308` (Tailwind `yellow-500`)
- **RGB**: `rgb(234, 179, 8)`
- **Usage**: Focus states, active inputs, highlights
- **Keycloak Usage**: Focus borders, active form fields

## Status Colors

### Success/Positive (Green)
- **Hex**: `#16A34A` (Tailwind `green-600`)
- **RGB**: `rgb(22, 163, 74)`
- **Usage**: Success actions, increment buttons, positive indicators
- **Keycloak Usage**: Success messages, positive actions

### Success Hover
- **Hex**: `#15803D` (Tailwind `green-700`)
- **RGB**: `rgb(21, 128, 61)`
- **Usage**: Hover state for success buttons
- **Keycloak Usage**: Success button hover states

### Error/Danger (Red)
- **Hex**: `#DC2626` (Tailwind `red-600`)
- **RGB**: `rgb(220, 38, 38)`
- **Usage**: Error states, decrement buttons, delete actions, confirmations
- **Keycloak Usage**: Error messages, danger actions, delete buttons

### Error Hover
- **Hex**: `#B91C1C` (Tailwind `red-700`)
- **RGB**: `rgb(185, 28, 28)`
- **Usage**: Hover state for error buttons
- **Keycloak Usage**: Error button hover states

### Warning (Yellow/Orange)
- **Hex**: `#FBBF24` (Tailwind `yellow-400`)
- **RGB**: `rgb(251, 191, 36)`
- **Usage**: Warning messages, important notices
- **Keycloak Usage**: Warning messages

### Error Text (Red)
- **Hex**: `#F87171` (Tailwind `red-400`)
- **RGB**: `rgb(248, 113, 113)`
- **Usage**: Error text, validation messages
- **Keycloak Usage**: Error text, validation messages

## Special Purpose Colors

### Chroma Key Green (OBS)
- **Hex**: `#00B140`
- **RGB**: `rgb(0, 177, 64)`
- **Usage**: Green screen background for OBS chroma key
- **Keycloak Usage**: Not applicable (app-specific)

### Team Colors (Dynamic)
- **Default**: `#FFFFFF` (White)
- **Usage**: Team-specific colors (user-configurable per team)
- **Keycloak Usage**: Not applicable (app-specific)
- **Note**: Teams can have custom colors set during game setup

### Player Photo Background
- **Hex**: `#374151` (Tailwind `gray-700`)
- **RGB**: `rgb(55, 65, 81)`
- **Usage**: Background for player photo placeholders
- **Keycloak Usage**: Avatar backgrounds

## Opacity Variations

The app uses various opacity levels for text hierarchy:

- **100% (1.0)**: Primary text, main content
- **80% (0.8)**: Secondary text, labels
- **70% (0.7)**: Tertiary text, hints
- **50% (0.5)**: Disabled states, inactive elements
- **20-35% (0.2-0.35)**: Background highlights, hover states

## Color Usage by Component

### Header/Title
- **Background**: `gray-900` (Primary Background)
- **Text**: `yellow-300` (Primary Accent)
- **Subtitle**: `gray-400` (Tertiary Text)

### Buttons
- **Primary Action**: `green-600` / `green-700` (hover)
- **Danger Action**: `red-600` / `red-700` (hover)
- **Secondary**: `gray-600` / `gray-500` (hover)
- **Text**: `white`

### Input Fields
- **Background**: `gray-700` (Tertiary Background)
- **Border**: `gray-600` (Primary Border)
- **Focus Border**: `yellow-500` (Accent Border)
- **Text**: `white`
- **Placeholder**: `gray-500` (Quaternary Text)

### Cards/Modals
- **Background**: `gray-800` (Secondary Background)
- **Border**: `gray-700` (Secondary Border)
- **Text**: `white` / `gray-300` (Primary/Secondary Text)

### Tables
- **Header Background**: `gray-800` (Secondary Background)
- **Header Text**: `yellow-300` (Primary Accent)
- **Row Background**: `gray-700` (Tertiary Background)
- **Row Text**: `gray-300` (Secondary Text)
- **Hover**: `gray-600` with 50% opacity
- **Border**: `gray-600` (Primary Border)

### Lower Thirds Overlay
- **Background**: `rgba(0, 0, 0, 0.9)` (configurable)
- **Text**: `#FFFFFF` (configurable)
- **Border Top**: Team color (dynamic)
- **Photo Border**: Team color (dynamic)

## Keycloak Theme Mapping

For creating a Keycloak theme, map the colors as follows:

### Primary Theme Colors
```css
--pf-global--primary-color--100: #FCD34D; /* yellow-300 */
--pf-global--primary-color--200: #FBBF24; /* yellow-400 */
--pf-global--primary-color--300: #EAB308; /* yellow-500 */
```

### Background Colors
```css
--pf-global--BackgroundColor--100: #111827; /* gray-900 */
--pf-global--BackgroundColor--200: #1F2937; /* gray-800 */
--pf-global--BackgroundColor--300: #374151; /* gray-700 */
```

### Text Colors
```css
--pf-global--Color--100: #FFFFFF; /* white */
--pf-global--Color--200: #D1D5DB; /* gray-300 */
--pf-global--Color--300: #9CA3AF; /* gray-400 */
```

### Status Colors
```css
--pf-global--success-color--100: #16A34A; /* green-600 */
--pf-global--danger-color--100: #DC2626; /* red-600 */
--pf-global--warning-color--100: #FBBF24; /* yellow-400 */
```

### Border Colors
```css
--pf-global--BorderColor--100: #4B5563; /* gray-600 */
--pf-global--BorderColor--200: #374151; /* gray-700 */
--pf-global--active-color--100: #EAB308; /* yellow-500 */
```

## Tailwind CSS Color Classes Reference

The app uses Tailwind CSS color classes. Here's the mapping:

| Tailwind Class | Hex Code | Usage |
|---------------|----------|-------|
| `yellow-300` | `#FCD34D` | Primary accent, headings |
| `yellow-400` | `#FBBF24` | Secondary accent, hover |
| `yellow-500` | `#EAB308` | Active states, borders |
| `gray-300` | `#D1D5DB` | Secondary text |
| `gray-400` | `#9CA3AF` | Tertiary text, placeholders |
| `gray-500` | `#6B7280` | Quaternary text |
| `gray-600` | `#4B5563` | Borders, hover states |
| `gray-700` | `#374151` | Input backgrounds, cards |
| `gray-800` | `#1F2937` | Card backgrounds, sections |
| `gray-900` | `#111827` | Main background |
| `green-600` | `#16A34A` | Success, positive actions |
| `green-700` | `#15803D` | Success hover |
| `red-600` | `#DC2626` | Error, danger actions |
| `red-700` | `#B91C1C` | Error hover |
| `red-400` | `#F87171` | Error text |

## Accessibility Notes

- **Contrast Ratios**: All text colors meet WCAG AA standards against their backgrounds
- **Focus States**: Yellow accent (`#EAB308`) is used for focus indicators
- **Disabled States**: 50% opacity is applied to disabled elements
- **Error States**: Red is used consistently for errors and destructive actions

## Customization

Some colors are user-configurable:
- **Team Colors**: Set per team during game setup (default: `#FFFFFF`)
- **Lower Thirds Background**: Configurable in settings (default: `rgba(0, 0, 0, 0.9)`)
- **Lower Thirds Text**: Configurable in settings (default: `#FFFFFF`)

---

**Last Updated**: Based on app version with Keycloak integration and security improvements



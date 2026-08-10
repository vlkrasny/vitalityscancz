---
name: Botanical Heritage
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#414846'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#717976'
  outline-variant: '#c1c8c4'
  surface-tint: '#45655c'
  primary: '#001712'
  on-primary: '#ffffff'
  primary-container: '#0c2d26'
  on-primary-container: '#75968c'
  inverse-primary: '#abcec3'
  secondary: '#5f5e59'
  on-secondary: '#ffffff'
  secondary-container: '#e5e2db'
  on-secondary-container: '#65645f'
  tertiary: '#06170c'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a2c1f'
  on-tertiary-container: '#809483'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c7eadf'
  primary-fixed-dim: '#abcec3'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#2d4d45'
  secondary-fixed: '#e5e2db'
  secondary-fixed-dim: '#c9c6c0'
  on-secondary-fixed: '#1c1c18'
  on-secondary-fixed-variant: '#474742'
  tertiary-fixed: '#d3e8d5'
  tertiary-fixed-dim: '#b7ccb9'
  on-tertiary-fixed: '#0e1f13'
  on-tertiary-fixed-variant: '#394b3d'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: EB Garamond
    fontSize: 64px
    fontWeight: '500'
    lineHeight: 72px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 48px
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-md:
    fontFamily: EB Garamond
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
  body-lg:
    fontFamily: Libre Caslon Text
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Libre Caslon Text
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The brand personality is rooted in "Botanical Heritage"—a blend of premium luxury and organic wellness. It targets a discerning audience seeking tranquility, quality, and a connection to nature. The emotional response should be one of immediate calm, groundedness, and silent authority.

The design style is **Minimalist with Tactile accents**. It leverages expansive white space and high-end typography to create a sense of breathing room, while utilizing deep botanical tones to anchor the experience. The interface should feel like a high-end apothecary or a private wellness retreat: clean, intentional, and timeless.

## Colors

The palette is centered on the deep forest green (#0C2D26), which serves as the primary driver for call-to-actions, brand moments, and structural accents. This is paired with a secondary light parchment color (#F4F1EA) to provide a warmer, more sophisticated alternative to pure white, enhancing the "wellness" aesthetic.

- **Primary:** Deep Forest (#0C2D26) – used for primary buttons, active states, and headlines.
- **Secondary:** Parchment (#F4F1EA) – used for section backgrounds and surface containers.
- **Tertiary:** Sage (#4A5D4E) – used for subtle accents and secondary interactive elements.
- **Neutral:** Obsidian (#1A1A1A) – used for body text and high-contrast borders.

## Typography

This design system uses a dual-serif approach to maximize elegance. **EB Garamond** is reserved for large display and headline levels to convey heritage and sophistication. **Libre Caslon Text** is utilized for body copy because of its superior legibility at smaller sizes while maintaining a literary feel. 

To ensure the interface remains functional and modern, **Plus Jakarta Sans** is introduced as a utility font for labels, buttons, and micro-copy, providing a clean, optimistic contrast to the classic serifs. On mobile devices, headline sizes scale down to prevent excessive line-breaking.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model for desktop to maintain the "editorial" look of a premium magazine, while transitioning to a fluid model for mobile.

- **Grid:** 12-column grid on desktop, 4-column on mobile.
- **Rhythm:** An 8px base unit drives all padding and margins. 
- **Breathing Room:** Large margins (64px) on desktop are essential to the premium feel. Sections should be separated by significant vertical padding (80px to 120px) to prevent the UI from feeling cluttered.

## Elevation & Depth

Depth is achieved through **Tonal Layers** rather than shadows. In this design system, surfaces are distinguished by slight shifts in color (e.g., a Parchment surface sitting on a White background).

- **Flatness:** Avoid heavy drop shadows. If depth is required for a floating element (like a modal), use a very soft, highly diffused ambient shadow with a hint of forest green in the tint (#0C2D26 at 5% opacity).
- **Outlines:** Use low-contrast "Ghost Borders" in the primary green (at 10-15% opacity) to define cards and input fields. This maintains the minimalist aesthetic without sacrificing structure.

## Shapes

The shape language is **Soft**. UI elements utilize a 0.25rem (4px) base radius. This subtle rounding softens the clinical nature of a minimalist grid without becoming overly playful or "bubbly." It strikes a balance between the sharp lines of traditional luxury and the approachable nature of wellness products.

## Components

- **Buttons:** Primary buttons use the Deep Forest green fill with Parchment text. The shape is slightly rounded (4px). Secondary buttons are Ghost-style with a thin Forest Green border.
- **Input Fields:** Use a subtle Parchment background with a bottom-border only or a very light 4-sided border. Labels use the Plus Jakarta Sans utility font.
- **Cards:** Cards should be borderless with a subtle tonal shift in background color (Parchment) to distinguish them from the main canvas.
- **Chips/Badges:** Small, caps-case labels in Plus Jakarta Sans. Use a Sage background with Deep Forest text for a low-contrast, botanical look.
- **Lists:** Use elegant serifs for list items, separated by thin, low-opacity Forest Green horizontal rules (Hairlines).
- **Botanical Accents:** Use high-quality, desaturated botanical photography or thin line-art illustrations of flora to reinforce the wellness theme.
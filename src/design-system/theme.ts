/**
 * DESIGN SYSTEM & THEME
 * ====================
 * Centralized styling, colors, typography, and reusable component classes.
 * Single source of truth for brand consistency.
 */

// ============================================
// COLOR PALETTE
// ============================================

export const COLORS = {
  // Primary Brand
  gold: '#cfb991',
  goldLight: '#EEDC9A',
  goldDark: '#A67C52',

  // Neutrals
  black: '#000000',
  nearBlack: '#0a0a0a',
  darkGray: '#1a1c23',
  mediumGray: '#141414',
  lightGray: '#64748b',

  // Semantic
  white: '#ffffff',
  danger: '#8B0000',
  warning: '#B06F5C',
  success: '#738775',

  // Accent Palette
  soul: '#899ca1',
  family: '#a38699',
  care: '#738775',
  leisure: '#a89d95',
  urgent: '#B06F5C',
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const TYPOGRAPHY = {
  // Font Families
  serif: 'font-serif',
  mono: 'font-mono',
  sans: 'font-sans',

  // Font Weights
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  black: 'font-black',

  // Font Sizes
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',

  // Line Heights
  tight: 'leading-tight',
  normalHeight: 'leading-normal',
  relaxed: 'leading-relaxed',
  loose: 'leading-loose',
} as const;

// ============================================
// SPACING
// ============================================

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

// ============================================
// SHADOWS & ELEVATIONS
// ============================================

export const SHADOWS = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  goldGlow: 'shadow-[0_0_30px_rgba(207,185,145,0.1)]',
  goldGlowStrong: 'shadow-[0_0_30px_rgba(207,185,145,0.3)]',
  inset: 'shadow-[inset_0_0_100px_rgba(139,0,0,0.4)]',
} as const;

// ============================================
// Z-INDEX SCALE (Fixed)
// ============================================

export const Z_INDEX = {
  hidden: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  sidebar: 30,
  modal: 40,
  modalBackdrop: 35,
  tooltip: 50,
  notification: 60,
  alert: 100,
  protocolAlert: 200,
  debugConsole: 999,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const BORDER_RADIUS = {
  sm: 'rounded-sm',
  base: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const TRANSITIONS = {
  fast: 'transition-all duration-200',
  normal: 'transition-all duration-300',
  slow: 'transition-all duration-500',
  slower: 'transition-all duration-700',
} as const;

// ============================================
// REUSABLE COMPONENT STYLES
// ============================================

// Base button styles (defined first to avoid circular reference)
const buttonBase = `px-4 py-2 font-bold uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95`;

export const COMPONENT_STYLES = {
  // Button Styles
  buttonBase,
  buttonPrimary: `${buttonBase} bg-[#cfb991] hover:bg-[#EEDC9A] text-black shadow-lg shadow-[#cfb991]/10`,
  buttonSecondary: `${buttonBase} bg-white/10 border border-white/20 text-white hover:bg-white/20`,
  buttonGhost: `${buttonBase} text-white/60 hover:text-white hover:bg-white/10`,
  buttonDanger: `${buttonBase} bg-[#8B0000]/10 border border-[#8B0000]/30 text-[#8B0000] hover:bg-[#8B0000]/20`,

  // Input Styles
  inputBase: `w-full bg-black/40 border border-white/10 px-4 py-3 text-white placeholder:text-white/20 rounded-xl focus:outline-none focus:border-[#cfb991]/50 transition-all` as const,
  inputGold: `w-full bg-black/40 border border-[#cfb991]/20 px-4 py-3 text-[#cfb991] font-mono placeholder:text-white/10 rounded-xl focus:outline-none focus:border-[#cfb991]/60 transition-all` as const,

  // Card Styles
  cardBase: `bg-white/[0.02] border border-white/5 rounded-2xl p-6 transition-all` as const,
  cardGold: `bg-[#cfb991]/5 border border-[#cfb991]/20 rounded-2xl p-6 transition-all hover:bg-[#cfb991]/10` as const,
  cardDark: `bg-black/60 border border-white/5 rounded-3xl p-6 backdrop-blur-3xl` as const,

  // Section Styles
  sectionBase: `bg-black/60 backdrop-blur-2xl border border-[#cfb991]/10 rounded-3xl overflow-hidden shadow-2xl` as const,
  sectionDark: `bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl` as const,

  // Badge/Pill Styles
  badgeBase: `px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest` as const,
  badgeGold: `px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[#cfb991]/10 text-[#cfb991] border border-[#cfb991]/20` as const,
  badgeDanger: `px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[#8B0000]/10 text-[#8B0000] border border-[#8B0000]/20` as const,

  // Text Styles
  textCaption: `text-xs font-black uppercase tracking-widest text-white/40` as const,
  textSmall: `text-sm text-white/80` as const,
  textBody: `text-base text-white leading-relaxed` as const,
  textHeading: `text-2xl font-serif italic text-white tracking-wide` as const,
} as const;

// ============================================
// LAYOUT UTILITIES
// ============================================

export const LAYOUTS = {
  // Flexbox
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexStart: 'flex items-start justify-start',
  flexCol: 'flex flex-col',
  flexColCenter: 'flex flex-col items-center justify-center',

  // Grid
  gridAuto: 'grid auto-cols-fr gap-4',
  grid2: 'grid grid-cols-2 gap-4',
  grid3: 'grid grid-cols-3 gap-4',
  grid4: 'grid grid-cols-4 gap-4',

  // Container
  containerBase: 'w-full max-w-[1600px] mx-auto px-4 sm:px-6',
  containerPadded: 'w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 md:py-12',
} as const;

// ============================================
// BACKDROP & OVERLAY UTILITIES
// ============================================

export const BACKDROPS = {
  glass: 'backdrop-blur-xl bg-black/40',
  darkGlass: 'backdrop-blur-3xl bg-black/60',
  goldGlass: 'backdrop-blur-md bg-[#cfb991]/5',
} as const;

// ============================================
// ANIMATION UTILITIES
// ============================================

export const ANIMATIONS = {
  pulse: 'animate-pulse',
  ping: 'animate-ping',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
} as const;

// ============================================
// RESPONSIVE BREAKPOINTS
// ============================================

export const BREAKPOINTS = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// THEME PROVIDER (CSS Variables)
// ============================================

export const themeStyles = `
  :root {
    --color-gold: ${COLORS.gold};
    --color-gold-light: ${COLORS.goldLight};
    --color-danger: ${COLORS.danger};
    --color-success: ${COLORS.success};
    
    --z-modal: ${Z_INDEX.modal};
    --z-alert: ${Z_INDEX.alert};
    --z-protocol-alert: ${Z_INDEX.protocolAlert};
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
      'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  }

  body {
    background-color: ${COLORS.black};
    color: ${COLORS.white};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Serif Font (Headings) */
  .font-serif {
    font-family: 'Georgia', 'Garamond', serif;
  }

  /* Monospace Font (Code) */
  .font-mono {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  /* Custom Scrollbar */
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Selection */
  ::selection {
    background-color: rgba(207, 185, 145, 0.3);
    color: ${COLORS.white};
  }

  /* Focus Ring */
  :focus-visible {
    outline: 2px solid ${COLORS.gold};
    outline-offset: 2px;
  }
`;

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getZIndex(level: keyof typeof Z_INDEX): number {
  return Z_INDEX[level];
}

export function getCategoryColor(categoryId: string): string {
  const colorMap: Record<string, string> = {
    focus: COLORS.gold,
    prayer: COLORS.soul,
    family: COLORS.family,
    care: COLORS.care,
    leisure: COLORS.leisure,
    waste: COLORS.danger,
    urgent: COLORS.warning,
  };
  return colorMap[categoryId] || COLORS.lightGray;
}

export function getZIndexStyle(level: keyof typeof Z_INDEX): React.CSSProperties {
  return { zIndex: Z_INDEX[level] };
}

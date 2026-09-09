import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const AppPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      dark: {
        // Nötr gri-siyah tonlar. Aura'nın varsayılanında mavi katkısı var,
        // bu değerlerde hiç yok.
        surface: {
          0:   '#ffffff',
          50:  '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#2e2e2e',   // kenarlıklar
          800: '#1f1f1f',   // kartlar
          900: '#141414',   // navbar ve sidebar
          950: '#0a0a0a'    // sayfa arka planı
        },
        text: {
          color: '#f5f5f5',            // normal yazı — neredeyse beyaz
          hoverColor: '#ffffff',
          mutedColor: '#a3a3a3',       // ikincil yazı (breadcrumb, etiketler)
          hoverMutedColor: '#d4d4d4'
        }
      }
    }
  }
});
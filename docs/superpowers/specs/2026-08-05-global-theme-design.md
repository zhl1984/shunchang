# Global Theme Design

## Architecture

Pinia continues to own the persisted theme preference and the derived `isDark` state. The root Ant Design Vue `ConfigProvider` selects `defaultAlgorithm` or `darkAlgorithm`, while the document root selects `theme-light` or `theme-dark` for business CSS variables.

## Styling Contract

Ant Design component styling uses its theme algorithm. `src/styles/theme.css` declares explicit light and dark values for the commonly used brand, status, text, background, border, fill, and control-state colors with a stable `--dm-*` prefix. Feature-specific visual treatments remain local to their components.

## Theme Consumers

The main layout menu selects its Ant Design `light` or `dark` appearance from the resolved theme. Business styles consume the `--dm-*` variables selected by the document root class and do not depend on Ant Design's component-scoped CSS variables.

## Error And Compatibility Boundaries

Theme switching has no network dependency. The existing `light | dark | system` persistence contract remains unchanged, and no new dependency is introduced.

## Verification

Run the repository's format check, ESLint, TypeScript check, and production build. Verify both algorithms type-check through the existing Ant Design Vue version.

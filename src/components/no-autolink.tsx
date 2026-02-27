/**
 * <NoAutoLink> – MDX escape hatch component.
 *
 * Authors can wrap content sections with <NoAutoLink>...</NoAutoLink>
 * to prevent the autolink engine from injecting entity links in that area.
 *
 * The autolink engine detects these tags in the MDX source and skips
 * all lines between them. At render time, this component simply passes
 * through its children without any wrapper element.
 */

export function NoAutoLink({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
